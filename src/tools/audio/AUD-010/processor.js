/**
 * AUD-010 Volume Adjustment Tool
 * Adjusts audio volume with gain control and normalization
 * Uses Web Audio API for processing and lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const sourceFormat = document.getElementById('sourceFormat');
const duration = document.getElementById('duration');
const waveformContainer = document.getElementById('waveformContainer');
const waveformCanvas = document.getElementById('waveform');
const volumeGain = document.getElementById('volumeGain');
const gainValue = document.getElementById('gainValue');
const normalize = document.getElementById('normalize');
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
const originalSize = document.getElementById('originalSize');
const outputSize = document.getElementById('outputSize');
const volumeChange = document.getElementById('volumeChange');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let currentFile = null;
let audioBuffer = null;
let processedBuffer = null;
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
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFormatName(ext) {
  const formats = {
    'wav': 'WAV',
    'mp3': 'MP3',
    'ogg': 'OGG',
    'flac': 'FLAC',
    'wave': 'WAV'
  };
  return formats[ext] || ext.toUpperCase();
}

// Decode audio file using Web Audio API
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Draw waveform
function drawWaveform(buffer) {
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformCanvas.width = waveformCanvas.offsetWidth * 2;
  const height = waveformCanvas.height = waveformCanvas.offsetHeight * 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);

  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const datum = data[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }

    ctx.moveTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }

  ctx.stroke();
}

// Apply volume gain to audio buffer
function applyVolumeGain(buffer, gainDb, normalizeMode) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  // Create new buffer
  const newBuffer = ctx.createBuffer(numChannels, length, sampleRate);

  // Copy and process each channel
  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = newBuffer.getChannelData(ch);

    // Copy data
    for (let i = 0; i < length; i++) {
      outputData[i] = inputData[i];
    }
  }

  // Calculate normalization factor if needed
  let normalizeFactor = 1.0;

  if (normalizeMode !== 'none') {
    let maxPeak = 0;
    let rmsSum = 0;
    let sampleCount = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const data = newBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
        rmsSum += data[i] * data[i];
        sampleCount++;
      }
    }

    if (normalizeMode === 'peak' && maxPeak > 0) {
      normalizeFactor = 0.95 / maxPeak; // Target 95% of max
    } else if (normalizeMode === 'rms') {
      const rms = Math.sqrt(rmsSum / sampleCount);
      const targetRms = 0.2; // Target RMS level
      if (rms > 0) {
        normalizeFactor = targetRms / rms;
        // Limit to prevent clipping
        if (normalizeFactor * maxPeak > 0.95) {
          normalizeFactor = 0.95 / maxPeak;
        }
      }
    }
  }

  // Apply gain
  const linearGain = Math.pow(10, gainDb / 20) * normalizeFactor;

  for (let ch = 0; ch < numChannels; ch++) {
    const data = newBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i] * linearGain));
    }
  }

  return newBuffer;
}

// Convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
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

// Convert AudioBuffer to MP3 using lamejs
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

  currentFile = file;

  const ext = getFileExtension(file.name);
  fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
  fileSize.textContent = formatFileSize(file.size);
  sourceFormat.textContent = getFormatName(ext);

  try {
    updateProgress(0, '解碼音訊...');
    progressContainer.classList.add('show');

    audioBuffer = await decodeAudioFile(file);
    duration.textContent = formatDuration(audioBuffer.duration);

    // Draw waveform
    waveformContainer.classList.add('show');
    drawWaveform(audioBuffer);

    fileInfo.classList.add('show');
    processBtn.disabled = false;

    progressContainer.classList.remove('show');

    resultPanel.classList.remove('show');
    downloadBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    outputBlob = null;

  } catch (error) {
    alert('無法解碼音訊檔案：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Update UI based on output format
function updateOutputFormatUI() {
  const format = outputFormat.value;

  if (format === 'mp3') {
    bitrateRow.style.display = 'flex';
  } else {
    bitrateRow.style.display = 'none';
  }

  downloadLabel.textContent = `下載 ${format.toUpperCase()}`;
}

// Process audio
async function processAudio() {
  if (!audioBuffer) return;

  const gainDb = parseInt(volumeGain.value);
  const normalizeMode = normalize.value;
  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '調整音量...');
    processedBuffer = applyVolumeGain(audioBuffer, gainDb, normalizeMode);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    originalSize.textContent = formatFileSize(currentFile.size);
    outputSize.textContent = formatFileSize(outputBlob.size);

    let changeText = '';
    if (gainDb > 0) {
      changeText = `+${gainDb} dB`;
    } else if (gainDb < 0) {
      changeText = `${gainDb} dB`;
    } else {
      changeText = '0 dB';
    }
    if (normalizeMode !== 'none') {
      changeText += ` (${normalizeMode === 'peak' ? '峰值' : 'RMS'}標準化)`;
    }
    volumeChange.textContent = changeText;
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';

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
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_adjusted.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  currentFile = null;
  audioBuffer = null;
  processedBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  waveformContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  volumeGain.value = 0;
  gainValue.textContent = '0 dB';
  normalize.value = 'none';

  processBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
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
  const file = e.target.files[0];
  handleFile(file);
});

volumeGain.addEventListener('input', () => {
  const val = volumeGain.value;
  gainValue.textContent = (val > 0 ? '+' : '') + val + ' dB';
});

outputFormat.addEventListener('change', updateOutputFormatUI);

processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
