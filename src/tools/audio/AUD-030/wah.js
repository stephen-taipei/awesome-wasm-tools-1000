/**
 * AUD-030 音頻哇音效果 - Audio Wah
 * 使用 Web Audio API 解碼，純 JavaScript 處理哇音效果
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const modeSelector = document.getElementById('modeSelector');
const modeBtns = modeSelector.querySelectorAll('.mode-btn');

const freqLowSlider = document.getElementById('freqLow');
const freqLowValue = document.getElementById('freqLowValue');
const freqHighSlider = document.getElementById('freqHigh');
const freqHighValue = document.getElementById('freqHighValue');
const resonanceSlider = document.getElementById('resonance');
const resonanceValue = document.getElementById('resonanceValue');
const sensitivitySlider = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const attackSlider = document.getElementById('attack');
const attackValue = document.getElementById('attackValue');
const releaseSlider = document.getElementById('release');
const releaseValue = document.getElementById('releaseValue');
const lfoRateSlider = document.getElementById('lfoRate');
const lfoRateValue = document.getElementById('lfoRateValue');
const wetDrySlider = document.getElementById('wetDry');
const wetDryValue = document.getElementById('wetDryValue');

const envelopeSettings = document.getElementById('envelopeSettings');
const lfoSettings = document.getElementById('lfoSettings');

const presetButtons = document.getElementById('presetButtons');
const presetBtns = presetButtons.querySelectorAll('.preset-btn');

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
const resultFreqRange = document.getElementById('resultFreqRange');
const resultResonance = document.getElementById('resultResonance');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;
let currentMode = 'auto';

// 模式名稱對照
const modeNames = {
  auto: '自動哇音',
  lfo: 'LFO 掃頻'
};

// 預設值
const presets = {
  subtle: {
    mode: 'auto',
    freqLow: 400,
    freqHigh: 1500,
    resonance: 3,
    sensitivity: 50,
    attack: 20,
    release: 150,
    lfoRate: 1,
    wetDry: 80
  },
  classic: {
    mode: 'auto',
    freqLow: 300,
    freqHigh: 2000,
    resonance: 5,
    sensitivity: 70,
    attack: 10,
    release: 100,
    lfoRate: 1,
    wetDry: 100
  },
  funky: {
    mode: 'auto',
    freqLow: 350,
    freqHigh: 2500,
    resonance: 8,
    sensitivity: 90,
    attack: 5,
    release: 80,
    lfoRate: 1,
    wetDry: 100
  },
  vocal: {
    mode: 'lfo',
    freqLow: 400,
    freqHigh: 1800,
    resonance: 10,
    sensitivity: 70,
    attack: 10,
    release: 100,
    lfoRate: 0.5,
    wetDry: 100
  },
  slow: {
    mode: 'lfo',
    freqLow: 300,
    freqHigh: 2000,
    resonance: 6,
    sensitivity: 70,
    attack: 10,
    release: 100,
    lfoRate: 0.3,
    wetDry: 100
  }
};

// 初始化
function init() {
  setupEventListeners();
  updateSliderDisplays();
  updateModeUI();
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
  freqLowSlider.addEventListener('input', updateSliderDisplays);
  freqHighSlider.addEventListener('input', updateSliderDisplays);
  resonanceSlider.addEventListener('input', updateSliderDisplays);
  sensitivitySlider.addEventListener('input', updateSliderDisplays);
  attackSlider.addEventListener('input', updateSliderDisplays);
  releaseSlider.addEventListener('input', updateSliderDisplays);
  lfoRateSlider.addEventListener('input', updateSliderDisplays);
  wetDrySlider.addEventListener('input', updateSliderDisplays);

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

// 更新模式 UI
function updateModeUI() {
  if (currentMode === 'auto') {
    envelopeSettings.classList.remove('hide');
    lfoSettings.classList.remove('show');
  } else {
    envelopeSettings.classList.add('hide');
    lfoSettings.classList.add('show');
  }
}

// 更新滑桿顯示值
function updateSliderDisplays() {
  freqLowValue.textContent = `${freqLowSlider.value} Hz`;
  freqHighValue.textContent = `${freqHighSlider.value} Hz`;
  resonanceValue.textContent = resonanceSlider.value;
  sensitivityValue.textContent = `${sensitivitySlider.value}%`;
  attackValue.textContent = `${attackSlider.value} ms`;
  releaseValue.textContent = `${releaseSlider.value} ms`;
  lfoRateValue.textContent = `${lfoRateSlider.value} Hz`;
  wetDryValue.textContent = `${wetDrySlider.value}%`;
}

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  // 更新模式選擇
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === preset.mode);
  });
  currentMode = preset.mode;
  updateModeUI();

  // 更新滑桿
  freqLowSlider.value = preset.freqLow;
  freqHighSlider.value = preset.freqHigh;
  resonanceSlider.value = preset.resonance;
  sensitivitySlider.value = preset.sensitivity;
  attackSlider.value = preset.attack;
  releaseSlider.value = preset.release;
  lfoRateSlider.value = preset.lfoRate;
  wetDrySlider.value = preset.wetDry;

  updateSliderDisplays();
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
    // 建立 AudioContext
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 讀取並解碼音訊
    const arrayBuffer = await file.arrayBuffer();
    originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 顯示檔案資訊
    const duration = originalBuffer.duration;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    fileDuration.textContent = `時長: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    fileSampleRate.textContent = `取樣率: ${originalBuffer.sampleRate} Hz`;
    fileChannels.textContent = `聲道: ${originalBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道'}`;

    fileInfo.classList.add('show');
    processBtn.disabled = false;

    // 設定原始音訊預覽
    originalPreview.src = URL.createObjectURL(file);

  } catch (error) {
    console.error('音訊解碼錯誤:', error);
    alert('無法解碼音訊檔案，請確認檔案格式正確');
  }
}

/**
 * 帶通濾波器
 * 使用二階 IIR 濾波器（Biquad）
 */
class BandPassFilter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.b0 = 0;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  setParams(frequency, q) {
    const omega = 2 * Math.PI * frequency / this.sampleRate;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2 * q);

    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = -2 * cosOmega / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(input) {
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                  - this.a1 * this.y1 - this.a2 * this.y2;

    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;

    return output;
  }

  reset() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}

/**
 * 包絡跟隨器
 */
class EnvelopeFollower {
  constructor(sampleRate, attackMs, releaseMs) {
    this.sampleRate = sampleRate;
    this.attackCoeff = Math.exp(-1 / (sampleRate * attackMs / 1000));
    this.releaseCoeff = Math.exp(-1 / (sampleRate * releaseMs / 1000));
    this.envelope = 0;
  }

  process(input) {
    const absInput = Math.abs(input);

    if (absInput > this.envelope) {
      this.envelope = this.attackCoeff * this.envelope + (1 - this.attackCoeff) * absInput;
    } else {
      this.envelope = this.releaseCoeff * this.envelope + (1 - this.releaseCoeff) * absInput;
    }

    return this.envelope;
  }

  reset() {
    this.envelope = 0;
  }
}

/**
 * 套用哇音效果
 */
function applyWah(buffer, options) {
  const {
    mode,
    freqLow,
    freqHigh,
    resonance,
    sensitivity,
    attackMs,
    releaseMs,
    lfoRate,
    wetPercent,
    sampleRate
  } = options;

  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;

  // 建立輸出緩衝區
  const outputChannels = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    outputChannels.push(new Float32Array(length));
  }

  const wetMix = wetPercent / 100;
  const dryMix = 1 - wetMix;
  const freqRange = freqHigh - freqLow;
  const sens = sensitivity / 100;

  // 為每個聲道建立濾波器和包絡跟隨器
  const filters = [];
  const envelopes = [];

  for (let ch = 0; ch < numberOfChannels; ch++) {
    filters.push(new BandPassFilter(sampleRate));
    envelopes.push(new EnvelopeFollower(sampleRate, attackMs, releaseMs));
  }

  // LFO 相位
  let lfoPhase = 0;
  const lfoIncrement = (2 * Math.PI * lfoRate) / sampleRate;

  // 處理每個樣本
  for (let i = 0; i < length; i++) {
    // 計算調製值
    let modValue;

    if (mode === 'lfo') {
      // LFO 模式: 使用正弦波
      modValue = (Math.sin(lfoPhase) + 1) * 0.5;
      lfoPhase += lfoIncrement;
    }

    for (let ch = 0; ch < numberOfChannels; ch++) {
      const input = buffer.getChannelData(ch)[i];
      const filter = filters[ch];
      const envelope = envelopes[ch];

      if (mode === 'auto') {
        // 自動哇音: 使用包絡跟隨
        const env = envelope.process(input);
        // 將包絡映射到 0-1 範圍（加入靈敏度控制）
        modValue = Math.min(1, env * sens * 10);
      }

      // 計算目標頻率
      const targetFreq = freqLow + modValue * freqRange;

      // 更新濾波器參數
      filter.setParams(targetFreq, resonance);

      // 處理信號
      const wet = filter.process(input);

      // 增加濕訊號的增益以補償濾波器的衰減
      const wetGain = 1 + resonance * 0.2;

      // 混合乾濕訊號
      let output = input * dryMix + wet * wetGain * wetMix;

      // 軟限幅
      if (output > 0.99) {
        output = 0.99 + 0.01 * Math.tanh((output - 0.99) * 10);
      } else if (output < -0.99) {
        output = -0.99 - 0.01 * Math.tanh((-output - 0.99) * 10);
      }

      outputChannels[ch][i] = output;
    }
  }

  return outputChannels;
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

    const sampleRate = originalBuffer.sampleRate;
    const numberOfChannels = originalBuffer.numberOfChannels;
    const length = originalBuffer.length;

    // 取得哇音參數
    const options = {
      mode: currentMode,
      freqLow: parseInt(freqLowSlider.value),
      freqHigh: parseInt(freqHighSlider.value),
      resonance: parseFloat(resonanceSlider.value),
      sensitivity: parseInt(sensitivitySlider.value),
      attackMs: parseInt(attackSlider.value),
      releaseMs: parseInt(releaseSlider.value),
      lfoRate: parseFloat(lfoRateSlider.value),
      wetPercent: parseInt(wetDrySlider.value),
      sampleRate: sampleRate
    };

    progressFill.style.width = '20%';
    progressText.textContent = '套用哇音效果...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 套用哇音效果
    const processedChannels = applyWah(originalBuffer, options);

    progressFill.style.width = '70%';
    progressText.textContent = '正在建立輸出緩衝區...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 建立輸出緩衝區
    const outputBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
    for (let ch = 0; ch < numberOfChannels; ch++) {
      outputBuffer.copyToChannel(processedChannels[ch], ch);
    }

    progressFill.style.width = '80%';
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
      mode: modeNames[currentMode],
      freqRange: `${freqLowSlider.value}-${freqHighSlider.value}`,
      resonance: resonanceSlider.value,
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
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
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

  // 交錯聲道資料
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
  resultFreqRange.textContent = results.freqRange;
  resultResonance.textContent = results.resonance;
  outputSize.textContent = formatFileSize(results.size);
  processTime.textContent = `${results.time}s`;

  // 設定音訊預覽
  const audioUrl = URL.createObjectURL(processedBlob);
  audioPreview.src = audioUrl;

  // 更新下載按鈕
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
  const downloadName = `${originalName}_wah.${ext}`;

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
}

// 啟動
init();
