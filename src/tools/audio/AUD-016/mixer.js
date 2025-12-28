/**
 * AUD-016 Audio Mixing Tool
 * Mixes two audio tracks together with adjustable volumes
 * Uses Web Audio API for processing and lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const trackInfo1 = document.getElementById('trackInfo1');
const trackInfo2 = document.getElementById('trackInfo2');
const trackName1 = document.getElementById('trackName1');
const trackName2 = document.getElementById('trackName2');
const trackDuration1 = document.getElementById('trackDuration1');
const trackDuration2 = document.getElementById('trackDuration2');
const trackControls1 = document.getElementById('trackControls1');
const trackControls2 = document.getElementById('trackControls2');
const volume1 = document.getElementById('volume1');
const volume2 = document.getElementById('volume2');
const volume1Value = document.getElementById('volume1Value');
const volume2Value = document.getElementById('volume2Value');
const waveform1 = document.getElementById('waveform1');
const waveform2 = document.getElementById('waveform2');
const mixMode = document.getElementById('mixMode');
const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const mixBtn = document.getElementById('mixBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const resultDuration = document.getElementById('resultDuration');
const resultMode = document.getElementById('resultMode');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let audioFile1 = null;
let audioFile2 = null;
let audioBuffer1 = null;
let audioBuffer2 = null;
let mixedBuffer = null;
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
function drawWaveform(buffer, canvas, color = 'rgba(236, 72, 153, 0.6)') {
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

// Mix two audio buffers
function mixAudioBuffers(buffer1, buffer2, vol1, vol2, mode) {
  const ctx = getAudioContext();

  // Determine output properties
  const numChannels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);
  const sampleRate = buffer1.sampleRate;

  // Determine output length based on mode
  let outputLength;
  if (mode === 'loop') {
    outputLength = Math.max(buffer1.length, buffer2.length);
  } else {
    outputLength = Math.max(buffer1.length, buffer2.length);
  }

  const mixed = ctx.createBuffer(numChannels, outputLength, sampleRate);

  // Volume multipliers
  const gain1 = vol1 / 100;
  const gain2 = vol2 / 100;

  for (let ch = 0; ch < numChannels; ch++) {
    const outputData = mixed.getChannelData(ch);

    // Get source channel data (fallback to channel 0 if mono)
    const source1Data = buffer1.numberOfChannels > ch
      ? buffer1.getChannelData(ch)
      : buffer1.getChannelData(0);
    const source2Data = buffer2.numberOfChannels > ch
      ? buffer2.getChannelData(ch)
      : buffer2.getChannelData(0);

    for (let i = 0; i < outputLength; i++) {
      let sample1 = 0;
      let sample2 = 0;

      // Get sample from buffer 1
      if (i < buffer1.length) {
        sample1 = source1Data[i] * gain1;
      }

      // Get sample from buffer 2 (with optional looping)
      if (mode === 'loop') {
        const idx2 = i % buffer2.length;
        sample2 = source2Data[idx2] * gain2;
      } else {
        if (i < buffer2.length) {
          sample2 = source2Data[i] * gain2;
        }
      }

      // Mix samples (simple addition with clipping prevention)
      let mixedSample = sample1 + sample2;

      // Soft clipping to prevent harsh distortion
      if (mixedSample > 1) {
        mixedSample = 1 - Math.exp(-mixedSample + 1);
      } else if (mixedSample < -1) {
        mixedSample = -1 + Math.exp(mixedSample + 1);
      }

      outputData[i] = mixedSample;
    }
  }

  return mixed;
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

// Update mix button state
function updateMixButtonState() {
  mixBtn.disabled = !(audioBuffer1 && audioBuffer2);
  if (audioBuffer1 || audioBuffer2) {
    resetBtn.style.display = 'flex';
  }
}

// Handle file selection for track 1
async function handleFile1(file) {
  if (!file) return;

  audioFile1 = file;
  progressContainer.classList.add('show');
  updateProgress(0, '載入音軌 1...');

  try {
    updateProgress(50, '解碼音訊...');
    audioBuffer1 = await decodeAudioFile(file);

    updateProgress(100, '完成！');

    trackName1.textContent = file.name;
    trackDuration1.textContent = `時長：${formatDuration(audioBuffer1.duration)}`;

    uploadArea1.classList.add('loaded');
    trackInfo1.classList.add('show');
    trackControls1.classList.add('show');

    drawWaveform(audioBuffer1, waveform1);
    updateMixButtonState();

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 500);

  } catch (error) {
    alert('無法載入音軌 1：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Handle file selection for track 2
async function handleFile2(file) {
  if (!file) return;

  audioFile2 = file;
  progressContainer.classList.add('show');
  updateProgress(0, '載入音軌 2...');

  try {
    updateProgress(50, '解碼音訊...');
    audioBuffer2 = await decodeAudioFile(file);

    updateProgress(100, '完成！');

    trackName2.textContent = file.name;
    trackDuration2.textContent = `時長：${formatDuration(audioBuffer2.duration)}`;

    uploadArea2.classList.add('loaded');
    trackInfo2.classList.add('show');
    trackControls2.classList.add('show');

    drawWaveform(audioBuffer2, waveform2);
    updateMixButtonState();

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 500);

  } catch (error) {
    alert('無法載入音軌 2：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Mix audio tracks
async function mixAudio() {
  if (!audioBuffer1 || !audioBuffer2) return;

  const vol1 = parseInt(volume1.value);
  const vol2 = parseInt(volume2.value);
  const mode = mixMode.value;
  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  mixBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '混合音軌...');
    mixedBuffer = mixAudioBuffers(audioBuffer1, audioBuffer2, vol1, vol2, mode);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(mixedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(mixedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultDuration.textContent = formatDuration(mixedBuffer.duration);
    resultMode.textContent = mode === 'loop' ? '循環' : '疊加';
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
    alert('混音失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  mixBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mixed_audio.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  audioFile1 = null;
  audioFile2 = null;
  audioBuffer1 = null;
  audioBuffer2 = null;
  mixedBuffer = null;
  outputBlob = null;

  fileInput1.value = '';
  fileInput2.value = '';

  uploadArea1.classList.remove('loaded');
  uploadArea2.classList.remove('loaded');
  trackInfo1.classList.remove('show');
  trackInfo2.classList.remove('show');
  trackControls1.classList.remove('show');
  trackControls2.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  volume1.value = 100;
  volume2.value = 100;
  volume1Value.textContent = '100%';
  volume2Value.textContent = '100%';

  mixBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

// Update output format UI
function updateOutputFormatUI() {
  const format = outputFormat.value;
  bitrateRow.style.display = format === 'mp3' ? 'flex' : 'none';
}

// Setup upload area event listeners
function setupUploadArea(area, input, handler) {
  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragover');
  });

  area.addEventListener('dragleave', () => {
    area.classList.remove('dragover');
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handler(file);
  });

  input.addEventListener('change', (e) => {
    handler(e.target.files[0]);
  });
}

// Event listeners
setupUploadArea(uploadArea1, fileInput1, handleFile1);
setupUploadArea(uploadArea2, fileInput2, handleFile2);

volume1.addEventListener('input', () => {
  volume1Value.textContent = volume1.value + '%';
});

volume2.addEventListener('input', () => {
  volume2Value.textContent = volume2.value + '%';
});

outputFormat.addEventListener('change', updateOutputFormatUI);
mixBtn.addEventListener('click', mixAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Handle window resize
window.addEventListener('resize', () => {
  if (audioBuffer1) {
    drawWaveform(audioBuffer1, waveform1);
  }
  if (audioBuffer2) {
    drawWaveform(audioBuffer2, waveform2);
  }
});

// Initialize
updateOutputFormatUI();
