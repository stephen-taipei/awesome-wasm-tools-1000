/**
 * AUD-074: Bit Depth Converter
 * Converts audio bit depth with optional dithering
 */

const i18n = {
  'zh-TW': {
    toolName: '位元深度轉換',
    toolDesc: '轉換音訊檔案的位元深度',
    uploadText: '拖放音訊檔案到此處',
    uploadHint: '支援 MP3, WAV, OGG, FLAC 格式',
    fileName: '檔案名稱',
    fileSize: '檔案大小',
    sampleRate: '取樣率',
    duration: '時長',
    settings: '位元深度設定',
    targetBitDepth: '目標位元深度',
    dithering: '抖動處理',
    outputFormat: '輸出格式',
    process: '開始轉換',
    download: '下載結果',
    reset: '重置',
    processComplete: '轉換完成',
    originalBitDepth: '原始位元深度',
    newBitDepth: '新位元深度',
    fileSizeChange: '檔案大小變化',
    processTime: '處理時間',
    footer: '所有處理均在本地完成，檔案不會上傳至伺服器'
  },
  'en': {
    toolName: 'Bit Depth Converter',
    toolDesc: 'Convert audio bit depth',
    uploadText: 'Drop audio file here',
    uploadHint: 'Supports MP3, WAV, OGG, FLAC formats',
    fileName: 'File Name',
    fileSize: 'File Size',
    sampleRate: 'Sample Rate',
    duration: 'Duration',
    settings: 'Bit Depth Settings',
    targetBitDepth: 'Target Bit Depth',
    dithering: 'Dithering',
    outputFormat: 'Output Format',
    process: 'Convert',
    download: 'Download',
    reset: 'Reset',
    processComplete: 'Conversion Complete',
    originalBitDepth: 'Original Bit Depth',
    newBitDepth: 'New Bit Depth',
    fileSizeChange: 'Size Change',
    processTime: 'Process Time',
    footer: 'All processing is done locally'
  },
  'ja': {
    toolName: 'ビット深度変換',
    toolDesc: 'オーディオのビット深度を変換',
    uploadText: 'オーディオファイルをここにドロップ',
    uploadHint: 'MP3, WAV, OGG, FLAC形式に対応',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    sampleRate: 'サンプルレート',
    duration: '長さ',
    settings: 'ビット深度設定',
    targetBitDepth: '目標ビット深度',
    dithering: 'ディザリング',
    outputFormat: '出力形式',
    process: '変換開始',
    download: 'ダウンロード',
    reset: 'リセット',
    processComplete: '変換完了',
    originalBitDepth: '元のビット深度',
    newBitDepth: '新しいビット深度',
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
const fileSize = document.getElementById('fileSize');
const sampleRate = document.getElementById('sampleRate');
const duration = document.getElementById('duration');
const targetBitDepth = document.getElementById('targetBitDepth');
const dithering = document.getElementById('dithering');
const outputFormat = document.getElementById('outputFormat');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalBitDepth = document.getElementById('originalBitDepth');
const newBitDepth = document.getElementById('newBitDepth');
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
  fileSize.textContent = formatFileSize(file.size);

  try {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    sampleRate.textContent = audioBuffer.sampleRate.toLocaleString() + ' Hz';
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

function applyDither(sample, ditherType, bitDepth) {
  if (ditherType === 'none') return sample;

  const quantizationStep = 1 / Math.pow(2, bitDepth - 1);
  let noise;

  if (ditherType === 'rectangular') {
    noise = (Math.random() - 0.5) * quantizationStep;
  } else {
    // Triangular dither (TPDF)
    noise = (Math.random() + Math.random() - 1) * quantizationStep;
  }

  return sample + noise;
}

function quantize(sample, bitDepth) {
  const maxVal = Math.pow(2, bitDepth - 1) - 1;
  const scaled = sample * maxVal;
  const quantized = Math.round(scaled);
  return Math.max(-maxVal - 1, Math.min(maxVal, quantized)) / maxVal;
}

async function processAudio() {
  if (!audioBuffer) return;

  const targetBits = parseInt(targetBitDepth.value);
  const ditherType = dithering.value;

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '處理中...');

  const startTime = performance.now();

  try {
    updateProgress(30, '轉換位元深度...');

    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sr = audioBuffer.sampleRate;

    const newBuffer = ctx.createBuffer(numChannels, length, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        let sample = inputData[i];
        sample = applyDither(sample, ditherType, targetBits);
        outputData[i] = quantize(sample, targetBits);
      }
    }

    updateProgress(70, '編碼輸出...');

    processedBlob = audioBufferToWav(newBuffer, sr, targetBits);

    updateProgress(100, '完成！');

    const endTime = performance.now();

    originalBitDepth.textContent = '32-bit float';
    newBitDepth.textContent = targetBits + '-bit';
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

function audioBufferToWav(buffer, sampleRate, bitDepth) {
  const numChannels = buffer.numberOfChannels;
  const format = bitDepth === 32 ? 3 : 1; // 3 = IEEE float, 1 = PCM
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

      if (bitDepth === 8) {
        const int8 = Math.floor((sample + 1) * 127.5);
        view.setUint8(offset, int8);
        offset += 1;
      } else if (bitDepth === 16) {
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const int24 = Math.floor(sample * 0x7FFFFF);
        view.setUint8(offset, int24 & 0xFF);
        view.setUint8(offset + 1, (int24 >> 8) & 0xFF);
        view.setUint8(offset + 2, (int24 >> 16) & 0xFF);
        offset += 3;
      } else if (bitDepth === 32) {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function downloadResult() {
  if (!processedBlob) return;

  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
  const bits = targetBitDepth.value;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_${bits}bit.wav`;
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
