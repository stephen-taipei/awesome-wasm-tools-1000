/**
 * AUD-015 Audio Reverse Tool
 * Reverses audio playback from end to beginning
 * Uses Web Audio API for processing and lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');
const waveformContainer = document.getElementById('waveformContainer');
const originalWaveform = document.getElementById('originalWaveform');
const reversedWaveform = document.getElementById('reversedWaveform');
const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const resultDuration = document.getElementById('resultDuration');
const resultSampleRate = document.getElementById('resultSampleRate');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// State
let audioFile = null;
let audioBuffer = null;
let reversedBuffer = null;
let outputBlob = null;

// Audio context
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

// Decode audio file
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Draw waveform on canvas
function drawWaveform(buffer, canvas, color = 'rgba(139, 92, 246, 0.6)') {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;

  const midY = height / 2;

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx < data.length) {
        const val = data[idx];
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    const y1 = midY + min * midY * 0.9;
    const y2 = midY + max * midY * 0.9;

    ctx.fillRect(i, y1, 1, y2 - y1);
  }
}

// Reverse audio buffer
function reverseAudioBuffer(buffer) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const reversed = ctx.createBuffer(numChannels, length, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = reversed.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      outputData[i] = inputData[length - 1 - i];
    }
  }

  return reversed;
}

// Convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Convert AudioBuffer to MP3
function audioBufferToMp3(buffer, bitrateKbps) {
  return new Promise((resolve) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrateKbps);
    const mp3Data = [];

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

    const leftInt16 = new Int16Array(leftChannel.length);
    const rightInt16 = new Int16Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(leftChannel[i] * 32767)));
      rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(rightChannel[i] * 32767)));
    }

    const sampleBlockSize = 1152;
    const totalSamples = leftInt16.length;
    let samplesProcessed = 0;

    function processChunk() {
      const chunkSize = Math.min(sampleBlockSize * 50, totalSamples - samplesProcessed);

      for (let i = 0; i < chunkSize; i += sampleBlockSize) {
        const start = samplesProcessed + i;
        const end = Math.min(start + sampleBlockSize, totalSamples);

        const leftChunk = leftInt16.slice(start, end);
        const rightChunk = rightInt16.slice(start, end);

        let mp3buf;
        if (numChannels === 1) {
          mp3buf = mp3encoder.encodeBuffer(leftChunk);
        } else {
          mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        }

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      samplesProcessed += chunkSize;
      const progress = 50 + (samplesProcessed / totalSamples) * 50;
      updateProgress(progress, `編碼 MP3... ${Math.round(progress)}%`);

      if (samplesProcessed < totalSamples) {
        setTimeout(processChunk, 0);
      } else {
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of mp3Data) {
          result.set(buf, offset);
          offset += buf.length;
        }

        resolve(new Blob([result], { type: 'audio/mp3' }));
      }
    }

    processChunk();
  });
}

// Update progress
function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

// Handle file selection
async function handleFile(file) {
  if (!file) return;

  audioFile = file;
  progressContainer.classList.add('show');
  updateProgress(0, '載入音訊檔案...');

  try {
    updateProgress(30, '解碼音訊...');
    audioBuffer = await decodeAudioFile(file);

    updateProgress(100, '完成！');

    fileName.textContent = file.name;
    fileDuration.textContent = `時長：${formatDuration(audioBuffer.duration)}`;
    fileSampleRate.textContent = `取樣率：${audioBuffer.sampleRate} Hz`;
    fileChannels.textContent = `聲道：${audioBuffer.numberOfChannels === 1 ? '單聲道' : '立體聲'}`;

    fileInfo.classList.add('show');
    waveformContainer.classList.add('show');

    // Draw original waveform
    drawWaveform(audioBuffer, originalWaveform, 'rgba(139, 92, 246, 0.6)');

    // Create original preview URL
    originalPreview.src = URL.createObjectURL(file);

    processBtn.disabled = false;
    resetBtn.style.display = 'flex';

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 500);

  } catch (error) {
    alert('無法載入音訊：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Process audio (reverse)
async function processAudio() {
  if (!audioBuffer) return;

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '反轉音頻...');
    reversedBuffer = reverseAudioBuffer(audioBuffer);

    // Draw reversed waveform
    drawWaveform(reversedBuffer, reversedWaveform, 'rgba(16, 185, 129, 0.6)');

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(reversedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(reversedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultDuration.textContent = formatDuration(reversedBuffer.duration);
    resultSampleRate.textContent = reversedBuffer.sampleRate + ' Hz';
    outputSize.textContent = formatFileSize(outputBlob.size);
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    downloadLabel.textContent = `下載 ${format.toUpperCase()}`;

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 1000);

  } catch (error) {
    alert('處理失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  processBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;
  const baseName = audioFile.name.replace(/\.[^/.]+$/, '');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_reversed.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  audioFile = null;
  audioBuffer = null;
  reversedBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  waveformContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  processBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
  if (originalPreview.src) {
    URL.revokeObjectURL(originalPreview.src);
    originalPreview.src = '';
  }
}

// Update output format UI
function updateOutputFormatUI() {
  const format = outputFormat.value;
  bitrateRow.style.display = format === 'mp3' ? 'flex' : 'none';
}

// Event listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

outputFormat.addEventListener('change', updateOutputFormatUI);
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Handle window resize
window.addEventListener('resize', () => {
  if (audioBuffer) {
    drawWaveform(audioBuffer, originalWaveform, 'rgba(139, 92, 246, 0.6)');
  }
  if (reversedBuffer) {
    drawWaveform(reversedBuffer, reversedWaveform, 'rgba(16, 185, 129, 0.6)');
  }
});

// Initialize
updateOutputFormatUI();
