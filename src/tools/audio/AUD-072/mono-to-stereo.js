/**
 * AUD-072: Mono to Stereo Converter
 * Converts mono audio to stereo with various expansion effects
 */

const i18n = {
  'zh-TW': {
    toolName: '單聲道轉立體聲',
    toolDesc: '將單聲道音訊轉換為立體聲，支援多種擴展效果',
    uploadText: '拖放單聲道音訊檔案到此處',
    uploadHint: '支援 MP3, WAV, OGG, FLAC 格式',
    fileName: '檔案名稱',
    fileSize: '檔案大小',
    channels: '聲道數',
    duration: '時長',
    settings: '轉換設定',
    stereoMode: '立體聲模式',
    duplicate: '複製到雙聲道',
    widening: '立體聲擴展',
    delay: '延遲效果',
    chorus: '合唱效果',
    stereoWidth: '立體聲寬度',
    outputFormat: '輸出格式',
    process: '開始轉換',
    download: '下載結果',
    reset: '重置',
    processComplete: '轉換完成',
    originalChannels: '原始聲道',
    newChannels: '新聲道',
    modeUsed: '使用模式',
    processTime: '處理時間',
    footer: '所有處理均在本地完成，檔案不會上傳至伺服器',
    mono: '單聲道',
    stereo: '立體聲'
  },
  'en': {
    toolName: 'Mono to Stereo',
    toolDesc: 'Convert mono audio to stereo with various expansion effects',
    uploadText: 'Drop mono audio file here',
    uploadHint: 'Supports MP3, WAV, OGG, FLAC formats',
    fileName: 'File Name',
    fileSize: 'File Size',
    channels: 'Channels',
    duration: 'Duration',
    settings: 'Conversion Settings',
    stereoMode: 'Stereo Mode',
    duplicate: 'Duplicate to Both',
    widening: 'Stereo Widening',
    delay: 'Delay Effect',
    chorus: 'Chorus Effect',
    stereoWidth: 'Stereo Width',
    outputFormat: 'Output Format',
    process: 'Convert',
    download: 'Download',
    reset: 'Reset',
    processComplete: 'Conversion Complete',
    originalChannels: 'Original Channels',
    newChannels: 'New Channels',
    modeUsed: 'Mode Used',
    processTime: 'Process Time',
    footer: 'All processing is done locally',
    mono: 'Mono',
    stereo: 'Stereo'
  },
  'ja': {
    toolName: 'モノラルからステレオ',
    toolDesc: 'モノラルオーディオをステレオに変換',
    uploadText: 'モノラルオーディオファイルをここにドロップ',
    uploadHint: 'MP3, WAV, OGG, FLAC形式に対応',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    channels: 'チャンネル',
    duration: '長さ',
    settings: '変換設定',
    stereoMode: 'ステレオモード',
    duplicate: '両チャンネルに複製',
    widening: 'ステレオ拡張',
    delay: 'ディレイ効果',
    chorus: 'コーラス効果',
    stereoWidth: 'ステレオ幅',
    outputFormat: '出力形式',
    process: '変換開始',
    download: 'ダウンロード',
    reset: 'リセット',
    processComplete: '変換完了',
    originalChannels: '元のチャンネル',
    newChannels: '新しいチャンネル',
    modeUsed: '使用モード',
    processTime: '処理時間',
    footer: 'すべての処理はローカルで行われます',
    mono: 'モノラル',
    stereo: 'ステレオ'
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
const channels = document.getElementById('channels');
const duration = document.getElementById('duration');
const stereoMode = document.getElementById('stereoMode');
const stereoWidth = document.getElementById('stereoWidth');
const widthValue = document.getElementById('widthValue');
const outputFormat = document.getElementById('outputFormat');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalChannels = document.getElementById('originalChannels');
const newChannels = document.getElementById('newChannels');
const modeUsed = document.getElementById('modeUsed');
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
stereoWidth.addEventListener('input', () => {
  widthValue.textContent = stereoWidth.value + '%';
});
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

    channels.textContent = audioBuffer.numberOfChannels === 1 ? i18n[currentLang].mono : i18n[currentLang].stereo;
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

async function processAudio() {
  if (!audioBuffer) return;

  const mode = stereoMode.value;
  const width = stereoWidth.value / 100;
  const format = outputFormat.value;

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '處理中...');

  const startTime = performance.now();

  try {
    updateProgress(30, '轉換聲道...');

    const ctx = getAudioContext();
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    const stereoBuffer = ctx.createBuffer(2, length, sampleRate);
    const leftData = stereoBuffer.getChannelData(0);
    const rightData = stereoBuffer.getChannelData(1);

    // Get source data (handle both mono and stereo input)
    const srcData = audioBuffer.getChannelData(0);
    const srcRight = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : srcData;

    switch (mode) {
      case 'duplicate':
        for (let i = 0; i < length; i++) {
          leftData[i] = srcData[i];
          rightData[i] = srcData[i];
        }
        break;

      case 'widening':
        // Apply stereo widening using Haas effect
        const delaySamples = Math.floor(sampleRate * 0.02 * width); // Max 20ms delay
        for (let i = 0; i < length; i++) {
          leftData[i] = srcData[i];
          const delayIdx = i - delaySamples;
          rightData[i] = delayIdx >= 0 ? srcData[delayIdx] * 0.9 : srcData[i];
        }
        break;

      case 'delay':
        // Simple stereo delay
        const delayTime = Math.floor(sampleRate * 0.03 * width); // Max 30ms
        for (let i = 0; i < length; i++) {
          leftData[i] = srcData[i];
          const idx = i - delayTime;
          rightData[i] = idx >= 0 ? srcData[idx] : 0;
        }
        break;

      case 'chorus':
        // Simple chorus effect
        const modDepth = Math.floor(sampleRate * 0.005 * width);
        const modRate = 0.5;
        for (let i = 0; i < length; i++) {
          leftData[i] = srcData[i];
          const modulation = Math.sin(2 * Math.PI * modRate * i / sampleRate);
          const offset = Math.floor(modDepth * modulation);
          const idx = Math.max(0, Math.min(length - 1, i + offset));
          rightData[i] = srcData[idx] * 0.7 + srcData[i] * 0.3;
        }
        break;
    }

    updateProgress(70, '編碼輸出...');

    processedBlob = audioBufferToWav(stereoBuffer);

    updateProgress(100, '完成！');

    const endTime = performance.now();

    originalChannels.textContent = audioBuffer.numberOfChannels === 1 ? i18n[currentLang].mono : i18n[currentLang].stereo;
    newChannels.textContent = i18n[currentLang].stereo;
    modeUsed.textContent = i18n[currentLang][mode];
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

function downloadResult() {
  if (!processedBlob) return;

  const format = outputFormat.value;
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_stereo.${format}`;
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
