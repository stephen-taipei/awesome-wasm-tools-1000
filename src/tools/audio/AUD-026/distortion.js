/**
 * AUD-026 音頻失真效果 - Audio Distortion
 * 使用 Web Audio API 解碼，純 JavaScript 處理失真效果
 */

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');

const typeSelector = document.getElementById('typeSelector');
const typeBtns = typeSelector.querySelectorAll('.type-btn');

const driveSlider = document.getElementById('drive');
const driveValue = document.getElementById('driveValue');
const toneSlider = document.getElementById('tone');
const toneValue = document.getElementById('toneValue');
const outputSlider = document.getElementById('output');
const outputValue = document.getElementById('outputValue');
const mixSlider = document.getElementById('mix');
const mixValue = document.getElementById('mixValue');
const bitDepthSlider = document.getElementById('bitDepth');
const bitDepthValue = document.getElementById('bitDepthValue');
const downsampleSlider = document.getElementById('downsample');
const downsampleValue = document.getElementById('downsampleValue');

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
const resultType = document.getElementById('resultType');
const resultDrive = document.getElementById('resultDrive');
const resultMix = document.getElementById('resultMix');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const originalPreview = document.getElementById('originalPreview');
const audioPreview = document.getElementById('audioPreview');

const bitcrushOnlyRows = document.querySelectorAll('.bitcrush-only');

// 狀態變數
let audioContext = null;
let originalBuffer = null;
let processedBlob = null;
let originalFile = null;
let currentType = 'hardClip';

// 預設值
const presets = {
  light: {
    type: 'softClip',
    drive: 25,
    tone: 60,
    output: 80,
    mix: 70
  },
  crunch: {
    type: 'hardClip',
    drive: 50,
    tone: 50,
    output: 70,
    mix: 100
  },
  heavy: {
    type: 'hardClip',
    drive: 80,
    tone: 40,
    output: 60,
    mix: 100
  },
  metal: {
    type: 'fuzz',
    drive: 90,
    tone: 35,
    output: 50,
    mix: 100
  },
  lofi: {
    type: 'bitcrush',
    drive: 30,
    tone: 45,
    output: 75,
    mix: 100,
    bitDepth: 8,
    downsample: 4
  }
};

// 失真類型名稱對照
const typeNames = {
  softClip: '軟削波',
  hardClip: '硬削波',
  overdrive: '過載',
  fuzz: '法茲',
  bitcrush: '位元破碎'
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

  // 失真類型選擇
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      updateBitcrushVisibility();
    });
  });

  // 滑桿
  driveSlider.addEventListener('input', updateSliderDisplays);
  toneSlider.addEventListener('input', updateSliderDisplays);
  outputSlider.addEventListener('input', updateSliderDisplays);
  mixSlider.addEventListener('input', updateSliderDisplays);
  bitDepthSlider.addEventListener('input', updateSliderDisplays);
  downsampleSlider.addEventListener('input', updateSliderDisplays);

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

// 更新位元破碎設定的可見性
function updateBitcrushVisibility() {
  const show = currentType === 'bitcrush';
  bitcrushOnlyRows.forEach(row => {
    row.style.display = show ? 'flex' : 'none';
  });
}

// 更新滑桿顯示值
function updateSliderDisplays() {
  driveValue.textContent = `${driveSlider.value}%`;
  toneValue.textContent = `${toneSlider.value}%`;
  outputValue.textContent = `${outputSlider.value}%`;
  mixValue.textContent = `${mixSlider.value}%`;
  bitDepthValue.textContent = `${bitDepthSlider.value} bit`;
  downsampleValue.textContent = `${downsampleSlider.value}x`;
}

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  // 更新失真類型
  typeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === preset.type);
  });
  currentType = preset.type;
  updateBitcrushVisibility();

  // 更新滑桿
  driveSlider.value = preset.drive;
  toneSlider.value = preset.tone;
  outputSlider.value = preset.output;
  mixSlider.value = preset.mix;

  if (preset.bitDepth) {
    bitDepthSlider.value = preset.bitDepth;
  }
  if (preset.downsample) {
    downsampleSlider.value = preset.downsample;
  }

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

// 軟削波失真
function softClip(sample, drive) {
  const gain = 1 + drive * 10;
  const x = sample * gain;
  // Tanh-based soft clipping
  return Math.tanh(x);
}

// 硬削波失真
function hardClip(sample, drive) {
  const gain = 1 + drive * 10;
  const x = sample * gain;
  const threshold = 1 - drive * 0.5;
  return Math.max(-threshold, Math.min(threshold, x)) / threshold;
}

// 過載效果 (非對稱削波)
function overdrive(sample, drive) {
  const gain = 1 + drive * 8;
  let x = sample * gain;

  // Asymmetric clipping
  if (x > 0) {
    x = 1 - Math.exp(-x);
  } else {
    x = -1 + Math.exp(x);
  }

  // Add some even harmonics
  const k = 2 * drive;
  x = x + k * x * x * Math.sign(x);

  return Math.tanh(x);
}

// 法茲效果 (極端飽和)
function fuzz(sample, drive) {
  const gain = 1 + drive * 20;
  let x = sample * gain;

  // Extreme saturation with hard edges
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);

  // Exponential saturation
  x = sign * (1 - Math.exp(-abs * 3));

  // Add grit
  if (Math.abs(x) > 0.5) {
    x = Math.sign(x) * (0.5 + 0.5 * Math.tanh((Math.abs(x) - 0.5) * 10));
  }

  // Square wave tendency at high drive
  const squareAmount = drive * 0.5;
  x = x * (1 - squareAmount) + Math.sign(x) * squareAmount;

  return x;
}

// 位元破碎效果
function bitcrush(sample, bitDepthVal, downsampleFactor, sampleIndex, lastSample) {
  // Bit reduction
  const levels = Math.pow(2, bitDepthVal);
  let crushed = Math.round(sample * levels) / levels;

  // Sample rate reduction (return last sample if not at downsample point)
  if (sampleIndex % downsampleFactor !== 0) {
    return lastSample;
  }

  return crushed;
}

// 音色濾波器 (單極低通/高通混合)
function applyToneFilter(data, tonePercent, sampleRate) {
  // Tone: 0 = more bass (low pass), 100 = more treble (high pass)
  const tone = tonePercent / 100;

  // Low pass for bass
  const lpCutoff = 500 + tone * 8000; // 500Hz to 8500Hz
  const lpAlpha = Math.exp(-2 * Math.PI * lpCutoff / sampleRate);

  // High pass for treble presence
  const hpCutoff = 50 + (1 - tone) * 200; // 50Hz to 250Hz
  const hpAlpha = Math.exp(-2 * Math.PI * hpCutoff / sampleRate);

  let lpPrev = 0;
  let hpPrev = 0;
  let hpPrevInput = 0;

  for (let i = 0; i < data.length; i++) {
    const input = data[i];

    // Low pass
    lpPrev = lpPrev + (1 - lpAlpha) * (input - lpPrev);

    // High pass
    const hpOut = hpAlpha * (hpPrev + input - hpPrevInput);
    hpPrev = hpOut;
    hpPrevInput = input;

    // Mix based on tone
    data[i] = lpPrev * (1 - tone * 0.3) + hpOut * tone * 0.3;
  }

  return data;
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

    // 取得失真參數
    const drive = parseInt(driveSlider.value) / 100;
    const tonePercent = parseInt(toneSlider.value);
    const outputGain = parseInt(outputSlider.value) / 100;
    const mixAmount = parseInt(mixSlider.value) / 100;
    const bitDepthVal = parseInt(bitDepthSlider.value);
    const downsampleFactor = parseInt(downsampleSlider.value);

    // 建立輸出緩衝區
    const outputBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

    // 處理每個聲道
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const inputData = originalBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);

      // 複製原始資料
      const dryData = new Float32Array(inputData);
      const wetData = new Float32Array(length);

      // 套用失真
      let lastSample = 0;
      for (let i = 0; i < length; i++) {
        let sample = inputData[i];
        let distorted;

        switch (currentType) {
          case 'softClip':
            distorted = softClip(sample, drive);
            break;
          case 'hardClip':
            distorted = hardClip(sample, drive);
            break;
          case 'overdrive':
            distorted = overdrive(sample, drive);
            break;
          case 'fuzz':
            distorted = fuzz(sample, drive);
            break;
          case 'bitcrush':
            // Apply some drive before bitcrushing
            sample = softClip(sample, drive * 0.5);
            distorted = bitcrush(sample, bitDepthVal, downsampleFactor, i, lastSample);
            lastSample = distorted;
            break;
          default:
            distorted = hardClip(sample, drive);
        }

        wetData[i] = distorted;

        // 更新進度
        if (i % 100000 === 0) {
          const progress = ((channel * length + i) / (numberOfChannels * length)) * 60;
          progressFill.style.width = `${progress}%`;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      progressText.textContent = '正在套用音色濾波...';

      // 套用音色濾波
      applyToneFilter(wetData, tonePercent, sampleRate);

      progressText.textContent = '正在混合輸出...';

      // 混合乾濕信號並套用輸出增益
      for (let i = 0; i < length; i++) {
        let mixed = dryData[i] * (1 - mixAmount) + wetData[i] * mixAmount;
        mixed *= outputGain;

        // 軟限幅防止削波
        if (mixed > 0.99) {
          mixed = 0.99 + (1 - 0.99) * Math.tanh((mixed - 0.99) * 10);
        } else if (mixed < -0.99) {
          mixed = -0.99 + (-1 + 0.99) * Math.tanh((mixed + 0.99) * 10);
        }

        outputData[i] = mixed;
      }

      progressFill.style.width = `${60 + (channel + 1) / numberOfChannels * 20}%`;
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
      type: typeNames[currentType],
      drive: driveSlider.value,
      mix: mixSlider.value,
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
  resultType.textContent = results.type;
  resultDrive.textContent = `${results.drive}%`;
  resultMix.textContent = `${results.mix}%`;
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
  const downloadName = `${originalName}_distortion.${ext}`;

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
