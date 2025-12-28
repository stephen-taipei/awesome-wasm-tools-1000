/**
 * AUD-034 左右聲道分離 - Channel Separator
 * 將立體聲分離為左右兩個單聲道
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');

const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');

const resultPanel = document.getElementById('resultPanel');
const resultChannels = document.getElementById('resultChannels');
const resultDuration = document.getElementById('resultDuration');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const leftPreview = document.getElementById('leftPreview');
const rightPreview = document.getElementById('rightPreview');
const downloadLeftBtn = document.getElementById('downloadLeftBtn');
const downloadRightBtn = document.getElementById('downloadRightBtn');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let leftBlob = null;
let rightBlob = null;
let originalFile = null;

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

  // 輸出格式
  outputFormat.addEventListener('change', () => {
    bitrateRow.style.display = outputFormat.value === 'mp3' ? 'flex' : 'none';
  });

  // 按鈕
  processBtn.addEventListener('click', processAudio);
  resetBtn.addEventListener('click', reset);
  downloadLeftBtn.addEventListener('click', () => downloadChannel('left'));
  downloadRightBtn.addEventListener('click', () => downloadChannel('right'));
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
      alert('此為單聲道音訊，無法進行左右聲道分離。請上傳立體聲音訊。');
      return;
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
 * 提取單一聲道
 */
function extractChannel(buffer, channelIndex) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  // 建立單聲道 buffer
  const outputBuffer = audioContext.createBuffer(1, length, sampleRate);
  const inputData = buffer.getChannelData(channelIndex);
  const outputData = outputBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    outputData[i] = inputData[i];
  }

  return outputBuffer;
}

// 處理音訊
async function processAudio() {
  if (!originalBuffer) return;
  if (originalBuffer.numberOfChannels < 2) {
    alert('需要立體聲音訊才能進行聲道分離');
    return;
  }

  const startTime = performance.now();

  processBtn.disabled = true;
  progressContainer.classList.add('show');
  progressFill.style.width = '0%';
  progressText.textContent = '正在處理音訊...';

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    // 提取左聲道
    progressFill.style.width = '20%';
    progressText.textContent = '提取左聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    const leftBuffer = extractChannel(originalBuffer, 0);

    // 提取右聲道
    progressFill.style.width = '40%';
    progressText.textContent = '提取右聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    const rightBuffer = extractChannel(originalBuffer, 1);

    // 編碼左聲道
    progressFill.style.width = '60%';
    progressText.textContent = '編碼左聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    if (outputFormat.value === 'wav') {
      leftBlob = encodeWAV(leftBuffer);
    } else {
      leftBlob = await encodeMP3(leftBuffer, parseInt(bitrate.value));
    }

    // 編碼右聲道
    progressFill.style.width = '80%';
    progressText.textContent = '編碼右聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    if (outputFormat.value === 'wav') {
      rightBlob = encodeWAV(rightBuffer);
    } else {
      rightBlob = await encodeMP3(rightBuffer, parseInt(bitrate.value));
    }

    progressFill.style.width = '100%';
    progressText.textContent = '處理完成！';

    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 顯示結果
    showResults({
      duration: leftBuffer.duration,
      leftSize: leftBlob.size,
      rightSize: rightBlob.size,
      time: processingTime
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

  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
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
  resultChannels.textContent = '2 → 1';

  const mins = Math.floor(results.duration / 60);
  const secs = (results.duration % 60).toFixed(1);
  resultDuration.textContent = `${mins}:${secs.padStart(4, '0')}`;

  // 顯示平均大小
  const avgSize = (results.leftSize + results.rightSize) / 2;
  outputSize.textContent = formatFileSize(avgSize);
  processTime.textContent = `${results.time}s`;

  // 設定預覽
  const leftUrl = URL.createObjectURL(leftBlob);
  const rightUrl = URL.createObjectURL(rightBlob);
  leftPreview.src = leftUrl;
  rightPreview.src = rightUrl;

  resetBtn.classList.add('show');
  resultPanel.classList.add('show');
}

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 下載聲道
function downloadChannel(channel) {
  const blob = channel === 'left' ? leftBlob : rightBlob;
  if (!blob) return;

  const ext = outputFormat.value;
  const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
  const channelSuffix = channel === 'left' ? 'L' : 'R';
  const downloadName = `${originalName}_${channelSuffix}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}

// 重置
function reset() {
  originalBuffer = null;
  leftBlob = null;
  rightBlob = null;
  originalFile = null;

  fileInfo.classList.remove('show');
  progressContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  resetBtn.classList.remove('show');

  processBtn.disabled = true;
  fileInput.value = '';
  originalPreview.src = '';
  leftPreview.src = '';
  rightPreview.src = '';
}

// 啟動
init();
