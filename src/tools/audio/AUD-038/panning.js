/**
 * AUD-038 聲場定位 - Audio Panning
 * 控制音訊在立體聲場中的位置
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
const panIndicator = document.getElementById('panIndicator');

// 各模式設定群組
const staticSettings = document.getElementById('staticSettings');
const autoSettings = document.getElementById('autoSettings');
const linearSettings = document.getElementById('linearSettings');
const bounceSettings = document.getElementById('bounceSettings');

// 固定位置參數
const staticPosition = document.getElementById('staticPosition');
const staticPositionValue = document.getElementById('staticPositionValue');

// 自動擺盪參數
const autoRate = document.getElementById('autoRate');
const autoRateValue = document.getElementById('autoRateValue');
const autoDepth = document.getElementById('autoDepth');
const autoDepthValue = document.getElementById('autoDepthValue');
const autoWaveform = document.getElementById('autoWaveform');

// 線性移動參數
const linearStart = document.getElementById('linearStart');
const linearStartValue = document.getElementById('linearStartValue');
const linearEnd = document.getElementById('linearEnd');
const linearEndValue = document.getElementById('linearEndValue');

// 來回彈跳參數
const bounceCount = document.getElementById('bounceCount');
const bounceCountValue = document.getElementById('bounceCountValue');
const bounceWidth = document.getElementById('bounceWidth');
const bounceWidthValue = document.getElementById('bounceWidthValue');

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
let currentMode = 'static';

// 模式名稱對照
const modeNames = {
  static: '固定位置',
  auto: '自動擺盪',
  linear: '線性移動',
  bounce: '來回彈跳'
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
      updateSettingsVisibility();
    });
  });

  // 固定位置參數
  staticPosition.addEventListener('input', () => {
    const val = parseInt(staticPosition.value);
    staticPositionValue.textContent = formatPosition(val);
    updatePanIndicator(val);
  });

  // 自動擺盪參數
  autoRate.addEventListener('input', () => {
    autoRateValue.textContent = autoRate.value + ' Hz';
  });

  autoDepth.addEventListener('input', () => {
    autoDepthValue.textContent = autoDepth.value + '%';
  });

  // 線性移動參數
  linearStart.addEventListener('input', () => {
    linearStartValue.textContent = formatPosition(parseInt(linearStart.value));
  });

  linearEnd.addEventListener('input', () => {
    linearEndValue.textContent = formatPosition(parseInt(linearEnd.value));
  });

  // 來回彈跳參數
  bounceCount.addEventListener('input', () => {
    bounceCountValue.textContent = bounceCount.value + ' 次';
  });

  bounceWidth.addEventListener('input', () => {
    bounceWidthValue.textContent = bounceWidth.value + '%';
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

// 格式化位置文字
function formatPosition(val) {
  if (val === 0) return '中心';
  if (val < 0) return `左 ${Math.abs(val)}`;
  return `右 ${val}`;
}

// 更新設定群組顯示
function updateSettingsVisibility() {
  staticSettings.style.display = currentMode === 'static' ? 'block' : 'none';
  autoSettings.style.display = currentMode === 'auto' ? 'block' : 'none';
  linearSettings.style.display = currentMode === 'linear' ? 'block' : 'none';
  bounceSettings.style.display = currentMode === 'bounce' ? 'block' : 'none';
}

// 更新位置指示器
function updatePanIndicator(position) {
  // position: -100 到 100 -> left: 0% 到 100%
  const percent = (position + 100) / 2;
  panIndicator.style.left = percent + '%';
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

    fileInfo.classList.add('show');
    processBtn.disabled = false;

    originalPreview.src = URL.createObjectURL(file);

  } catch (error) {
    console.error('音訊解碼錯誤:', error);
    alert('無法解碼音訊檔案，請確認檔案格式正確');
  }
}

/**
 * 計算等功率 Pan 增益
 * @param {number} pan -1 到 1，-1=全左，0=中心，1=全右
 */
function calculatePanGains(pan) {
  // 等功率 panning
  const angle = pan * 0.25 * Math.PI; // -45° 到 +45°
  const leftGain = Math.cos(angle + Math.PI * 0.25);
  const rightGain = Math.sin(angle + Math.PI * 0.25);
  return { leftGain, rightGain };
}

/**
 * 獲取 LFO 波形值
 */
function getLFOValue(waveform, phase) {
  const p = phase % 1;
  switch (waveform) {
    case 'sine':
      return Math.sin(p * 2 * Math.PI);
    case 'triangle':
      if (p < 0.25) return p * 4;
      if (p < 0.75) return 1 - (p - 0.25) * 4;
      return (p - 0.75) * 4 - 1;
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'sawtooth':
      return p * 2 - 1;
    default:
      return Math.sin(p * 2 * Math.PI);
  }
}

/**
 * 套用聲場定位
 */
function applyPanning(buffer, mode, params) {
  const numberOfChannels = 2;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  const outputBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

  // 將輸入轉為單聲道
  const leftIn = buffer.getChannelData(0);
  const rightIn = buffer.numberOfChannels > 1 ?
    buffer.getChannelData(1) : buffer.getChannelData(0);

  const leftOut = outputBuffer.getChannelData(0);
  const rightOut = outputBuffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    // 混合為單聲道
    const mono = (leftIn[i] + rightIn[i]) * 0.5;

    // 計算當前時間點的 pan 值（-1 到 1）
    const t = i / sampleRate; // 秒
    const progress = i / length; // 0 到 1

    let pan;

    switch (mode) {
      case 'static':
        pan = params.position / 100;
        break;

      case 'auto':
        const lfoPhase = t * params.rate;
        const lfoValue = getLFOValue(params.waveform, lfoPhase);
        pan = lfoValue * (params.depth / 100);
        break;

      case 'linear':
        const startPan = params.start / 100;
        const endPan = params.end / 100;
        pan = startPan + (endPan - startPan) * progress;
        break;

      case 'bounce':
        const bounceProgress = progress * params.count;
        const bouncePhase = bounceProgress % 1;
        const bounceDir = Math.floor(bounceProgress) % 2;
        const width = params.width / 100;
        if (bounceDir === 0) {
          pan = -width + bouncePhase * 2 * width;
        } else {
          pan = width - bouncePhase * 2 * width;
        }
        break;

      default:
        pan = 0;
    }

    // 計算增益並應用
    const { leftGain, rightGain } = calculatePanGains(pan);

    leftOut[i] = mono * leftGain;
    rightOut[i] = mono * rightGain;
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
    progressText.textContent = '套用聲場定位...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 收集參數
    const params = {};

    switch (currentMode) {
      case 'static':
        params.position = parseInt(staticPosition.value);
        break;
      case 'auto':
        params.rate = parseFloat(autoRate.value);
        params.depth = parseInt(autoDepth.value);
        params.waveform = autoWaveform.value;
        break;
      case 'linear':
        params.start = parseInt(linearStart.value);
        params.end = parseInt(linearEnd.value);
        break;
      case 'bounce':
        params.count = parseInt(bounceCount.value);
        params.width = parseInt(bounceWidth.value);
        break;
    }

    // 套用定位
    const outputBuffer = applyPanning(originalBuffer, currentMode, params);

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
  resultMode.textContent = results.mode;

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
  const modeSuffix = currentMode;
  const downloadName = `${originalName}_pan_${modeSuffix}.${ext}`;

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
  staticPosition.value = 0;
  staticPositionValue.textContent = '中心';
  autoRate.value = 1;
  autoRateValue.textContent = '1 Hz';
  autoDepth.value = 100;
  autoDepthValue.textContent = '100%';
  linearStart.value = -100;
  linearStartValue.textContent = '左 100';
  linearEnd.value = 100;
  linearEndValue.textContent = '右 100';
  bounceCount.value = 4;
  bounceCountValue.textContent = '4 次';
  bounceWidth.value = 100;
  bounceWidthValue.textContent = '100%';

  updatePanIndicator(0);

  // 重置模式
  optionItems.forEach(i => i.classList.remove('active'));
  document.querySelector('[data-mode="static"]').classList.add('active');
  currentMode = 'static';
  updateSettingsVisibility();
}

// 啟動
init();
