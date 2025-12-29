/**
 * AUD-031 音頻自動切片 - Auto Slicer
 * 自動偵測瞬態/靜音/節拍並切割音訊
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');
const waveformContainer = document.getElementById('waveformContainer');
const waveformCanvas = document.getElementById('waveformCanvas');

const modeSelector = document.getElementById('modeSelector');
const modeBtns = modeSelector.querySelectorAll('.mode-btn');

const transientSettings = document.getElementById('transientSettings');
const silenceSettings = document.getElementById('silenceSettings');
const beatSettings = document.getElementById('beatSettings');

const sensitivitySlider = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const minIntervalSlider = document.getElementById('minInterval');
const minIntervalValue = document.getElementById('minIntervalValue');
const silenceThresholdSlider = document.getElementById('silenceThreshold');
const silenceThresholdValue = document.getElementById('silenceThresholdValue');
const minSilenceSlider = document.getElementById('minSilence');
const minSilenceValue = document.getElementById('minSilenceValue');
const beatsPerSliceSlider = document.getElementById('beatsPerSlice');
const beatsPerSliceValue = document.getElementById('beatsPerSliceValue');
const bpmSlider = document.getElementById('bpm');
const bpmValue = document.getElementById('bpmValue');
const fadeTimeSlider = document.getElementById('fadeTime');
const fadeTimeValue = document.getElementById('fadeTimeValue');

const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const analyzeBtn = document.getElementById('analyzeBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const resetBtn = document.getElementById('resetBtn');

const resultPanel = document.getElementById('resultPanel');
const sliceCount = document.getElementById('sliceCount');
const avgDuration = document.getElementById('avgDuration');
const processTime = document.getElementById('processTime');
const sliceList = document.getElementById('sliceList');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let originalFile = null;
let currentMode = 'transient';
let slices = [];
let sliceBlobs = [];

// 初始化
function init() {
  setupEventListeners();
  updateSliderDisplays();
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
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      updateModeUI();
    });
  });

  // 滑桿
  sensitivitySlider.addEventListener('input', updateSliderDisplays);
  minIntervalSlider.addEventListener('input', updateSliderDisplays);
  silenceThresholdSlider.addEventListener('input', updateSliderDisplays);
  minSilenceSlider.addEventListener('input', updateSliderDisplays);
  beatsPerSliceSlider.addEventListener('input', updateSliderDisplays);
  bpmSlider.addEventListener('input', updateSliderDisplays);
  fadeTimeSlider.addEventListener('input', updateSliderDisplays);

  // 按鈕
  analyzeBtn.addEventListener('click', analyzeAndSlice);
  downloadAllBtn.addEventListener('click', downloadAll);
  resetBtn.addEventListener('click', reset);
}

// 更新模式 UI
function updateModeUI() {
  transientSettings.style.display = currentMode === 'transient' ? 'block' : 'none';
  silenceSettings.style.display = currentMode === 'silence' ? 'block' : 'none';
  beatSettings.classList.toggle('show', currentMode === 'beat');
}

// 更新滑桿顯示值
function updateSliderDisplays() {
  sensitivityValue.textContent = `${sensitivitySlider.value}%`;
  minIntervalValue.textContent = `${minIntervalSlider.value} ms`;
  silenceThresholdValue.textContent = `${silenceThresholdSlider.value} dB`;
  minSilenceValue.textContent = `${minSilenceSlider.value} ms`;
  beatsPerSliceValue.textContent = `${beatsPerSliceSlider.value} 拍`;
  bpmValue.textContent = bpmSlider.value;
  fadeTimeValue.textContent = `${fadeTimeSlider.value} ms`;
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
    fileChannels.textContent = `聲道: ${originalBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道'}`;

    fileInfo.classList.add('show');
    waveformContainer.style.display = 'block';
    analyzeBtn.disabled = false;

    drawWaveform();

  } catch (error) {
    console.error('音訊解碼錯誤:', error);
    alert('無法解碼音訊檔案，請確認檔案格式正確');
  }
}

// 繪製波形
function drawWaveform() {
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformContainer.offsetWidth;
  const height = waveformContainer.offsetHeight;

  waveformCanvas.width = width * 2;
  waveformCanvas.height = height * 2;
  ctx.scale(2, 2);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, height);

  const data = originalBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx < data.length) {
        const val = data[idx];
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }

    ctx.moveTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }

  ctx.stroke();
}

// 繪製切片標記
function drawSliceMarkers() {
  const ctx = waveformCanvas.getContext('2d');
  const width = waveformContainer.offsetWidth;
  const height = waveformContainer.offsetHeight;

  // 重繪波形
  drawWaveform();

  // 繪製切片標記
  const duration = originalBuffer.duration;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;

  slices.forEach((slice, index) => {
    const x = (slice.start / duration) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  });
}

/**
 * 瞬態偵測
 */
function detectTransients(buffer, sensitivity, minIntervalMs) {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const length = data.length;

  // 計算能量包絡
  const windowSize = Math.floor(sampleRate * 0.01); // 10ms 視窗
  const hopSize = Math.floor(windowSize / 4);
  const numFrames = Math.floor((length - windowSize) / hopSize);
  const energy = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const start = i * hopSize;
    for (let j = 0; j < windowSize; j++) {
      sum += data[start + j] * data[start + j];
    }
    energy[i] = Math.sqrt(sum / windowSize);
  }

  // 計算能量差分
  const diff = new Float32Array(numFrames - 1);
  for (let i = 1; i < numFrames; i++) {
    diff[i - 1] = Math.max(0, energy[i] - energy[i - 1]);
  }

  // 找出峰值
  const threshold = (100 - sensitivity) / 100 * 0.5;
  const maxDiff = Math.max(...diff);
  const absThreshold = maxDiff * threshold;

  const minIntervalSamples = Math.floor(minIntervalMs / 1000 * sampleRate);
  const minIntervalFrames = Math.floor(minIntervalSamples / hopSize);

  const onsets = [];
  let lastOnset = -minIntervalFrames;

  for (let i = 1; i < diff.length - 1; i++) {
    if (diff[i] > absThreshold &&
        diff[i] > diff[i - 1] &&
        diff[i] >= diff[i + 1] &&
        i - lastOnset >= minIntervalFrames) {
      onsets.push(i * hopSize / sampleRate);
      lastOnset = i;
    }
  }

  // 確保第一個切片從 0 開始
  if (onsets.length === 0 || onsets[0] > 0.1) {
    onsets.unshift(0);
  }

  return onsets;
}

/**
 * 靜音偵測
 */
function detectSilence(buffer, thresholdDb, minSilenceMs) {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const length = data.length;

  const threshold = Math.pow(10, thresholdDb / 20);
  const minSilenceSamples = Math.floor(minSilenceMs / 1000 * sampleRate);

  const segments = [];
  let inSilence = true;
  let segmentStart = 0;
  let silenceStart = 0;

  const windowSize = Math.floor(sampleRate * 0.01);

  for (let i = 0; i < length; i += windowSize) {
    let rms = 0;
    const end = Math.min(i + windowSize, length);
    for (let j = i; j < end; j++) {
      rms += data[j] * data[j];
    }
    rms = Math.sqrt(rms / (end - i));

    const isSilent = rms < threshold;

    if (inSilence && !isSilent) {
      // 從靜音進入有聲
      if (i > 0) {
        segmentStart = i / sampleRate;
      }
      inSilence = false;
    } else if (!inSilence && isSilent) {
      // 從有聲進入靜音
      silenceStart = i;
      inSilence = true;
    } else if (inSilence && isSilent) {
      // 持續靜音
      if (i - silenceStart >= minSilenceSamples && segmentStart > 0) {
        segments.push(segmentStart);
        segmentStart = 0;
      }
    }
  }

  // 確保第一個切片從 0 開始
  if (segments.length === 0 || segments[0] > 0.1) {
    segments.unshift(0);
  }

  return segments;
}

/**
 * 節拍切片
 */
function detectBeats(buffer, bpm, beatsPerSlice) {
  const duration = buffer.duration;
  const beatDuration = 60 / bpm;
  const sliceDuration = beatDuration * beatsPerSlice;

  const onsets = [];
  let time = 0;

  while (time < duration) {
    onsets.push(time);
    time += sliceDuration;
  }

  return onsets;
}

/**
 * 分析並切片
 */
async function analyzeAndSlice() {
  if (!originalBuffer) return;

  const startTime = performance.now();

  analyzeBtn.disabled = true;
  progressContainer.classList.add('show');
  progressFill.style.width = '0%';
  progressText.textContent = '正在分析音訊...';

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    // 偵測切片點
    let onsets;

    if (currentMode === 'transient') {
      onsets = detectTransients(
        originalBuffer,
        parseInt(sensitivitySlider.value),
        parseInt(minIntervalSlider.value)
      );
    } else if (currentMode === 'silence') {
      onsets = detectSilence(
        originalBuffer,
        parseInt(silenceThresholdSlider.value),
        parseInt(minSilenceSlider.value)
      );
    } else {
      onsets = detectBeats(
        originalBuffer,
        parseInt(bpmSlider.value),
        parseInt(beatsPerSliceSlider.value)
      );
    }

    progressFill.style.width = '30%';
    progressText.textContent = `找到 ${onsets.length} 個切片點...`;
    await new Promise(resolve => setTimeout(resolve, 50));

    // 建立切片
    slices = [];
    const duration = originalBuffer.duration;

    for (let i = 0; i < onsets.length; i++) {
      const start = onsets[i];
      const end = i < onsets.length - 1 ? onsets[i + 1] : duration;

      slices.push({
        index: i + 1,
        start: start,
        end: end,
        duration: end - start
      });
    }

    progressFill.style.width = '50%';
    progressText.textContent = '正在生成切片...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 生成切片音訊
    sliceBlobs = [];
    const fadeMs = parseInt(fadeTimeSlider.value);
    const fadeSamples = Math.floor(fadeMs / 1000 * originalBuffer.sampleRate);

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const blob = createSliceBlob(slice, fadeSamples);
      sliceBlobs.push(blob);

      progressFill.style.width = `${50 + (i / slices.length) * 40}%`;
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    progressFill.style.width = '100%';
    progressText.textContent = '處理完成！';

    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 顯示結果
    showResults(processingTime);
    drawSliceMarkers();

  } catch (error) {
    console.error('處理錯誤:', error);
    alert('處理過程發生錯誤: ' + error.message);
    progressContainer.classList.remove('show');
  }

  analyzeBtn.disabled = false;
}

/**
 * 建立切片 Blob
 */
function createSliceBlob(slice, fadeSamples) {
  const sampleRate = originalBuffer.sampleRate;
  const numberOfChannels = originalBuffer.numberOfChannels;

  const startSample = Math.floor(slice.start * sampleRate);
  const endSample = Math.floor(slice.end * sampleRate);
  const length = endSample - startSample;

  // 編碼 WAV
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 寫入音訊資料
  let offset = 44;
  for (let i = 0; i < length; i++) {
    // 計算淡入淡出增益
    let gain = 1;
    if (i < fadeSamples) {
      gain = i / fadeSamples;
    } else if (i > length - fadeSamples) {
      gain = (length - i) / fadeSamples;
    }

    for (let ch = 0; ch < numberOfChannels; ch++) {
      const channelData = originalBuffer.getChannelData(ch);
      let sample = channelData[startSample + i] * gain;
      sample = Math.max(-1, Math.min(1, sample));
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

/**
 * 顯示結果
 */
function showResults(processingTimeStr) {
  sliceCount.textContent = slices.length;

  const totalDuration = slices.reduce((sum, s) => sum + s.duration, 0);
  const avg = totalDuration / slices.length;
  avgDuration.textContent = avg.toFixed(2) + 's';

  processTime.textContent = processingTimeStr + 's';

  // 建立切片列表
  sliceList.innerHTML = '';
  slices.forEach((slice, index) => {
    const item = document.createElement('div');
    item.className = 'slice-item';
    item.innerHTML = `
      <div class="slice-number">${slice.index}</div>
      <div class="slice-info">
        <div class="slice-time">${formatTime(slice.start)} - ${formatTime(slice.end)}</div>
        <div class="slice-duration">長度: ${slice.duration.toFixed(3)}s</div>
      </div>
      <div class="slice-actions">
        <button class="slice-btn" onclick="playSlice(${index})">播放</button>
        <button class="slice-btn download" onclick="downloadSlice(${index})">下載</button>
      </div>
    `;
    sliceList.appendChild(item);
  });

  downloadAllBtn.classList.add('show');
  resultPanel.classList.add('show');
}

/**
 * 格式化時間
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

/**
 * 播放切片
 */
window.playSlice = async function(index) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const blob = sliceBlobs[index];
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
};

/**
 * 下載切片
 */
window.downloadSlice = function(index) {
  const blob = sliceBlobs[index];
  const slice = slices[index];
  const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
  const downloadName = `${baseName}_slice_${String(index + 1).padStart(3, '0')}.wav`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 下載全部 (建立簡單的多檔下載)
 */
async function downloadAll() {
  const baseName = originalFile.name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < sliceBlobs.length; i++) {
    const downloadName = `${baseName}_slice_${String(i + 1).padStart(3, '0')}.wav`;
    const url = URL.createObjectURL(sliceBlobs[i]);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);

    // 延遲以避免瀏覽器阻擋
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 重置
 */
function reset() {
  originalBuffer = null;
  originalFile = null;
  slices = [];
  sliceBlobs = [];

  fileInfo.classList.remove('show');
  waveformContainer.style.display = 'none';
  progressContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  downloadAllBtn.classList.remove('show');

  analyzeBtn.disabled = true;
  fileInput.value = '';
  sliceList.innerHTML = '';
}

// 啟動
init();
