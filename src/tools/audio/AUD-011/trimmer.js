/**
 * AUD-011 Audio Trimmer Tool
 * Trims audio files to selected time range
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
const selectionOverlay = document.getElementById('selectionOverlay');
const startMarker = document.getElementById('startMarker');
const endMarker = document.getElementById('endMarker');
const selectionInfo = document.getElementById('selectionInfo');
const selectionRange = document.getElementById('selectionRange');
const startMin = document.getElementById('startMin');
const startSec = document.getElementById('startSec');
const endMin = document.getElementById('endMin');
const endSec = document.getElementById('endSec');
const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const trimBtn = document.getElementById('trimBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalDuration = document.getElementById('originalDuration');
const trimmedDuration = document.getElementById('trimmedDuration');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let currentFile = null;
let audioBuffer = null;
let trimmedBuffer = null;
let outputBlob = null;
let selectionStart = 0;
let selectionEnd = 0;
let isSelecting = false;

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
  return `${mins}:${secs.toString().padStart(4, '0')}`;
}

function formatDurationShort(seconds) {
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

// Draw waveform with selection
function drawWaveform(buffer) {
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformCanvas.width = waveformCanvas.offsetWidth * 2;
  const height = waveformCanvas.height = waveformCanvas.offsetHeight * 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);

  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.strokeStyle = '#22c55e';
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

  // Update markers
  endMarker.textContent = formatDurationShort(buffer.duration);
}

// Update selection overlay
function updateSelectionOverlay() {
  if (!audioBuffer) return;

  const canvasWidth = waveformCanvas.offsetWidth;
  const duration = audioBuffer.duration;

  const startPx = (selectionStart / duration) * canvasWidth;
  const endPx = (selectionEnd / duration) * canvasWidth;

  selectionOverlay.style.display = 'block';
  selectionOverlay.style.left = startPx + 'px';
  selectionOverlay.style.width = (endPx - startPx) + 'px';

  // Update selection info
  selectionInfo.classList.add('show');
  const trimDuration = selectionEnd - selectionStart;
  selectionRange.textContent = `${formatDuration(selectionStart)} - ${formatDuration(selectionEnd)} (${trimDuration.toFixed(1)} 秒)`;
}

// Update time inputs from selection
function updateTimeInputs() {
  const startMinutes = Math.floor(selectionStart / 60);
  const startSeconds = selectionStart % 60;
  const endMinutes = Math.floor(selectionEnd / 60);
  const endSeconds = selectionEnd % 60;

  startMin.value = startMinutes;
  startSec.value = startSeconds.toFixed(1);
  endMin.value = endMinutes;
  endSec.value = endSeconds.toFixed(1);
}

// Update selection from time inputs
function updateSelectionFromInputs() {
  if (!audioBuffer) return;

  const startTime = parseFloat(startMin.value || 0) * 60 + parseFloat(startSec.value || 0);
  const endTime = parseFloat(endMin.value || 0) * 60 + parseFloat(endSec.value || 0);

  selectionStart = Math.max(0, Math.min(startTime, audioBuffer.duration));
  selectionEnd = Math.max(selectionStart, Math.min(endTime, audioBuffer.duration));

  updateSelectionOverlay();
}

// Trim audio buffer
function trimAudioBuffer(buffer, startTime, endTime) {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;

  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const newLength = endSample - startSample;

  const newBuffer = ctx.createBuffer(numChannels, newLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const oldData = buffer.getChannelData(ch);
    const newData = newBuffer.getChannelData(ch);

    for (let i = 0; i < newLength; i++) {
      newData[i] = oldData[startSample + i];
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

    // Initialize selection
    selectionStart = 0;
    selectionEnd = audioBuffer.duration;
    updateTimeInputs();

    // Draw waveform
    waveformContainer.classList.add('show');
    drawWaveform(audioBuffer);
    updateSelectionOverlay();

    fileInfo.classList.add('show');
    trimBtn.disabled = false;

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

// Process trim
async function processTrim() {
  if (!audioBuffer) return;

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  if (selectionEnd <= selectionStart) {
    alert('請選擇有效的剪輯範圍');
    return;
  }

  progressContainer.classList.add('show');
  trimBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '剪輯音頻...');
    trimmedBuffer = trimAudioBuffer(audioBuffer, selectionStart, selectionEnd);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(trimmedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(trimmedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    originalDuration.textContent = formatDuration(audioBuffer.duration);
    trimmedDuration.textContent = formatDuration(trimmedBuffer.duration);
    outputSize.textContent = formatFileSize(outputBlob.size);
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

  trimBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_trimmed.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  currentFile = null;
  audioBuffer = null;
  trimmedBuffer = null;
  outputBlob = null;
  selectionStart = 0;
  selectionEnd = 0;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  waveformContainer.classList.remove('show');
  selectionInfo.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');
  selectionOverlay.style.display = 'none';

  startMin.value = 0;
  startSec.value = 0;
  endMin.value = 0;
  endSec.value = 0;

  trimBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

// Waveform selection handlers
waveformCanvas.addEventListener('mousedown', (e) => {
  if (!audioBuffer) return;

  isSelecting = true;
  const rect = waveformCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const ratio = x / rect.width;

  selectionStart = ratio * audioBuffer.duration;
  selectionEnd = selectionStart;
  updateTimeInputs();
  updateSelectionOverlay();
});

waveformCanvas.addEventListener('mousemove', (e) => {
  if (!isSelecting || !audioBuffer) return;

  const rect = waveformCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const ratio = x / rect.width;

  selectionEnd = ratio * audioBuffer.duration;

  if (selectionEnd < selectionStart) {
    const temp = selectionStart;
    selectionStart = selectionEnd;
    selectionEnd = temp;
  }

  updateTimeInputs();
  updateSelectionOverlay();
});

waveformCanvas.addEventListener('mouseup', () => {
  isSelecting = false;
});

waveformCanvas.addEventListener('mouseleave', () => {
  isSelecting = false;
});

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

// Time input listeners
[startMin, startSec, endMin, endSec].forEach(input => {
  input.addEventListener('change', updateSelectionFromInputs);
});

outputFormat.addEventListener('change', updateOutputFormatUI);

trimBtn.addEventListener('click', processTrim);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
