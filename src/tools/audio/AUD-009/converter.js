/**
 * AUD-009 AMR Converter
 * Converts between AMR, WAV, and MP3 formats
 * Uses Web Audio API for decoding and lamejs for MP3 encoding
 * Note: AMR decoding depends on browser support (limited)
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const sourceFormat = document.getElementById('sourceFormat');
const duration = document.getElementById('duration');
const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalSize = document.getElementById('originalSize');
const outputSize = document.getElementById('outputSize');
const compressionRatio = document.getElementById('compressionRatio');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let currentFile = null;
let audioBuffer = null;
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
    'amr': 'AMR',
    'wav': 'WAV',
    'mp3': 'MP3',
    'wave': 'WAV'
  };
  return formats[ext] || ext.toUpperCase();
}

// Decode audio file using Web Audio API
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();

  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (error) {
    // AMR is not supported in most browsers
    if (getFileExtension(file.name) === 'amr') {
      throw new Error('您的瀏覽器不支援 AMR 解碼。AMR 格式支援有限，建議先使用其他工具轉換為 WAV/MP3。');
    }
    throw error;
  }
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
      const progress = (samplesProcessed / totalSamples) * 100;
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

  const ext = getFileExtension(file.name);
  if (!['amr', 'wav', 'wave', 'mp3'].includes(ext)) {
    alert('請選擇 AMR、WAV 或 MP3 格式的音訊檔案');
    return;
  }

  currentFile = file;

  fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
  fileSize.textContent = formatFileSize(file.size);
  sourceFormat.textContent = getFormatName(ext);

  try {
    updateProgress(0, '解碼音訊...');
    progressContainer.classList.add('show');

    audioBuffer = await decodeAudioFile(file);
    duration.textContent = formatDuration(audioBuffer.duration);

    // Set default output format
    outputFormat.value = 'mp3';

    updateOutputFormatUI();

    fileInfo.classList.add('show');
    convertBtn.disabled = false;

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

  if (format === 'wav') {
    bitrateRow.style.display = 'none';
  } else {
    bitrateRow.style.display = 'flex';
  }

  downloadLabel.textContent = `下載 ${format.toUpperCase()}`;
}

// Start conversion
async function startConversion() {
  if (!audioBuffer) return;

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  convertBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    if (format === 'wav') {
      updateProgress(50, '轉換為 WAV...');
      outputBlob = audioBufferToWav(audioBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(audioBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    originalSize.textContent = formatFileSize(currentFile.size);
    outputSize.textContent = formatFileSize(outputBlob.size);

    const ratio = ((1 - outputBlob.size / currentFile.size) * 100);
    compressionRatio.textContent = ratio > 0 ? ratio.toFixed(1) + '%' : '增加 ' + Math.abs(ratio).toFixed(1) + '%';
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 1000);

  } catch (error) {
    alert('轉換失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  convertBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  currentFile = null;
  audioBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  convertBtn.disabled = true;
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

outputFormat.addEventListener('change', updateOutputFormatUI);

convertBtn.addEventListener('click', startConversion);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
