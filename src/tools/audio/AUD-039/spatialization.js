/**
 * AUD-039 音頻空間化 - Audio Spatialization
 * 3D 空間音效模擬
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const spatialCanvas = document.getElementById('spatialCanvas');
const sourceDot = document.getElementById('sourceDot');
const positionInfo = document.getElementById('positionInfo');
const angleValue = document.getElementById('angleValue');
const distanceValue = document.getElementById('distanceValue');

const presetBtns = document.querySelectorAll('.preset-btn');

const distanceAttenuation = document.getElementById('distanceAttenuation');
const distanceAttenuationValue = document.getElementById('distanceAttenuationValue');
const roomReverb = document.getElementById('roomReverb');
const roomReverbValue = document.getElementById('roomReverbValue');
const highFreqRolloff = document.getElementById('highFreqRolloff');
const highFreqRolloffValue = document.getElementById('highFreqRolloffValue');

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
const resultAngle = document.getElementById('resultAngle');
const resultDistance = document.getElementById('resultDistance');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;

// 音源位置 (0-100 百分比)
let sourceX = 50;
let sourceY = 30;
let isDragging = false;

// 初始化
function init() {
  setupEventListeners();
  updatePositionDisplay();
}

// 設定事件監聽器
function setupEventListeners() {
  // 上傳區域
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);

  // 空間畫布拖動
  sourceDot.addEventListener('mousedown', startDrag);
  sourceDot.addEventListener('touchstart', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  // 點擊畫布設定位置
  spatialCanvas.addEventListener('click', (e) => {
    if (!isDragging) {
      setSourcePosition(e);
    }
  });

  // 預設按鈕
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sourceX = parseInt(btn.dataset.x);
      sourceY = parseInt(btn.dataset.y);
      updateSourceDotPosition();
      updatePositionDisplay();
    });
  });

  // 參數滑桿
  distanceAttenuation.addEventListener('input', () => {
    distanceAttenuationValue.textContent = distanceAttenuation.value + '%';
  });

  roomReverb.addEventListener('input', () => {
    roomReverbValue.textContent = roomReverb.value + '%';
  });

  highFreqRolloff.addEventListener('input', () => {
    highFreqRolloffValue.textContent = highFreqRolloff.value + '%';
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

// 拖動開始
function startDrag(e) {
  isDragging = true;
  e.preventDefault();
}

// 拖動中
function drag(e) {
  if (!isDragging) return;

  e.preventDefault();
  const rect = spatialCanvas.getBoundingClientRect();

  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  sourceX = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
  sourceY = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));

  updateSourceDotPosition();
  updatePositionDisplay();
}

// 拖動結束
function endDrag() {
  isDragging = false;
}

// 點擊設定位置
function setSourcePosition(e) {
  const rect = spatialCanvas.getBoundingClientRect();
  sourceX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
  sourceY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

  updateSourceDotPosition();
  updatePositionDisplay();
}

// 更新音源點位置
function updateSourceDotPosition() {
  sourceDot.style.left = sourceX + '%';
  sourceDot.style.top = sourceY + '%';
}

// 更新位置顯示
function updatePositionDisplay() {
  // 計算角度（以聽者為中心，0度為正前方）
  const dx = sourceX - 50;
  const dy = 50 - sourceY; // Y軸反轉（上為前）

  let angle = Math.atan2(dx, dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  // 計算距離（0-100）
  const distance = Math.sqrt(dx * dx + dy * dy) * 2;
  const distancePercent = Math.min(100, Math.round(distance));

  angleValue.textContent = Math.round(angle) + '°';
  distanceValue.textContent = distancePercent + '%';

  // 更新位置描述
  let posDesc = '';
  if (sourceY < 40) posDesc = '前方';
  else if (sourceY > 60) posDesc = '後方';

  if (sourceX < 40) posDesc += (posDesc ? '左' : '左側');
  else if (sourceX > 60) posDesc += (posDesc ? '右' : '右側');

  if (!posDesc) posDesc = '中心';

  positionInfo.innerHTML = `位置：<strong>${posDesc}</strong> | 角度：<strong>${Math.round(angle)}°</strong> | 距離：<strong>${distancePercent}%</strong>`;
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
 * 套用空間化效果
 */
function applySpatialEffect(buffer, params) {
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const outputBuffer = audioContext.createBuffer(2, length, sampleRate);

  // 將輸入混合為單聲道
  const leftIn = buffer.getChannelData(0);
  const rightIn = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftIn;

  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    mono[i] = (leftIn[i] + rightIn[i]) * 0.5;
  }

  const leftOut = outputBuffer.getChannelData(0);
  const rightOut = outputBuffer.getChannelData(1);

  // 計算空間參數
  const dx = (params.x - 50) / 50; // -1 到 1
  const dy = (50 - params.y) / 50; // -1 到 1（上為前）

  // 角度（弧度）
  const angle = Math.atan2(dx, dy);

  // 距離 (0 到 1)
  const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy));

  // ITD (Interaural Time Difference) - 最大約 0.7ms
  const maxITD = 0.0007; // 秒
  const itd = Math.sin(angle) * maxITD * distance;
  const itdSamples = Math.round(itd * sampleRate);

  // ILD (Interaural Level Difference)
  // 右側為正角度
  const ildFactor = Math.sin(angle) * 0.3 * distance; // 最大 6dB 差異

  // 距離衰減
  const distanceAtten = params.distanceAttenuation / 100;
  const gainFactor = 1 - (distance * distanceAtten * 0.5);

  // 高頻衰減（模擬頭部陰影效應）
  const hfRolloff = params.highFreqRolloff / 100;

  // 簡單低通濾波器係數
  const shadowAlpha = distance * hfRolloff * 0.8;

  // 混響量
  const reverbMix = params.roomReverb / 100 * 0.5;

  // 簡單延遲混響
  const reverbDelay = Math.round(sampleRate * 0.05); // 50ms
  const reverbDecay = 0.3;

  let prevLeftLPF = 0;
  let prevRightLPF = 0;

  for (let i = 0; i < length; i++) {
    let sample = mono[i] * gainFactor;

    // 基礎增益（左右）
    let leftGain = 1 - Math.max(0, ildFactor);
    let rightGain = 1 + Math.min(0, ildFactor);

    // 前後區分：後方聲音較悶
    if (dy < 0) {
      const backFactor = Math.abs(dy);
      leftGain *= (1 - backFactor * 0.2);
      rightGain *= (1 - backFactor * 0.2);
    }

    // ITD 延遲
    let leftIdx = i - (itdSamples > 0 ? itdSamples : 0);
    let rightIdx = i - (itdSamples < 0 ? -itdSamples : 0);

    let leftSample = leftIdx >= 0 ? mono[leftIdx] * gainFactor : 0;
    let rightSample = rightIdx >= 0 ? mono[rightIdx] * gainFactor : 0;

    leftSample *= leftGain;
    rightSample *= rightGain;

    // 頭部陰影效應（低通濾波）
    // 對於來自對側的聲音進行更多濾波
    const leftShadow = dx > 0 ? shadowAlpha : shadowAlpha * 0.3;
    const rightShadow = dx < 0 ? shadowAlpha : shadowAlpha * 0.3;

    leftSample = leftSample * (1 - leftShadow) + prevLeftLPF * leftShadow;
    rightSample = rightSample * (1 - rightShadow) + prevRightLPF * rightShadow;

    prevLeftLPF = leftSample;
    prevRightLPF = rightSample;

    // 添加簡單混響
    if (reverbMix > 0 && i >= reverbDelay) {
      const reverbL = mono[i - reverbDelay] * reverbDecay * reverbMix;
      const reverbR = mono[i - reverbDelay] * reverbDecay * reverbMix;
      leftSample += reverbL;
      rightSample += reverbR;
    }

    // 限幅
    leftOut[i] = Math.max(-1, Math.min(1, leftSample));
    rightOut[i] = Math.max(-1, Math.min(1, rightSample));
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
    progressText.textContent = '套用空間化效果...';
    await new Promise(resolve => setTimeout(resolve, 50));

    const params = {
      x: sourceX,
      y: sourceY,
      distanceAttenuation: parseInt(distanceAttenuation.value),
      roomReverb: parseInt(roomReverb.value),
      highFreqRolloff: parseInt(highFreqRolloff.value)
    };

    const outputBuffer = applySpatialEffect(originalBuffer, params);

    progressFill.style.width = '60%';
    progressText.textContent = '編碼輸出檔案...';
    await new Promise(resolve => setTimeout(resolve, 50));

    if (outputFormat.value === 'wav') {
      processedBlob = encodeWAV(outputBuffer);
    } else {
      processedBlob = await encodeMP3(outputBuffer, parseInt(bitrate.value));
    }

    progressFill.style.width = '100%';
    progressText.textContent = '處理完成！';

    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 計算角度和距離
    const dx = sourceX - 50;
    const dy = 50 - sourceY;
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const distance = Math.min(100, Math.round(Math.sqrt(dx * dx + dy * dy) * 2));

    showResults({
      angle: Math.round(angle),
      distance: distance,
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
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// 編碼 MP3
async function encodeMP3(audioBuffer, kbps) {
  return new Promise((resolve) => {
    const sampleRate = audioBuffer.sampleRate;
    const mp3encoder = new lamejs.Mp3Encoder(2, sampleRate, kbps);
    const mp3Data = [];

    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    const sampleBlockSize = 1152;

    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const blockSize = Math.min(sampleBlockSize, left.length - i);
      const leftInt16 = new Int16Array(blockSize);
      const rightInt16 = new Int16Array(blockSize);

      for (let j = 0; j < blockSize; j++) {
        const l = Math.max(-1, Math.min(1, left[i + j]));
        const r = Math.max(-1, Math.min(1, right[i + j]));
        leftInt16[j] = l < 0 ? l * 0x8000 : l * 0x7FFF;
        rightInt16[j] = r < 0 ? r * 0x8000 : r * 0x7FFF;
      }

      const mp3buf = mp3encoder.encodeBuffer(leftInt16, rightInt16);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }

    const mp3End = mp3encoder.flush();
    if (mp3End.length > 0) mp3Data.push(mp3End);

    resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
  });
}

// 顯示結果
function showResults(results) {
  resultAngle.textContent = results.angle + '°';
  resultDistance.textContent = results.distance + '%';
  outputSize.textContent = formatFileSize(results.size);
  processTime.textContent = results.time + 's';

  audioPreview.src = URL.createObjectURL(processedBlob);
  downloadLabel.textContent = `下載 ${outputFormat.value.toUpperCase()}`;

  downloadBtn.classList.add('show');
  resetBtn.classList.add('show');
  resultPanel.classList.add('show');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 下載
function downloadAudio() {
  if (!processedBlob) return;

  const ext = outputFormat.value;
  const name = originalFile.name.replace(/\.[^/.]+$/, '');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(processedBlob);
  a.download = `${name}_3d_spatial.${ext}`;
  a.click();
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

  sourceX = 50;
  sourceY = 30;
  updateSourceDotPosition();
  updatePositionDisplay();

  distanceAttenuation.value = 50;
  distanceAttenuationValue.textContent = '50%';
  roomReverb.value = 30;
  roomReverbValue.textContent = '30%';
  highFreqRolloff.value = 40;
  highFreqRolloffValue.textContent = '40%';
}

init();
