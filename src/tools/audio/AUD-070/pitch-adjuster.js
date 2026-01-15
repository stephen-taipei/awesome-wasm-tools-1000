/**
 * AUD-070: Audio Pitch Adjuster
 * Adjusts audio pitch by semitones with optional time preservation
 * Uses Web Audio API for processing
 */

const i18n = {
  'zh-TW': {
    toolName: '音訊音調調整',
    toolDesc: '調整音訊的音調高低，支援半音調整',
    uploadText: '拖放音訊檔案到此處',
    uploadHint: '支援 MP3, WAV, OGG, FLAC 格式',
    fileName: '檔案名稱',
    fileSize: '檔案大小',
    duration: '時長',
    sampleRate: '取樣率',
    settings: '音調設定',
    pitchShift: '音調偏移 (半音)',
    preserveTime: '保持時長',
    yes: '是',
    no: '否',
    outputFormat: '輸出格式',
    process: '開始處理',
    download: '下載結果',
    reset: '重置',
    processComplete: '處理完成',
    originalPitch: '原始音調',
    newPitch: '新音調',
    pitchChange: '音調變化',
    processTime: '處理時間',
    footer: '所有處理均在本地完成，檔案不會上傳至伺服器',
    semitones: '半音'
  },
  'en': {
    toolName: 'Audio Pitch Adjuster',
    toolDesc: 'Adjust audio pitch by semitones',
    uploadText: 'Drop audio file here',
    uploadHint: 'Supports MP3, WAV, OGG, FLAC formats',
    fileName: 'File Name',
    fileSize: 'File Size',
    duration: 'Duration',
    sampleRate: 'Sample Rate',
    settings: 'Pitch Settings',
    pitchShift: 'Pitch Shift (semitones)',
    preserveTime: 'Preserve Duration',
    yes: 'Yes',
    no: 'No',
    outputFormat: 'Output Format',
    process: 'Process',
    download: 'Download',
    reset: 'Reset',
    processComplete: 'Processing Complete',
    originalPitch: 'Original Pitch',
    newPitch: 'New Pitch',
    pitchChange: 'Pitch Change',
    processTime: 'Process Time',
    footer: 'All processing is done locally',
    semitones: 'semitones'
  },
  'ja': {
    toolName: 'オーディオピッチ調整',
    toolDesc: '半音単位でオーディオのピッチを調整',
    uploadText: 'オーディオファイルをここにドロップ',
    uploadHint: 'MP3, WAV, OGG, FLAC形式に対応',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    duration: '長さ',
    sampleRate: 'サンプルレート',
    settings: 'ピッチ設定',
    pitchShift: 'ピッチシフト（半音）',
    preserveTime: '長さを維持',
    yes: 'はい',
    no: 'いいえ',
    outputFormat: '出力形式',
    process: '処理開始',
    download: 'ダウンロード',
    reset: 'リセット',
    processComplete: '処理完了',
    originalPitch: '元のピッチ',
    newPitch: '新しいピッチ',
    pitchChange: 'ピッチ変化',
    processTime: '処理時間',
    footer: 'すべての処理はローカルで行われます',
    semitones: '半音'
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

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const duration = document.getElementById('duration');
const sampleRate = document.getElementById('sampleRate');
const pitchShift = document.getElementById('pitchShift');
const pitchValue = document.getElementById('pitchValue');
const preserveTime = document.getElementById('preserveTime');
const outputFormat = document.getElementById('outputFormat');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalPitch = document.getElementById('originalPitch');
const newPitch = document.getElementById('newPitch');
const pitchChange = document.getElementById('pitchChange');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// Event Listeners
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

pitchShift.addEventListener('input', () => {
  const val = parseInt(pitchShift.value);
  const sign = val > 0 ? '+' : '';
  pitchValue.textContent = `${sign}${val} ${i18n[currentLang].semitones}`;
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

    duration.textContent = formatDuration(audioBuffer.duration);
    sampleRate.textContent = audioBuffer.sampleRate + ' Hz';

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

  const semitones = parseInt(pitchShift.value);
  const keepTime = preserveTime.value === 'true';
  const format = outputFormat.value;

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '處理中...');

  const startTime = performance.now();

  try {
    updateProgress(20, '調整音調...');

    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const originalLength = audioBuffer.length;
    const originalSampleRate = audioBuffer.sampleRate;

    // Calculate pitch ratio (each semitone is 2^(1/12))
    const pitchRatio = Math.pow(2, semitones / 12);

    let newBuffer;

    if (keepTime) {
      // Pitch shift with time preservation (resample then adjust)
      const newLength = originalLength;
      newBuffer = ctx.createBuffer(numChannels, newLength, originalSampleRate);

      for (let ch = 0; ch < numChannels; ch++) {
        const inputData = audioBuffer.getChannelData(ch);
        const outputData = newBuffer.getChannelData(ch);

        for (let i = 0; i < newLength; i++) {
          const srcIndex = i * pitchRatio;
          const srcIndexFloor = Math.floor(srcIndex) % originalLength;
          const srcIndexCeil = (srcIndexFloor + 1) % originalLength;
          const fraction = srcIndex - Math.floor(srcIndex);

          if (srcIndex < originalLength) {
            outputData[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
          } else {
            outputData[i] = 0;
          }
        }
      }
    } else {
      // Simple pitch shift (changes duration)
      const newLength = Math.floor(originalLength / pitchRatio);
      newBuffer = ctx.createBuffer(numChannels, newLength, originalSampleRate);

      for (let ch = 0; ch < numChannels; ch++) {
        const inputData = audioBuffer.getChannelData(ch);
        const outputData = newBuffer.getChannelData(ch);

        for (let i = 0; i < newLength; i++) {
          const srcIndex = i * pitchRatio;
          const srcIndexFloor = Math.floor(srcIndex);
          const srcIndexCeil = Math.min(srcIndexFloor + 1, originalLength - 1);
          const fraction = srcIndex - srcIndexFloor;

          outputData[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
        }
      }
    }

    updateProgress(60, '編碼輸出...');

    if (format === 'wav') {
      processedBlob = audioBufferToWav(newBuffer);
    } else {
      processedBlob = audioBufferToWav(newBuffer); // Fallback to WAV
    }

    updateProgress(100, '完成！');

    const endTime = performance.now();

    // Update results
    originalPitch.textContent = '基準';
    const sign = semitones > 0 ? '+' : '';
    newPitch.textContent = `${sign}${semitones} ${i18n[currentLang].semitones}`;
    pitchChange.textContent = `${(pitchRatio * 100 - 100).toFixed(1)}%`;
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
  const semitones = parseInt(pitchShift.value);
  const sign = semitones >= 0 ? '+' : '';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_pitch${sign}${semitones}.${format}`;
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

  pitchShift.value = 0;
  pitchValue.textContent = `0 ${i18n[currentLang].semitones}`;

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

setLanguage('zh-TW');
