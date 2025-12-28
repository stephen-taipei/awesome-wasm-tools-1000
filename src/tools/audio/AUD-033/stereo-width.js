/**
 * AUD-033 立體聲寬度調整 - Stereo Width
 * 使用 Mid/Side 處理技術調整立體聲寬度
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const widthSlider = document.getElementById('widthSlider');
const widthValue = document.getElementById('widthValue');
const centerGain = document.getElementById('centerGain');
const centerGainValue = document.getElementById('centerGainValue');
const sideGain = document.getElementById('sideGain');
const sideGainValue = document.getElementById('sideGainValue');

const presetBtns = document.querySelectorAll('.preset-btn');
const widthIndicator = document.getElementById('widthIndicator');

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
const resultWidth = document.getElementById('resultWidth');
const resultDuration = document.getElementById('resultDuration');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;

// 預設值
const presets = {
  mono: { width: 0, centerGain: 0, sideGain: -96 },
  narrow: { width: 50, centerGain: 0, sideGain: 0 },
  normal: { width: 100, centerGain: 0, sideGain: 0 },
  wide: { width: 150, centerGain: 0, sideGain: 3 },
  ultrawide: { width: 200, centerGain: -3, sideGain: 6 }
};

// 初始化
function init() {
  setupEventListeners();
  updateWidthIndicator();
}

// 設定事件監聽器
function setupEventListeners() {
  // 上傳區域
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);

  // 參數滑桿
  widthSlider.addEventListener('input', () => {
    widthValue.textContent = widthSlider.value + '%';
    updateWidthIndicator();
  });

  centerGain.addEventListener('input', () => {
    centerGainValue.textContent = centerGain.value + ' dB';
  });

  sideGain.addEventListener('input', () => {
    sideGainValue.textContent = sideGain.value + ' dB';
  });

  // 預設按鈕
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.dataset.preset);
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

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  widthSlider.value = preset.width;
  widthValue.textContent = preset.width + '%';

  centerGain.value = preset.centerGain;
  centerGainValue.textContent = preset.centerGain + ' dB';

  sideGain.value = preset.sideGain;
  sideGainValue.textContent = preset.sideGain + ' dB';

  updateWidthIndicator();
}

// 更新寬度指示器
function updateWidthIndicator() {
  const width = parseInt(widthSlider.value);
  // 將 0-200 映射到 20-100% 顯示寬度
  const displayWidth = 20 + (width / 200) * 80;
  widthIndicator.style.width = displayWidth + '%';
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
      alert('注意：此為單聲道音訊，將轉換為立體聲後進行處理');
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
 * 將 dB 轉換為線性增益
 */
function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

/**
 * Mid/Side 立體聲寬度處理
 */
function processStereoWidth(buffer, widthPercent, centerGainDb, sideGainDb) {
  const numberOfChannels = 2; // 強制輸出立體聲
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  const outputBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

  // 取得輸入聲道（如果是單聲道則複製）
  const leftIn = buffer.getChannelData(0);
  const rightIn = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0);

  const leftOut = outputBuffer.getChannelData(0);
  const rightOut = outputBuffer.getChannelData(1);

  // 計算增益
  const widthFactor = widthPercent / 100;
  const midGain = dbToLinear(centerGainDb);
  const sideGainLinear = dbToLinear(sideGainDb);

  for (let i = 0; i < length; i++) {
    const L = leftIn[i];
    const R = rightIn[i];

    // 轉換到 Mid/Side
    const mid = (L + R) * 0.5;
    const side = (L - R) * 0.5;

    // 應用寬度和增益
    const processedMid = mid * midGain;
    const processedSide = side * widthFactor * sideGainLinear;

    // 轉換回 Left/Right
    let newL = processedMid + processedSide;
    let newR = processedMid - processedSide;

    // 軟限幅防止削波
    newL = softClip(newL);
    newR = softClip(newR);

    leftOut[i] = newL;
    rightOut[i] = newR;
  }

  return outputBuffer;
}

/**
 * 軟限幅
 */
function softClip(sample) {
  if (sample > 1) {
    return 1 - Math.exp(-(sample - 1));
  } else if (sample < -1) {
    return -1 + Math.exp(sample + 1);
  }
  return sample;
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

    progressFill.style.width = '20%';
    progressText.textContent = '調整立體聲寬度...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 取得參數
    const width = parseInt(widthSlider.value);
    const centerGainVal = parseFloat(centerGain.value);
    const sideGainVal = parseFloat(sideGain.value);

    // 處理
    const outputBuffer = processStereoWidth(
      originalBuffer,
      width,
      centerGainVal,
      sideGainVal
    );

    progressFill.style.width = '70%';
    progressText.textContent = '正在編碼輸出檔案...';
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
      width: width,
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
  resultWidth.textContent = results.width + '%';

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
  const originalName = originalFile.name.replace(/\.[^/.]+$/, '');
  const width = widthSlider.value;
  const downloadName = `${originalName}_width${width}.${ext}`;

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

  // 重置參數
  widthSlider.value = 100;
  widthValue.textContent = '100%';
  centerGain.value = 0;
  centerGainValue.textContent = '0 dB';
  sideGain.value = 0;
  sideGainValue.textContent = '0 dB';

  presetBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-preset="normal"]').classList.add('active');

  updateWidthIndicator();
}

// 啟動
init();
