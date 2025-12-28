/**
 * AUD-035 聲道合併 - Channel Merger
 * 將兩個單聲道合併為立體聲
 */

// DOM 元素
const uploadAreaLeft = document.getElementById('uploadAreaLeft');
const uploadAreaRight = document.getElementById('uploadAreaRight');
const fileInputLeft = document.getElementById('fileInputLeft');
const fileInputRight = document.getElementById('fileInputRight');
const fileInfoLeft = document.getElementById('fileInfoLeft');
const fileInfoRight = document.getElementById('fileInfoRight');
const fileNameLeft = document.getElementById('fileNameLeft');
const fileNameRight = document.getElementById('fileNameRight');
const fileDetailsLeft = document.getElementById('fileDetailsLeft');
const fileDetailsRight = document.getElementById('fileDetailsRight');

const warningBox = document.getElementById('warningBox');

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
const resultChannels = document.getElementById('resultChannels');
const resultDuration = document.getElementById('resultDuration');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let leftBuffer = null;
let rightBuffer = null;
let processedBlob = null;
let leftFile = null;
let rightFile = null;

// 初始化
function init() {
  setupEventListeners();
}

// 設定事件監聽器
function setupEventListeners() {
  // 左聲道上傳
  uploadAreaLeft.addEventListener('click', () => fileInputLeft.click());
  uploadAreaLeft.addEventListener('dragover', (e) => handleDragOver(e, uploadAreaLeft));
  uploadAreaLeft.addEventListener('dragleave', (e) => handleDragLeave(e, uploadAreaLeft));
  uploadAreaLeft.addEventListener('drop', (e) => handleDrop(e, 'left'));
  fileInputLeft.addEventListener('change', (e) => handleFileSelect(e, 'left'));

  // 右聲道上傳
  uploadAreaRight.addEventListener('click', () => fileInputRight.click());
  uploadAreaRight.addEventListener('dragover', (e) => handleDragOver(e, uploadAreaRight));
  uploadAreaRight.addEventListener('dragleave', (e) => handleDragLeave(e, uploadAreaRight));
  uploadAreaRight.addEventListener('drop', (e) => handleDrop(e, 'right'));
  fileInputRight.addEventListener('change', (e) => handleFileSelect(e, 'right'));

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
function handleDragOver(e, element) {
  e.preventDefault();
  element.classList.add('dragover');
}

function handleDragLeave(e, element) {
  e.preventDefault();
  element.classList.remove('dragover');
}

function handleDrop(e, channel) {
  e.preventDefault();
  const element = channel === 'left' ? uploadAreaLeft : uploadAreaRight;
  element.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0], channel);
  }
}

function handleFileSelect(e, channel) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0], channel);
  }
}

// 處理檔案
async function handleFile(file, channel) {
  if (!file.type.startsWith('audio/')) {
    alert('請上傳音訊檔案');
    return;
  }

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = buffer.duration;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    const channelText = buffer.numberOfChannels === 2 ? '立體聲' : '單聲道';

    if (channel === 'left') {
      leftBuffer = buffer;
      leftFile = file;
      fileNameLeft.textContent = file.name;
      fileDetailsLeft.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} | ${buffer.sampleRate}Hz | ${channelText}`;
      fileInfoLeft.style.display = 'block';
      uploadAreaLeft.classList.add('loaded');
    } else {
      rightBuffer = buffer;
      rightFile = file;
      fileNameRight.textContent = file.name;
      fileDetailsRight.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} | ${buffer.sampleRate}Hz | ${channelText}`;
      fileInfoRight.style.display = 'block';
      uploadAreaRight.classList.add('loaded');
    }

    // 檢查是否兩個都已上傳
    checkReadyState();

  } catch (error) {
    console.error('音訊解碼錯誤:', error);
    alert('無法解碼音訊檔案，請確認檔案格式正確');
  }
}

// 檢查是否準備好處理
function checkReadyState() {
  if (leftBuffer && rightBuffer) {
    processBtn.disabled = false;

    // 檢查長度是否相同
    const diff = Math.abs(leftBuffer.duration - rightBuffer.duration);
    if (diff > 0.1) { // 超過 0.1 秒視為不同
      warningBox.classList.add('show');
    } else {
      warningBox.classList.remove('show');
    }
  }
}

/**
 * 合併兩個聲道為立體聲
 */
function mergeChannels(leftBuf, rightBuf) {
  // 使用較高的取樣率
  const sampleRate = Math.max(leftBuf.sampleRate, rightBuf.sampleRate);

  // 使用較短的長度
  const length = Math.min(leftBuf.length, rightBuf.length);

  // 建立立體聲 buffer
  const outputBuffer = audioContext.createBuffer(2, length, sampleRate);

  // 取得來源資料（如果是立體聲則取對應聲道）
  const leftData = leftBuf.getChannelData(0);
  const rightData = rightBuf.numberOfChannels > 1 ?
    rightBuf.getChannelData(1) : rightBuf.getChannelData(0);

  const outLeft = outputBuffer.getChannelData(0);
  const outRight = outputBuffer.getChannelData(1);

  // 如果取樣率不同，需要重新取樣
  const leftRatio = leftBuf.sampleRate / sampleRate;
  const rightRatio = rightBuf.sampleRate / sampleRate;

  for (let i = 0; i < length; i++) {
    // 線性內插重新取樣
    const leftIdx = i * leftRatio;
    const rightIdx = i * rightRatio;

    outLeft[i] = interpolate(leftData, leftIdx);
    outRight[i] = interpolate(rightData, rightIdx);
  }

  return outputBuffer;
}

/**
 * 線性內插
 */
function interpolate(data, index) {
  const i0 = Math.floor(index);
  const i1 = Math.min(i0 + 1, data.length - 1);
  const frac = index - i0;
  return data[i0] * (1 - frac) + data[i1] * frac;
}

// 處理音訊
async function processAudio() {
  if (!leftBuffer || !rightBuffer) return;

  const startTime = performance.now();

  processBtn.disabled = true;
  progressContainer.classList.add('show');
  progressFill.style.width = '0%';
  progressText.textContent = '正在處理音訊...';

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    progressFill.style.width = '30%';
    progressText.textContent = '合併聲道...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 合併聲道
    const outputBuffer = mergeChannels(leftBuffer, rightBuffer);

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
      duration: outputBuffer.duration,
      size: processedBlob.size,
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

// 編碼 MP3
async function encodeMP3(audioBuffer, kbps) {
  return new Promise((resolve) => {
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;

    const mp3encoder = new lamejs.Mp3Encoder(numberOfChannels, sampleRate, kbps);
    const mp3Data = [];

    const left = audioBuffer.getChannelData(0);
    const right = numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    const sampleBlockSize = 1152;
    const leftInt16 = new Int16Array(sampleBlockSize);
    const rightInt16 = new Int16Array(sampleBlockSize);

    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const blockSize = Math.min(sampleBlockSize, left.length - i);

      for (let j = 0; j < blockSize; j++) {
        const leftSample = Math.max(-1, Math.min(1, left[i + j]));
        const rightSample = Math.max(-1, Math.min(1, right[i + j]));
        leftInt16[j] = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7FFF;
        rightInt16[j] = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7FFF;
      }

      let mp3buf;
      if (numberOfChannels === 2) {
        mp3buf = mp3encoder.encodeBuffer(leftInt16.subarray(0, blockSize), rightInt16.subarray(0, blockSize));
      } else {
        mp3buf = mp3encoder.encodeBuffer(leftInt16.subarray(0, blockSize));
      }

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
  resultChannels.textContent = '1+1 → 2';

  const mins = Math.floor(results.duration / 60);
  const secs = (results.duration % 60).toFixed(1);
  resultDuration.textContent = `${mins}:${secs.padStart(4, '0')}`;

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
  const leftName = leftFile.name.replace(/\.[^/.]+$/, '');
  const rightName = rightFile.name.replace(/\.[^/.]+$/, '');
  const downloadName = `${leftName}_${rightName}_merged.${ext}`;

  const url = URL.createObjectURL(processedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}

// 重置
function reset() {
  leftBuffer = null;
  rightBuffer = null;
  processedBlob = null;
  leftFile = null;
  rightFile = null;

  fileInfoLeft.style.display = 'none';
  fileInfoRight.style.display = 'none';
  uploadAreaLeft.classList.remove('loaded');
  uploadAreaRight.classList.remove('loaded');
  warningBox.classList.remove('show');

  progressContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  downloadBtn.classList.remove('show');
  resetBtn.classList.remove('show');

  processBtn.disabled = true;
  fileInputLeft.value = '';
  fileInputRight.value = '';
  audioPreview.src = '';
}

// 啟動
init();
