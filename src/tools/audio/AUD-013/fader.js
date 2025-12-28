/**
 * AUD-013 Audio Fade In/Out Tool
 * Adds fade in and fade out effects to audio files
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
const waveformCanvas = document.getElementById('waveformCanvas');
const fadeInOverlay = document.getElementById('fadeInOverlay');
const fadeOutOverlay = document.getElementById('fadeOutOverlay');
const fadeInDuration = document.getElementById('fadeInDuration');
const fadeInDurationNum = document.getElementById('fadeInDurationNum');
const fadeInCurve = document.getElementById('fadeInCurve');
const fadeOutDuration = document.getElementById('fadeOutDuration');
const fadeOutDurationNum = document.getElementById('fadeOutDurationNum');
const fadeOutCurve = document.getElementById('fadeOutCurve');
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
const resultFadeIn = document.getElementById('resultFadeIn');
const resultFadeOut = document.getElementById('resultFadeOut');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// State
let audioFile = null;
let audioBuffer = null;
let processedBuffer = null;
let outputBlob = null;
let selectedFadeInCurve = 'linear';
let selectedFadeOutCurve = 'linear';

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

// Draw waveform
function drawWaveform(buffer) {
  const canvas = waveformCanvas;
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
  ctx.fillStyle = 'rgba(245, 158, 11, 0.6)';

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

// Update fade overlay positions
function updateFadeOverlays() {
  if (!audioBuffer) return;

  const duration = audioBuffer.duration;
  const fadeIn = parseFloat(fadeInDuration.value);
  const fadeOut = parseFloat(fadeOutDuration.value);

  const fadeInPercent = (fadeIn / duration) * 100;
  const fadeOutPercent = (fadeOut / duration) * 100;

  fadeInOverlay.style.width = fadeInPercent + '%';
  fadeOutOverlay.style.width = fadeOutPercent + '%';
}

// Fade curve functions
function getFadeCurveValue(t, curveType, isFadeIn) {
  // t is 0 to 1, return multiplier 0 to 1
  switch (curveType) {
    case 'linear':
      return isFadeIn ? t : 1 - t;

    case 'exponential':
      if (isFadeIn) {
        return Math.pow(t, 3);
      } else {
        return Math.pow(1 - t, 3);
      }

    case 'logarithmic':
      if (isFadeIn) {
        return Math.log10(1 + t * 9) / Math.log10(10);
      } else {
        return Math.log10(1 + (1 - t) * 9) / Math.log10(10);
      }

    case 'scurve':
      // Smooth S-curve using sine function
      if (isFadeIn) {
        return (Math.sin((t - 0.5) * Math.PI) + 1) / 2;
      } else {
        return (Math.sin((0.5 - t) * Math.PI) + 1) / 2;
      }

    default:
      return isFadeIn ? t : 1 - t;
  }
}

// Apply fade effects to audio buffer
function applyFadeEffects(buffer, fadeInSec, fadeOutSec, fadeInCurveType, fadeOutCurveType) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const processed = ctx.createBuffer(numChannels, length, sampleRate);

  const fadeInSamples = Math.floor(fadeInSec * sampleRate);
  const fadeOutSamples = Math.floor(fadeOutSec * sampleRate);
  const fadeOutStart = length - fadeOutSamples;

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      let sample = inputData[i];

      // Apply fade in
      if (i < fadeInSamples && fadeInSamples > 0) {
        const t = i / fadeInSamples;
        const gain = getFadeCurveValue(t, fadeInCurveType, true);
        sample *= gain;
      }

      // Apply fade out
      if (i >= fadeOutStart && fadeOutSamples > 0) {
        const t = (i - fadeOutStart) / fadeOutSamples;
        const gain = getFadeCurveValue(t, fadeOutCurveType, false);
        sample *= gain;
      }

      outputData[i] = sample;
    }
  }

  return processed;
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

    drawWaveform(audioBuffer);
    updateFadeOverlays();

    // Set max fade duration based on audio length
    const maxFade = Math.min(audioBuffer.duration / 2, 30);
    fadeInDuration.max = maxFade;
    fadeOutDuration.max = maxFade;

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

// Process audio with fade effects
async function processAudio() {
  if (!audioBuffer) return;

  const fadeIn = parseFloat(fadeInDuration.value);
  const fadeOut = parseFloat(fadeOutDuration.value);
  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用淡入淡出效果...');

    processedBuffer = applyFadeEffects(
      audioBuffer,
      fadeIn,
      fadeOut,
      selectedFadeInCurve,
      selectedFadeOutCurve
    );

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultFadeIn.textContent = fadeIn + ' 秒';
    resultFadeOut.textContent = fadeOut + ' 秒';
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
  a.download = `${baseName}_faded.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  audioFile = null;
  audioBuffer = null;
  processedBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  waveformContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  processBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  fadeInDuration.value = 2;
  fadeInDurationNum.value = 2;
  fadeOutDuration.value = 2;
  fadeOutDurationNum.value = 2;

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

// Sync slider and number inputs
function syncInputs(slider, number) {
  slider.addEventListener('input', () => {
    number.value = slider.value;
    updateFadeOverlays();
  });

  number.addEventListener('input', () => {
    slider.value = number.value;
    updateFadeOverlays();
  });
}

// Setup curve buttons
function setupCurveButtons(container, callback) {
  const buttons = container.querySelectorAll('.curve-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.curve);
    });
  });
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

syncInputs(fadeInDuration, fadeInDurationNum);
syncInputs(fadeOutDuration, fadeOutDurationNum);

setupCurveButtons(fadeInCurve, (curve) => {
  selectedFadeInCurve = curve;
});

setupCurveButtons(fadeOutCurve, (curve) => {
  selectedFadeOutCurve = curve;
});

outputFormat.addEventListener('change', updateOutputFormatUI);
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Handle window resize
window.addEventListener('resize', () => {
  if (audioBuffer) {
    drawWaveform(audioBuffer);
    updateFadeOverlays();
  }
});

// Initialize
updateOutputFormatUI();
