/**
 * AUD-028 風聲噪音生成器 - Wind Noise Generator
 * 使用濾波噪音和調製技術生成逼真風聲
 */

// DOM 元素
const visualizer = document.getElementById('visualizer');
const intensitySlider = document.getElementById('intensity');
const intensityValue = document.getElementById('intensityValue');
const gustinessSlider = document.getElementById('gustiness');
const gustinessValue = document.getElementById('gustinessValue');
const gustFreqSlider = document.getElementById('gustFreq');
const gustFreqValue = document.getElementById('gustFreqValue');
const lowRumbleSlider = document.getElementById('lowRumble');
const lowRumbleValue = document.getElementById('lowRumbleValue');
const highWhistleSlider = document.getElementById('highWhistle');
const highWhistleValue = document.getElementById('highWhistleValue');
const stereoWidthSlider = document.getElementById('stereoWidth');
const stereoWidthValue = document.getElementById('stereoWidthValue');
const durationInput = document.getElementById('duration');

const presetButtons = document.getElementById('presetButtons');
const presetBtns = presetButtons.querySelectorAll('.preset-btn');

const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const sampleRateSelect = document.getElementById('sampleRate');

const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');

const resultPanel = document.getElementById('resultPanel');
const resultDuration = document.getElementById('resultDuration');
const resultIntensity = document.getElementById('resultIntensity');
const resultGustiness = document.getElementById('resultGustiness');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// 狀態變數
let audioContext = null;
let processedBlob = null;
let isPreviewPlaying = false;
let previewSource = null;
let animationId = null;

// 視覺化相關
const ctx = visualizer.getContext('2d');
let visualizerData = new Float32Array(128);

// 預設值
const presets = {
  breeze: {
    intensity: 25,
    gustiness: 15,
    gustFreq: 2,
    lowRumble: 20,
    highWhistle: 15,
    stereoWidth: 70
  },
  moderate: {
    intensity: 50,
    gustiness: 30,
    gustFreq: 5,
    lowRumble: 40,
    highWhistle: 30,
    stereoWidth: 80
  },
  strong: {
    intensity: 75,
    gustiness: 50,
    gustFreq: 8,
    lowRumble: 60,
    highWhistle: 45,
    stereoWidth: 90
  },
  storm: {
    intensity: 95,
    gustiness: 80,
    gustFreq: 12,
    lowRumble: 80,
    highWhistle: 60,
    stereoWidth: 100
  },
  howling: {
    intensity: 70,
    gustiness: 40,
    gustFreq: 3,
    lowRumble: 30,
    highWhistle: 85,
    stereoWidth: 85
  }
};

// 初始化
function init() {
  setupEventListeners();
  updateSliderDisplays();
  initVisualizer();
}

// 設定事件監聽器
function setupEventListeners() {
  // 滑桿
  intensitySlider.addEventListener('input', updateSliderDisplays);
  gustinessSlider.addEventListener('input', updateSliderDisplays);
  gustFreqSlider.addEventListener('input', updateSliderDisplays);
  lowRumbleSlider.addEventListener('input', updateSliderDisplays);
  highWhistleSlider.addEventListener('input', updateSliderDisplays);
  stereoWidthSlider.addEventListener('input', updateSliderDisplays);

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
  previewBtn.addEventListener('click', previewWind);
  generateBtn.addEventListener('click', generateWind);
  downloadBtn.addEventListener('click', downloadAudio);
  resetBtn.addEventListener('click', reset);
}

// 更新滑桿顯示值
function updateSliderDisplays() {
  intensityValue.textContent = `${intensitySlider.value}%`;
  gustinessValue.textContent = `${gustinessSlider.value}%`;
  gustFreqValue.textContent = `${gustFreqSlider.value} Hz`;
  lowRumbleValue.textContent = `${lowRumbleSlider.value}%`;
  highWhistleValue.textContent = `${highWhistleSlider.value}%`;
  stereoWidthValue.textContent = `${stereoWidthSlider.value}%`;
}

// 套用預設
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  intensitySlider.value = preset.intensity;
  gustinessSlider.value = preset.gustiness;
  gustFreqSlider.value = preset.gustFreq;
  lowRumbleSlider.value = preset.lowRumble;
  highWhistleSlider.value = preset.highWhistle;
  stereoWidthSlider.value = preset.stereoWidth;

  updateSliderDisplays();
}

// 初始化視覺化
function initVisualizer() {
  visualizer.width = visualizer.offsetWidth * 2;
  visualizer.height = visualizer.offsetHeight * 2;
  ctx.scale(2, 2);
  drawVisualizer();
}

// 繪製視覺化
function drawVisualizer() {
  const width = visualizer.offsetWidth;
  const height = visualizer.offsetHeight;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = width / visualizerData.length;
  let x = 0;

  for (let i = 0; i < visualizerData.length; i++) {
    const v = visualizerData[i] * 0.5 + 0.5;
    const y = v * height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.stroke();
}

// 更新視覺化資料
function updateVisualizerData(buffer, offset) {
  const step = Math.floor(buffer.length / visualizerData.length);
  for (let i = 0; i < visualizerData.length; i++) {
    const idx = (offset + i * step) % buffer.length;
    visualizerData[i] = buffer[idx];
  }
  drawVisualizer();
}

/**
 * 生成風聲
 */
function generateWindBuffer(durationSec, sampleRate, options) {
  const {
    intensity,
    gustiness,
    gustFreq,
    lowRumble,
    highWhistle,
    stereoWidth
  } = options;

  const length = Math.floor(durationSec * sampleRate);
  const leftChannel = new Float32Array(length);
  const rightChannel = new Float32Array(length);

  // 基礎參數
  const baseVolume = intensity / 100;
  const gustAmount = gustiness / 100;
  const gustFrequency = gustFreq;
  const rumbleAmount = lowRumble / 100;
  const whistleAmount = highWhistle / 100;
  const stereoAmount = stereoWidth / 100;

  // 粉紅噪音生成器狀態（每個聲道獨立）
  const pinkL = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 };
  const pinkR = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 };

  // 低通濾波器狀態
  let lowPassL = 0, lowPassR = 0;
  let highPassL = 0, highPassR = 0;
  let prevInputL = 0, prevInputR = 0;

  // 陣風 LFO 相位
  let gustPhase = 0;
  let gustPhase2 = Math.PI * 0.7; // 第二個 LFO 用於更自然的變化
  let gustPhase3 = Math.PI * 0.3;

  // 低頻共鳴濾波器
  let resonanceL = 0, resonanceR = 0;

  // 高頻嘯音濾波器
  let whistleFilterL = 0, whistleFilterR = 0;

  for (let i = 0; i < length; i++) {
    // 生成白噪音
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // 轉換為粉紅噪音（Paul Kellet's refined method）
    pinkL.b0 = 0.99886 * pinkL.b0 + whiteL * 0.0555179;
    pinkL.b1 = 0.99332 * pinkL.b1 + whiteL * 0.0750759;
    pinkL.b2 = 0.96900 * pinkL.b2 + whiteL * 0.1538520;
    pinkL.b3 = 0.86650 * pinkL.b3 + whiteL * 0.3104856;
    pinkL.b4 = 0.55000 * pinkL.b4 + whiteL * 0.5329522;
    pinkL.b5 = -0.7616 * pinkL.b5 - whiteL * 0.0168980;
    const pinkNoiseL = (pinkL.b0 + pinkL.b1 + pinkL.b2 + pinkL.b3 + pinkL.b4 + pinkL.b5 + pinkL.b6 + whiteL * 0.5362) * 0.11;
    pinkL.b6 = whiteL * 0.115926;

    pinkR.b0 = 0.99886 * pinkR.b0 + whiteR * 0.0555179;
    pinkR.b1 = 0.99332 * pinkR.b1 + whiteR * 0.0750759;
    pinkR.b2 = 0.96900 * pinkR.b2 + whiteR * 0.1538520;
    pinkR.b3 = 0.86650 * pinkR.b3 + whiteR * 0.3104856;
    pinkR.b4 = 0.55000 * pinkR.b4 + whiteR * 0.5329522;
    pinkR.b5 = -0.7616 * pinkR.b5 - whiteR * 0.0168980;
    const pinkNoiseR = (pinkR.b0 + pinkR.b1 + pinkR.b2 + pinkR.b3 + pinkR.b4 + pinkR.b5 + pinkR.b6 + whiteR * 0.5362) * 0.11;
    pinkR.b6 = whiteR * 0.115926;

    // 計算陣風調製（多個 LFO 疊加）
    const gustMod1 = (Math.sin(gustPhase) + 1) * 0.5;
    const gustMod2 = (Math.sin(gustPhase2 * 0.7) + 1) * 0.5;
    const gustMod3 = (Math.sin(gustPhase3 * 0.3) + 1) * 0.5;
    const gustMod = (gustMod1 * 0.5 + gustMod2 * 0.3 + gustMod3 * 0.2);
    const gustEnvelope = 1 - gustAmount + gustAmount * gustMod;

    gustPhase += (2 * Math.PI * gustFrequency) / sampleRate;
    gustPhase2 += (2 * Math.PI * gustFrequency * 1.3) / sampleRate;
    gustPhase3 += (2 * Math.PI * gustFrequency * 0.4) / sampleRate;

    // 基礎風聲
    let windL = pinkNoiseL * gustEnvelope;
    let windR = pinkNoiseR * gustEnvelope;

    // 低頻嗡鳴（低通濾波）
    const lpAlpha = 0.995;
    lowPassL = lowPassL * lpAlpha + windL * (1 - lpAlpha);
    lowPassR = lowPassR * lpAlpha + windR * (1 - lpAlpha);

    // 共鳴效果
    const resonanceFreq = 60 + gustMod * 40;
    const resonanceAlpha = Math.exp(-2 * Math.PI * resonanceFreq / sampleRate);
    resonanceL = resonanceL * resonanceAlpha + lowPassL * (1 - resonanceAlpha);
    resonanceR = resonanceR * resonanceAlpha + lowPassR * (1 - resonanceAlpha);

    // 高頻嘯音（帶通濾波）
    const hpAlpha = 0.98;
    highPassL = hpAlpha * (highPassL + windL - prevInputL);
    highPassR = hpAlpha * (highPassR + windR - prevInputR);
    prevInputL = windL;
    prevInputR = windR;

    // 嘯音濾波
    const whistleFreq = 800 + gustMod * 400 + Math.sin(i * 0.001) * 200;
    const whistleAlpha = Math.exp(-2 * Math.PI * whistleFreq / sampleRate);
    whistleFilterL = whistleFilterL * whistleAlpha + highPassL * (1 - whistleAlpha);
    whistleFilterR = whistleFilterR * whistleAlpha + highPassR * (1 - whistleAlpha);

    // 混合各頻段
    let outputL = windL * 0.6;
    let outputR = windR * 0.6;

    // 加入低頻共鳴
    outputL += resonanceL * rumbleAmount * 2;
    outputR += resonanceR * rumbleAmount * 2;

    // 加入高頻嘯音
    outputL += whistleFilterL * whistleAmount * 1.5;
    outputR += whistleFilterR * whistleAmount * 1.5;

    // 立體聲寬度處理
    const mid = (outputL + outputR) * 0.5;
    const side = (outputL - outputR) * 0.5;
    outputL = mid + side * stereoAmount;
    outputR = mid - side * stereoAmount;

    // 加入少量獨立噪音增加立體感
    outputL += (Math.random() * 2 - 1) * 0.02 * stereoAmount;
    outputR += (Math.random() * 2 - 1) * 0.02 * stereoAmount;

    // 套用基礎音量
    outputL *= baseVolume;
    outputR *= baseVolume;

    // 軟限幅
    outputL = Math.tanh(outputL * 1.5) * 0.9;
    outputR = Math.tanh(outputR * 1.5) * 0.9;

    leftChannel[i] = outputL;
    rightChannel[i] = outputR;
  }

  return { left: leftChannel, right: rightChannel };
}

// 預覽風聲
async function previewWind() {
  if (isPreviewPlaying) {
    stopPreview();
    return;
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const sampleRate = audioContext.sampleRate;
  const options = getOptions();

  // 生成 5 秒預覽
  const windData = generateWindBuffer(5, sampleRate, options);

  // 建立 AudioBuffer
  const buffer = audioContext.createBuffer(2, windData.left.length, sampleRate);
  buffer.copyToChannel(windData.left, 0);
  buffer.copyToChannel(windData.right, 1);

  // 播放
  previewSource = audioContext.createBufferSource();
  previewSource.buffer = buffer;
  previewSource.connect(audioContext.destination);
  previewSource.start();

  isPreviewPlaying = true;
  previewBtn.textContent = '停止預覽';

  // 視覺化動畫
  let offset = 0;
  function animate() {
    if (!isPreviewPlaying) return;
    updateVisualizerData(windData.left, offset);
    offset = (offset + 512) % windData.left.length;
    animationId = requestAnimationFrame(animate);
  }
  animate();

  previewSource.onended = () => {
    stopPreview();
  };
}

// 停止預覽
function stopPreview() {
  if (previewSource) {
    try {
      previewSource.stop();
    } catch (e) {}
    previewSource = null;
  }
  isPreviewPlaying = false;
  previewBtn.textContent = '預覽 (5秒)';
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// 取得選項
function getOptions() {
  return {
    intensity: parseInt(intensitySlider.value),
    gustiness: parseInt(gustinessSlider.value),
    gustFreq: parseFloat(gustFreqSlider.value),
    lowRumble: parseInt(lowRumbleSlider.value),
    highWhistle: parseInt(highWhistleSlider.value),
    stereoWidth: parseInt(stereoWidthSlider.value)
  };
}

// 生成風聲
async function generateWind() {
  stopPreview();

  const startTime = performance.now();

  generateBtn.disabled = true;
  progressContainer.classList.add('show');
  progressFill.style.width = '0%';
  progressText.textContent = '正在生成風聲...';

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    const sampleRate = parseInt(sampleRateSelect.value);
    const duration = Math.min(Math.max(parseInt(durationInput.value) || 30, 1), 600);
    const options = getOptions();

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    progressFill.style.width = '20%';
    progressText.textContent = '生成噪音資料...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 生成風聲
    const windData = generateWindBuffer(duration, sampleRate, options);

    progressFill.style.width = '60%';
    progressText.textContent = '處理音訊緩衝區...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 建立 AudioBuffer
    const buffer = audioContext.createBuffer(2, windData.left.length, sampleRate);
    buffer.copyToChannel(windData.left, 0);
    buffer.copyToChannel(windData.right, 1);

    progressFill.style.width = '80%';
    progressText.textContent = '正在編碼輸出檔案...';
    await new Promise(resolve => setTimeout(resolve, 50));

    // 編碼輸出
    if (outputFormat.value === 'wav') {
      processedBlob = encodeWAV(buffer);
    } else {
      processedBlob = await encodeMP3(buffer, parseInt(bitrate.value));
    }

    progressFill.style.width = '100%';
    progressText.textContent = '生成完成！';

    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 顯示結果
    showResults({
      duration: duration,
      intensity: intensitySlider.value,
      gustiness: gustinessSlider.value,
      size: processedBlob.size,
      time: processingTime
    });

  } catch (error) {
    console.error('生成錯誤:', error);
    alert('生成過程發生錯誤: ' + error.message);
    progressContainer.classList.remove('show');
  }

  generateBtn.disabled = false;
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
  resultDuration.textContent = `${results.duration}s`;
  resultIntensity.textContent = `${results.intensity}%`;
  resultGustiness.textContent = `${results.gustiness}%`;
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
  const timestamp = new Date().toISOString().slice(0, 10);
  const downloadName = `wind_noise_${timestamp}.${ext}`;

  const url = URL.createObjectURL(processedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
}

// 重置
function reset() {
  stopPreview();
  processedBlob = null;

  progressContainer.classList.remove('show');
  resultPanel.classList.remove('show');
  downloadBtn.classList.remove('show');
  resetBtn.classList.remove('show');

  audioPreview.src = '';
}

// 啟動
init();
