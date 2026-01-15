/**
 * AUD-073: Sample Rate Converter
 * Converts audio sample rate with various quality options
 */

const i18n = {
  'zh-TW': {
    toolName: '音訊取樣率轉換',
    toolDesc: '轉換音訊檔案的取樣率',
    uploadText: '拖放音訊檔案到此處',
    uploadHint: '支援 MP3, WAV, OGG, FLAC 格式',
    fileName: '檔案名稱',
    currentSampleRate: '目前取樣率',
    channels: '聲道數',
    duration: '時長',
    settings: '取樣率設定',
    targetSampleRate: '目標取樣率',
    quality: '重取樣品質',
    outputFormat: '輸出格式',
    process: '開始轉換',
    download: '下載結果',
    reset: '重置',
    processComplete: '轉換完成',
    originalRate: '原始取樣率',
    newRate: '新取樣率',
    fileSizeChange: '檔案大小變化',
    processTime: '處理時間',
    footer: '所有處理均在本地完成，檔案不會上傳至伺服器'
  },
  'en': {
    toolName: 'Sample Rate Converter',
    toolDesc: 'Convert audio sample rate',
    uploadText: 'Drop audio file here',
    uploadHint: 'Supports MP3, WAV, OGG, FLAC formats',
    fileName: 'File Name',
    currentSampleRate: 'Current Sample Rate',
    channels: 'Channels',
    duration: 'Duration',
    settings: 'Sample Rate Settings',
    targetSampleRate: 'Target Sample Rate',
    quality: 'Resample Quality',
    outputFormat: 'Output Format',
    process: 'Convert',
    download: 'Download',
    reset: 'Reset',
    processComplete: 'Conversion Complete',
    originalRate: 'Original Rate',
    newRate: 'New Rate',
    fileSizeChange: 'Size Change',
    processTime: 'Process Time',
    footer: 'All processing is done locally'
  },
  'ja': {
    toolName: 'サンプルレート変換',
    toolDesc: 'オーディオのサンプルレートを変換',
    uploadText: 'オーディオファイルをここにドロップ',
    uploadHint: 'MP3, WAV, OGG, FLAC形式に対応',
    fileName: 'ファイル名',
    currentSampleRate: '現在のサンプルレート',
    channels: 'チャンネル',
    duration: '長さ',
    settings: 'サンプルレート設定',
    targetSampleRate: '目標サンプルレート',
    quality: 'リサンプル品質',
    outputFormat: '出力形式',
    process: '変換開始',
    download: 'ダウンロード',
    reset: 'リセット',
    processComplete: '変換完了',
    originalRate: '元のレート',
    newRate: '新しいレート',
    fileSizeChange: 'サイズ変化',
    processTime: '処理時間',
    footer: 'すべての処理はローカルで行われます'
  }
};

let currentLang = 'zh-TW';
let audioContext = null;
let currentFile = null;
let audioBuffer = null;
let processedBlob = null;

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

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

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const currentSampleRate = document.getElementById('currentSampleRate');
const channels = document.getElementById('channels');
const duration = document.getElementById('duration');
const targetSampleRate = document.getElementById('targetSampleRate');
const quality = document.getElementById('quality');
const outputFormat = document.getElementById('outputFormat');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalRate = document.getElementById('originalRate');
const newRate = document.getElementById('newRate');
const fileSizeChange = document.getElementById('fileSizeChange');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadResult);
resetBtn.addEventListener('click', reset);

async function handleFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    alert('請選擇有效的音訊檔案');
    return;
  }

  currentFile = file;
  fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;

  try {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    currentSampleRate.textContent = audioBuffer.sampleRate.toLocaleString() + ' Hz';
    channels.textContent = audioBuffer.numberOfChannels;
    duration.textContent = formatDuration(audioBuffer.duration);

    fileInfo.classList.add('show');
    processBtn.disabled = false;
    resultPanel.classList.remove('show');
    downloadBtn.style.display = 'none';
    resetBtn.style.display = 'none';
  } catch (error) {
    alert('無法解碼音訊檔案：' + error.message);
  }
}

function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

// Linear interpolation resampling
function resample(inputData, inputRate, outputRate, qualityLevel) {
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const outputData = new Float32Array(outputLength);

  if (qualityLevel === 'low') {
    // Simple nearest neighbor
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      outputData[i] = inputData[srcIdx];
    }
  } else if (qualityLevel === 'medium') {
    // Linear interpolation
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i * ratio;
      const srcIdxFloor = Math.floor(srcIdx);
      const srcIdxCeil = Math.min(srcIdxFloor + 1, inputData.length - 1);
      const fraction = srcIdx - srcIdxFloor;
      outputData[i] = inputData[srcIdxFloor] * (1 - fraction) + inputData[srcIdxCeil] * fraction;
    }
  } else {
    // High quality - cubic interpolation
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i * ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;

      const p0 = inputData[Math.max(0, idx - 1)];
      const p1 = inputData[idx];
      const p2 = inputData[Math.min(inputData.length - 1, idx + 1)];
      const p3 = inputData[Math.min(inputData.length - 1, idx + 2)];

      outputData[i] = cubicInterpolate(p0, p1, p2, p3, frac);
    }
  }

  return outputData;
}

function cubicInterpolate(p0, p1, p2, p3, t) {
  const a0 = p3 - p2 - p0 + p1;
  const a1 = p0 - p1 - a0;
  const a2 = p2 - p0;
  const a3 = p1;
  return a0 * t * t * t + a1 * t * t + a2 * t + a3;
}

async function processAudio() {
  if (!audioBuffer) return;

  const targetRate = parseInt(targetSampleRate.value);
  const qualityLevel = quality.value;
  const format = outputFormat.value;

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '處理中...');

  const startTime = performance.now();

  try {
    updateProgress(20, '重新取樣...');

    const numChannels = audioBuffer.numberOfChannels;
    const inputRate = audioBuffer.sampleRate;
    const newLength = Math.floor(audioBuffer.length * targetRate / inputRate);

    // Create offline context with target sample rate
    const offlineCtx = new OfflineAudioContext(numChannels, newLength, targetRate);
    const newBuffer = offlineCtx.createBuffer(numChannels, newLength, targetRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = resample(inputData, inputRate, targetRate, qualityLevel);
      newBuffer.copyToChannel(outputData, ch);
    }

    updateProgress(70, '編碼輸出...');

    processedBlob = audioBufferToWav(newBuffer, targetRate);

    updateProgress(100, '完成！');

    const endTime = performance.now();

    originalRate.textContent = inputRate.toLocaleString() + ' Hz';
    newRate.textContent = targetRate.toLocaleString() + ' Hz';
    const sizeRatio = ((processedBlob.size / currentFile.size - 1) * 100).toFixed(1);
    fileSizeChange.textContent = (sizeRatio > 0 ? '+' : '') + sizeRatio + '%';
    processTime.textContent = ((endTime - startTime) / 1000).toFixed(2) + 's';

    audioPreview.src = URL.createObjectURL(processedBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';

    setTimeout(() => progressContainer.classList.remove('show'), 1000);
  } catch (error) {
    alert('處理失敗：' + error.message);
    progressContainer.classList.remove('show');
  }

  processBtn.disabled = false;
}

function audioBufferToWav(buffer, sampleRate) {
  const numChannels = buffer.numberOfChannels;
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

function downloadResult() {
  if (!processedBlob) return;

  const format = outputFormat.value;
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
  const rate = targetSampleRate.value;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_${rate}Hz.${format}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function reset() {
  currentFile = null;
  audioBuffer = null;
  processedBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';
  processBtn.disabled = true;

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

setLanguage('zh-TW');
