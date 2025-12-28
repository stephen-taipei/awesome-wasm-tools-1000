/**
 * AUD-027 音頻相位器 - Audio Phaser
 * 使用 Web Audio API 解碼，純 JavaScript 處理相位器效果
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const rateSlider = document.getElementById('rate');
const rateValue = document.getElementById('rateValue');
const depthSlider = document.getElementById('depth');
const depthValue = document.getElementById('depthValue');
const feedbackSlider = document.getElementById('feedback');
const feedbackValue = document.getElementById('feedbackValue');
const stagesSlider = document.getElementById('stages');
const stagesValue = document.getElementById('stagesValue');
const baseFreqSlider = document.getElementById('baseFreq');
const baseFreqValue = document.getElementById('baseFreqValue');
const wetDrySlider = document.getElementById('wetDry');
const wetDryValue = document.getElementById('wetDryValue');
const stereoPhaseSlider = document.getElementById('stereoPhase');
const stereoPhaseValue = document.getElementById('stereoPhaseValue');

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
const resultRate = document.getElementById('resultRate');
const resultStages = document.getElementById('resultStages');
const resultFeedback = document.getElementById('resultFeedback');
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
  subtle: {
    rate: 0.3,
    depth: 40,
    feedback: 20,
    stages: 4,
    baseFreq: 500,
    wetDry: 30,
    stereoPhase: 45
  },
  classic: {
    rate: 0.5,
    depth: 70,
    feedback: 50,
    stages: 6,
    baseFreq: 400,
    wetDry: 50,
    stereoPhase: 90
  },
  deep: {
    rate: 0.2,
    depth: 90,
    feedback: 70,
    stages: 8,
    baseFreq: 300,
    wetDry: 60,
    stereoPhase: 120
  },
  space: {
    rate: 1.5,
    depth: 100,
    feedback: 80,
    stages: 10,
    baseFreq: 600,
    wetDry: 70,
    stereoPhase: 180
  },
  rotary: {
    rate: 5,
    depth: 60,
    feedback: 40,
    stages: 6,
    baseFreq: 800,
    wetDry: 45,
    stereoPhase: 60
  }
};

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

  // 滑桿
  rateSlider.addEventListener('input', updateSliderDisplays);
  depthSlider.addEventListener('input', updateSliderDisplays);
  feedbackSlider.addEventListener('input', updateSliderDisplays);
  stagesSlider.addEventListener('input', updateSliderDisplays);
  baseFreqSlider.addEventListener('input', updateSliderDisplays);
  wetDrySlider.addEventListener('input', updateSliderDisplays);
  stereoPhaseSlider.addEventListener('input', updateSliderDisplays);

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

// 更新滑桿顯示值
function updateSliderDisplays() {
  rateValue.textContent = `${rateSlider.value} Hz`;
  depthValue.textContent = `${depthSlider.value}%`;
  feedbackValue.textContent = `${feedbackSlider.value}%`;
  stagesValue.textContent = stagesSlider.value;
  baseFreqValue.textContent = `${baseFreqSlider.value} Hz`;
  wetDryValue.textContent = `${wetDrySlider.value}%`;
  stereoPhaseValue.textContent = `${stereoPhaseSlider.value}°`;
}

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  rateSlider.value = preset.rate;
  depthSlider.value = preset.depth;
  feedbackSlider.value = preset.feedback;
  stagesSlider.value = preset.stages;
  baseFreqSlider.value = preset.baseFreq;
  wetDrySlider.value = preset.wetDry;
  stereoPhaseSlider.value = preset.stereoPhase;

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
 * 一階全通濾波器
 * 產生頻率相關的相位偏移
 */
class AllPassFilter {
  constructor() {
    this.a1 = 0;
    this.zm1 = 0;
  }

  // 設定截止頻率
  setFrequency(frequency, sampleRate) {
    const pf = frequency / sampleRate;
    this.a1 = (1.0 - pf) / (1.0 + pf);
  }

  // 處理單一樣本
  process(input) {
    const output = this.a1 * input + this.zm1;
    this.zm1 = input - this.a1 * output;
    return output;
  }

  // 重置狀態
  reset() {
    this.zm1 = 0;
  }
}

/**
 * 相位器處理
 */
function applyPhaser(buffer, options) {
  const {
    rateHz,
    depthPercent,
    feedbackPercent,
    numStages,
    baseFreq,
    wetPercent,
    stereoPhaseOffset,
    sampleRate
  } = options;

  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;

  // 建立輸出緩衝區
  const outputChannels = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    outputChannels.push(new Float32Array(length));
  }

  // LFO 參數
  const lfoIncrement = (2 * Math.PI * rateHz) / sampleRate;

  // 頻率範圍（基於基礎頻率的調製範圍）
  const minFreq = Math.max(baseFreq * 0.2, 50);
  const maxFreq = Math.min(baseFreq * 5, sampleRate * 0.4);
  const freqRange = maxFreq - minFreq;
  const depth = depthPercent / 100;
  const feedback = feedbackPercent / 100;
  const wetMix = wetPercent / 100;
  const dryMix = 1 - wetMix;

  // 為每個聲道建立濾波器陣列
  const filtersPerChannel = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const filters = [];
    for (let s = 0; s < numStages; s++) {
      filters.push(new AllPassFilter());
    }
    filtersPerChannel.push(filters);
  }

  // 回授樣本
  const feedbackSamples = new Float32Array(numberOfChannels);

  // 立體聲相位偏移（弧度）
  const stereoOffset = (stereoPhaseOffset / 180) * Math.PI;

  // 處理每個樣本
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const input = buffer.getChannelData(ch)[i];
      const filters = filtersPerChannel[ch];

      // 計算 LFO 值（加入立體聲相位偏移）
      const phaseOffset = ch === 1 ? stereoOffset : 0;
      const lfoPhase = i * lfoIncrement + phaseOffset;
      const lfoValue = (Math.sin(lfoPhase) + 1) * 0.5; // 0 到 1

      // 計算調製頻率
      const modulatedFreq = minFreq + lfoValue * freqRange * depth;

      // 設定所有濾波器的頻率
      for (let s = 0; s < numStages; s++) {
        // 每個階段的頻率略有不同，創造更豐富的效果
        const stageOffset = (s / numStages) * 0.5;
        const stageFreq = modulatedFreq * (1 + stageOffset);
        filters[s].setFrequency(Math.min(stageFreq, sampleRate * 0.4), sampleRate);
      }

      // 處理信號通過所有全通濾波器
      let processed = input + feedbackSamples[ch] * feedback;

      // 限制回授信號以防止發散
      processed = Math.max(-1, Math.min(1, processed));

      for (let s = 0; s < numStages; s++) {
        processed = filters[s].process(processed);
      }

      // 保存回授樣本
      feedbackSamples[ch] = processed;

      // 混合乾濕信號
      let output = input * dryMix + processed * wetMix;

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

    // 取得相位器參數
    const options = {
      rateHz: parseFloat(rateSlider.value),
      depthPercent: parseInt(depthSlider.value),
      feedbackPercent: parseInt(feedbackSlider.value),
      numStages: parseInt(stagesSlider.value),
      baseFreq: parseInt(baseFreqSlider.value),
      wetPercent: parseInt(wetDrySlider.value),
      stereoPhaseOffset: parseInt(stereoPhaseSlider.value),
      sampleRate: sampleRate
    };

    progressFill.style.width = '10%';
    progressText.textContent = '套用相位器效果...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 套用相位器效果
    const processedChannels = applyPhaser(originalBuffer, options);

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
      rate: rateSlider.value,
      stages: stagesSlider.value,
      feedback: feedbackSlider.value,
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
  resultRate.textContent = `${results.rate} Hz`;
  resultStages.textContent = results.stages;
  resultFeedback.textContent = `${results.feedback}%`;
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
  const downloadName = `${originalName}_phaser.${ext}`;

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
