/**
 * AUD-029 音頻顫音效果 - Audio Tremolo
 * 使用 Web Audio API 解碼，純 JavaScript 處理顫音效果
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const waveformSelector = document.getElementById('waveformSelector');
const waveBtns = waveformSelector.querySelectorAll('.wave-btn');

const rateSlider = document.getElementById('rate');
const rateValue = document.getElementById('rateValue');
const depthSlider = document.getElementById('depth');
const depthValue = document.getElementById('depthValue');
const stereoPhaseSlider = document.getElementById('stereoPhase');
const stereoPhaseValue = document.getElementById('stereoPhaseValue');
const wetDrySlider = document.getElementById('wetDry');
const wetDryValue = document.getElementById('wetDryValue');

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
const resultDepth = document.getElementById('resultDepth');
const resultWave = document.getElementById('resultWave');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;
let currentWaveform = 'sine';

// 波形名稱對照
const waveNames = {
  sine: '正弦波',
  triangle: '三角波',
  square: '方波',
  sawtooth: '鋸齒波'
};

// 預設值
const presets = {
  subtle: {
    waveform: 'sine',
    rate: 3,
    depth: 40,
    stereoPhase: 0,
    wetDry: 80
  },
  classic: {
    waveform: 'sine',
    rate: 5,
    depth: 70,
    stereoPhase: 0,
    wetDry: 100
  },
  fast: {
    waveform: 'sine',
    rate: 12,
    depth: 60,
    stereoPhase: 0,
    wetDry: 100
  },
  choppy: {
    waveform: 'square',
    rate: 8,
    depth: 100,
    stereoPhase: 0,
    wetDry: 100
  },
  stereo: {
    waveform: 'sine',
    rate: 4,
    depth: 80,
    stereoPhase: 90,
    wetDry: 100
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

  // 波形選擇
  waveBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      waveBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentWaveform = btn.dataset.wave;
    });
  });

  // 滑桿
  rateSlider.addEventListener('input', updateSliderDisplays);
  depthSlider.addEventListener('input', updateSliderDisplays);
  stereoPhaseSlider.addEventListener('input', updateSliderDisplays);
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

// 更新滑桿顯示值
function updateSliderDisplays() {
  rateValue.textContent = `${rateSlider.value} Hz`;
  depthValue.textContent = `${depthSlider.value}%`;
  stereoPhaseValue.textContent = `${stereoPhaseSlider.value}°`;
  wetDryValue.textContent = `${wetDrySlider.value}%`;
}

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  // 更新波形選擇
  waveBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.wave === preset.waveform);
  });
  currentWaveform = preset.waveform;

  // 更新滑桿
  rateSlider.value = preset.rate;
  depthSlider.value = preset.depth;
  stereoPhaseSlider.value = preset.stereoPhase;
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
 * 生成 LFO 波形值
 * @param {string} waveform - 波形類型
 * @param {number} phase - 相位 (0-1)
 * @returns {number} LFO 值 (0-1)
 */
function getLFOValue(waveform, phase) {
  // 正規化相位到 0-1 範圍
  phase = phase % 1;
  if (phase < 0) phase += 1;

  switch (waveform) {
    case 'sine':
      // 正弦波: 0 到 1 的平滑變化
      return (Math.sin(phase * 2 * Math.PI) + 1) * 0.5;

    case 'triangle':
      // 三角波
      if (phase < 0.5) {
        return phase * 2;
      } else {
        return 1 - (phase - 0.5) * 2;
      }

    case 'square':
      // 方波
      return phase < 0.5 ? 1 : 0;

    case 'sawtooth':
      // 鋸齒波
      return phase;

    default:
      return (Math.sin(phase * 2 * Math.PI) + 1) * 0.5;
  }
}

/**
 * 套用顫音效果
 */
function applyTremolo(buffer, options) {
  const {
    waveform,
    rateHz,
    depthPercent,
    stereoPhaseOffset,
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

  const depth = depthPercent / 100;
  const wetMix = wetPercent / 100;
  const dryMix = 1 - wetMix;
  const phaseOffset = stereoPhaseOffset / 360; // 轉換為 0-1 範圍

  // 計算每個樣本的相位增量
  const phaseIncrement = rateHz / sampleRate;

  // 處理每個聲道
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = outputChannels[ch];

    // 計算此聲道的相位偏移（右聲道加入偏移）
    const channelPhaseOffset = ch === 1 ? phaseOffset : 0;

    for (let i = 0; i < length; i++) {
      // 計算 LFO 相位
      const phase = (i * phaseIncrement + channelPhaseOffset) % 1;

      // 取得 LFO 值 (0-1)
      const lfoValue = getLFOValue(waveform, phase);

      // 計算調製增益
      // 當 LFO 為 0 時，增益為 (1 - depth)
      // 當 LFO 為 1 時，增益為 1
      const modGain = 1 - depth * (1 - lfoValue);

      // 取得輸入樣本
      const input = inputData[i];

      // 計算濕訊號（套用顫音）
      const wet = input * modGain;

      // 混合乾濕訊號
      outputData[i] = input * dryMix + wet * wetMix;
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

    // 取得顫音參數
    const options = {
      waveform: currentWaveform,
      rateHz: parseFloat(rateSlider.value),
      depthPercent: parseInt(depthSlider.value),
      stereoPhaseOffset: parseInt(stereoPhaseSlider.value),
      wetPercent: parseInt(wetDrySlider.value),
      sampleRate: sampleRate
    };

    progressFill.style.width = '20%';
    progressText.textContent = '套用顫音效果...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 套用顫音效果
    const processedChannels = applyTremolo(originalBuffer, options);

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
      depth: depthSlider.value,
      waveform: waveNames[currentWaveform],
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
  resultDepth.textContent = `${results.depth}%`;
  resultWave.textContent = results.waveform;
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
  const downloadName = `${originalName}_tremolo.${ext}`;

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
