/**
 * AUD-036 立體聲轉單聲道 - Stereo to Mono
 * 將立體聲音訊轉換為單聲道
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const optionGrid = document.getElementById('optionGrid');
const optionItems = optionGrid.querySelectorAll('.option-item');

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
const resultMode = document.getElementById('resultMode');
const resultChannels = document.getElementById('resultChannels');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;
let currentMode = 'average';

// 模式名稱對照
const modeNames = {
  average: '平均混合',
  left: '僅左聲道',
  right: '僅右聲道',
  max: '最大值'
};

// 初始化
function init() {
  setupEventListeners();
}

// 設定事件監聽器
function setupEventListeners() {
  // 上傳區域
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);

  // 模式選擇
  optionItems.forEach(item => {
    item.addEventListener('click', () => {
      optionItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentMode = item.dataset.mode;
    });
  });

  // 輸出格式
  outputFormat.addEventListener('change', () => {
    bitrateRow.style.display = outputFormat.value === 'mp3' ? 'flex' : 'none';
  });

  // 按鈕
  processBtn.addEventListener('click', processAudio);
  downloadBtn.addEventListener('click', downloadAudio);
  resetBtn.addEventListener('click', reset);
}

// 拖放處理
function handleDragOver(e) {
  e.preventDefault();
  uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

// 處理檔案
async function handleFile(file) {
  if (!file.type.startsWith('audio/')) {
    alert('請上傳音訊檔案');
    return;
  }

  originalFile = file;
  fileName.textContent = file.name;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const arrayBuffer = await file.arrayBuffer();
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = originalBuffer.duration;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    fileDuration.textContent = `時長: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    fileSampleRate.textContent = `取樣率: ${originalBuffer.sampleRate} Hz`;

    const channelText = originalBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道';
    fileChannels.textContent = `聲道: ${channelText}`;

    if (originalBuffer.numberOfChannels === 1) {
      alert('此檔案已經是單聲道，無需轉換');
    }

    fileInfo.classList.add('show');
    processBtn.disabled = false;

    originalPreview.src = URL.createObjectURL(file);

  } catch (error) {
    console.error('音訊解碼錯誤:', error);
    alert('無法解碼音訊檔案，請確認檔案格式正確');
  }
}

/**
 * 將立體聲轉換為單聲道
 */
function convertToMono(buffer, mode) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  // 建立單聲道 buffer
  const outputBuffer = audioContext.createBuffer(1, length, sampleRate);
  const outputData = outputBuffer.getChannelData(0);

  const leftData = buffer.getChannelData(0);
  const rightData = buffer.numberOfChannels > 1 ?
    buffer.getChannelData(1) : buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const L = leftData[i];
    const R = rightData[i];

    let monoSample;

    switch (mode) {
      case 'average':
        // 平均混合
        monoSample = (L + R) * 0.5;
        break;

      case 'left':
        // 僅左聲道
        monoSample = L;
        break;

      case 'right':
        // 僅右聲道
        monoSample = R;
        break;

      case 'max':
        // 取最大值（保留符號）
        if (Math.abs(L) >= Math.abs(R)) {
          monoSample = L;
        } else {
          monoSample = R;
        }
        break;

      default:
        monoSample = (L + R) * 0.5;
    }

    // 限幅
    outputData[i] = Math.max(-1, Math.min(1, monoSample));
  }

  return outputBuffer;
}

// 處理音訊
async function processAudio() {
  if (!originalBuffer) return;

  const startTime = performance.now();

  processBtn.disabled = true;
  progressContainer.classList.add('show');
  progressFill.style.width = '0%';
  progressText.textContent = '正在處理音訊...';

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    progressFill.style.width = '30%';
    progressText.textContent = '轉換為單聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 轉換
    const outputBuffer = convertToMono(originalBuffer, currentMode);

    progressFill.style.width = '60%';
    progressText.textContent = '編碼輸出檔案...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 編碼輸出
    if (outputFormat.value === 'wav') {
      processedBlob = encodeWAV(outputBuffer);
    } else {
      processedBlob = await encodeMP3(outputBuffer, parseInt(bitrate.value));
    }

    progressFill.style.width = '100%';
    progressText.textContent = '處理完成！';

    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 顯示結果
    showResults({
      mode: modeNames[currentMode],
      duration: outputBuffer.duration,
      size: processedBlob.size,
      time: processingTime,
      originalChannels: originalBuffer.numberOfChannels
    });

  } catch (error) {
    console.error('處理錯誤:', error);
    alert('處理過程發生錯誤: ' + error.message);
    progressContainer.classList.remove('show');
  }

  processBtn.disabled = false;
}

// 編碼 WAV
function encodeWAV(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = audioBuffer.getChannelData(0);

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// 編碼 MP3 (單聲道)
async function encodeMP3(audioBuffer, kbps) {
  return new Promise((resolve) => {
    const sampleRate = audioBuffer.sampleRate;
    // 單聲道編碼
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
    const mp3Data = [];

    const channelData = audioBuffer.getChannelData(0);

    const sampleBlockSize = 1152;
    const samples = new Int16Array(sampleBlockSize);

    for (let i = 0; i < channelData.length; i += sampleBlockSize) {
      const blockSize = Math.min(sampleBlockSize, channelData.length - i);

      for (let j = 0; j < blockSize; j++) {
        const sample = Math.max(-1, Math.min(1, channelData[i + j]));
        samples[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      const mp3buf = mp3encoder.encodeBuffer(samples.subarray(0, blockSize));

      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const mp3End = mp3encoder.flush();
    if (mp3End.length > 0) {
      mp3Data.push(mp3End);
    }

    resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
  });
}

// 顯示結果
function showResults(results) {
  resultMode.textContent = results.mode;
  resultChannels.textContent = `${results.originalChannels} → 1`;

  outputSize.textContent = formatFileSize(results.size);
  processTime.textContent = `${results.time}s`;

  const audioUrl = URL.createObjectURL(processedBlob);
  audioPreview.src = audioUrl;

  const ext = outputFormat.value;
  downloadLabel.textContent = `下載 ${ext.toUpperCase()}`;

  downloadBtn.classList.add('show');
  resetBtn.classList.add('show');
  resultPanel.classList.add('show');
}

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 下載音訊
function downloadAudio() {
  if (!processedBlob) return;

  const ext = outputFormat.value;
  const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
  const downloadName = `${originalName}_mono.${ext}`;

  const url = URL.createObjectURL(processedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}

// 重置
function reset() {
  originalBuffer = null;
  processedBlob = null;
  originalFile = null;

  fileInfo.classList.remove('show');
  progressContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  downloadBtn.classList.remove('show');
  resetBtn.classList.remove('show');

  processBtn.disabled = true;
  fileInput.value = '';
  originalPreview.src = '';
  audioPreview.src = '';

  // 重置模式
  optionItems.forEach(i => i.classList.remove('active'));
  document.querySelector('[data-mode="average"]').classList.add('active');
  currentMode = 'average';
}

// 啟動
init();
