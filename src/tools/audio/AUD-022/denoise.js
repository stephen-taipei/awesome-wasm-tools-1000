/**
 * AUD-022 Audio Noise Reduction Tool
 * Reduces background noise using multiple techniques
 * Uses Web Audio API for processing and lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');
const enableGate = document.getElementById('enableGate');
const gateThreshold = document.getElementById('gateThreshold');
const gateThresholdValue = document.getElementById('gateThresholdValue');
const gateRelease = document.getElementById('gateRelease');
const gateReleaseValue = document.getElementById('gateReleaseValue');
const enableHighpass = document.getElementById('enableHighpass');
const highpassFreq = document.getElementById('highpassFreq');
const highpassFreqValue = document.getElementById('highpassFreqValue');
const enableLowpass = document.getElementById('enableLowpass');
const lowpassFreq = document.getElementById('lowpassFreq');
const lowpassFreqValue = document.getElementById('lowpassFreqValue');
const noiseReduction = document.getElementById('noiseReduction');
const noiseReductionValue = document.getElementById('noiseReductionValue');
const smoothing = document.getElementById('smoothing');
const smoothingValue = document.getElementById('smoothingValue');
const presetButtons = document.getElementById('presetButtons');
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
const resultReduction = document.getElementById('resultReduction');
const resultHighpass = document.getElementById('resultHighpass');
const resultLowpass = document.getElementById('resultLowpass');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// State
let audioFile = null;
let audioBuffer = null;
let processedBuffer = null;
let outputBlob = null;

// Presets
const presets = {
  light: {
    enableGate: true, gateThreshold: -60, gateRelease: 150,
    enableHighpass: true, highpassFreq: 50,
    enableLowpass: false, lowpassFreq: 18000,
    noiseReduction: 25, smoothing: 20
  },
  normal: {
    enableGate: true, gateThreshold: -50, gateRelease: 100,
    enableHighpass: true, highpassFreq: 80,
    enableLowpass: false, lowpassFreq: 16000,
    noiseReduction: 50, smoothing: 30
  },
  strong: {
    enableGate: true, gateThreshold: -40, gateRelease: 80,
    enableHighpass: true, highpassFreq: 120,
    enableLowpass: true, lowpassFreq: 12000,
    noiseReduction: 80, smoothing: 50
  },
  voice: {
    enableGate: true, gateThreshold: -45, gateRelease: 100,
    enableHighpass: true, highpassFreq: 100,
    enableLowpass: true, lowpassFreq: 8000,
    noiseReduction: 60, smoothing: 40
  },
  music: {
    enableGate: false, gateThreshold: -60, gateRelease: 200,
    enableHighpass: true, highpassFreq: 30,
    enableLowpass: false, lowpassFreq: 20000,
    noiseReduction: 30, smoothing: 25
  }
};

// Audio context
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

// Convert dB to linear
function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

// Decode audio file
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Apply noise gate
function applyNoiseGate(data, thresholdDb, releaseMs, sampleRate) {
  const threshold = dbToLinear(thresholdDb);
  const releaseCoeff = Math.exp(-1 / (sampleRate * releaseMs / 1000));
  const attackCoeff = Math.exp(-1 / (sampleRate * 5 / 1000)); // 5ms attack

  let envelope = 0;
  let gateOpen = 0;

  for (let i = 0; i < data.length; i++) {
    const level = Math.abs(data[i]);

    // Envelope follower
    if (level > envelope) {
      envelope = attackCoeff * envelope + (1 - attackCoeff) * level;
    } else {
      envelope = releaseCoeff * envelope + (1 - releaseCoeff) * level;
    }

    // Gate logic
    if (envelope > threshold) {
      // Quick open
      gateOpen = Math.min(1, gateOpen + 0.1);
    } else {
      // Slow close
      gateOpen = Math.max(0, gateOpen - 0.01);
    }

    data[i] *= gateOpen;
  }
}

// Apply biquad filter (high-pass or low-pass)
function applyBiquadFilter(data, frequency, sampleRate, type) {
  // Calculate filter coefficients
  const w0 = 2 * Math.PI * frequency / sampleRate;
  const Q = 0.707; // Butterworth

  let b0, b1, b2, a0, a1, a2;

  if (type === 'highpass') {
    const alpha = Math.sin(w0) / (2 * Q);
    b0 = (1 + Math.cos(w0)) / 2;
    b1 = -(1 + Math.cos(w0));
    b2 = (1 + Math.cos(w0)) / 2;
    a0 = 1 + alpha;
    a1 = -2 * Math.cos(w0);
    a2 = 1 - alpha;
  } else { // lowpass
    const alpha = Math.sin(w0) / (2 * Q);
    b0 = (1 - Math.cos(w0)) / 2;
    b1 = 1 - Math.cos(w0);
    b2 = (1 - Math.cos(w0)) / 2;
    a0 = 1 + alpha;
    a1 = -2 * Math.cos(w0);
    a2 = 1 - alpha;
  }

  // Normalize
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  a1 /= a0;
  a2 /= a0;

  // Apply filter (Direct Form II)
  let x1 = 0, x2 = 0;
  let y1 = 0, y2 = 0;

  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    data[i] = y0;
  }
}

// Apply spectral noise reduction (simple approach)
function applyNoiseReduction(data, reductionPercent, smoothingPercent, sampleRate) {
  if (reductionPercent === 0) return;

  const windowSize = 2048;
  const hopSize = windowSize / 4;
  const reduction = reductionPercent / 100;
  const smooth = smoothingPercent / 100;

  // Estimate noise floor from the first 0.5 seconds
  const noiseFrames = Math.floor(0.5 * sampleRate / hopSize);
  const noiseProfile = new Float32Array(windowSize / 2 + 1);

  // Simple noise estimation: use minimum values from initial frames
  for (let frame = 0; frame < Math.min(noiseFrames, 10); frame++) {
    const start = frame * hopSize;
    let sum = 0;
    for (let i = 0; i < windowSize && start + i < data.length; i++) {
      sum += Math.abs(data[start + i]);
    }
    const avg = sum / windowSize;
    if (frame === 0 || avg < noiseProfile[0]) {
      noiseProfile[0] = avg;
    }
  }

  // Apply simple spectral subtraction concept using time-domain approach
  const noiseThreshold = noiseProfile[0] * (1 + reduction * 2);

  let envelope = 0;
  const attackCoeff = Math.exp(-1 / (sampleRate * 10 / 1000));
  const releaseCoeff = Math.exp(-1 / (sampleRate * (50 + smooth * 100) / 1000));

  for (let i = 0; i < data.length; i++) {
    const level = Math.abs(data[i]);

    // Envelope follower
    if (level > envelope) {
      envelope = attackCoeff * envelope + (1 - attackCoeff) * level;
    } else {
      envelope = releaseCoeff * envelope + (1 - releaseCoeff) * level;
    }

    // Apply reduction for low-level signals
    if (envelope < noiseThreshold) {
      const factor = Math.pow(envelope / noiseThreshold, reduction * 2);
      data[i] *= factor;
    }
  }
}

// Apply smoothing to reduce artifacts
function applySmoothing(data, smoothingPercent) {
  if (smoothingPercent === 0) return;

  const kernelSize = Math.floor(1 + (smoothingPercent / 100) * 4);
  if (kernelSize <= 1) return;

  const temp = new Float32Array(data.length);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -kernelSize; j <= kernelSize; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        // Gaussian-like weighting
        const weight = 1 - Math.abs(j) / (kernelSize + 1);
        sum += data[idx] * weight;
        count += weight;
      }
    }

    temp[i] = sum / count;
  }

  // Mix original and smoothed
  const mix = smoothingPercent / 200; // 0 to 0.5
  for (let i = 0; i < data.length; i++) {
    data[i] = data[i] * (1 - mix) + temp[i] * mix;
  }
}

// Apply all noise reduction techniques
function applyDenoise(buffer, options) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const processed = ctx.createBuffer(numChannels, length, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    // Copy input to output
    outputData.set(inputData);

    // Apply high-pass filter
    if (options.enableHighpass) {
      applyBiquadFilter(outputData, options.highpassFreq, sampleRate, 'highpass');
    }

    // Apply low-pass filter
    if (options.enableLowpass) {
      applyBiquadFilter(outputData, options.lowpassFreq, sampleRate, 'lowpass');
    }

    // Apply noise reduction
    applyNoiseReduction(outputData, options.noiseReduction, options.smoothing, sampleRate);

    // Apply noise gate
    if (options.enableGate) {
      applyNoiseGate(outputData, options.gateThreshold, options.gateRelease, sampleRate);
    }

    // Apply final smoothing
    applySmoothing(outputData, options.smoothing);
  }

  return processed;
}

// Convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Convert AudioBuffer to MP3
function audioBufferToMp3(buffer, bitrateKbps) {
  return new Promise((resolve) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrateKbps);
    const mp3Data = [];

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

    const leftInt16 = new Int16Array(leftChannel.length);
    const rightInt16 = new Int16Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(leftChannel[i] * 32767)));
      rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(rightChannel[i] * 32767)));
    }

    const sampleBlockSize = 1152;
    const totalSamples = leftInt16.length;
    let samplesProcessed = 0;

    function processChunk() {
      const chunkSize = Math.min(sampleBlockSize * 50, totalSamples - samplesProcessed);

      for (let i = 0; i < chunkSize; i += sampleBlockSize) {
        const start = samplesProcessed + i;
        const end = Math.min(start + sampleBlockSize, totalSamples);

        const leftChunk = leftInt16.slice(start, end);
        const rightChunk = rightInt16.slice(start, end);

        let mp3buf;
        if (numChannels === 1) {
          mp3buf = mp3encoder.encodeBuffer(leftChunk);
        } else {
          mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        }

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      samplesProcessed += chunkSize;
      const progress = 50 + (samplesProcessed / totalSamples) * 50;
      updateProgress(progress, `編碼 MP3... ${Math.round(progress)}%`);

      if (samplesProcessed < totalSamples) {
        setTimeout(processChunk, 0);
      } else {
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of mp3Data) {
          result.set(buf, offset);
          offset += buf.length;
        }

        resolve(new Blob([result], { type: 'audio/mp3' }));
      }
    }

    processChunk();
  });
}

// Update progress
function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

// Update value displays
function updateValueDisplays() {
  gateThresholdValue.textContent = gateThreshold.value + ' dB';
  gateReleaseValue.textContent = gateRelease.value + ' ms';
  highpassFreqValue.textContent = highpassFreq.value + ' Hz';
  lowpassFreqValue.textContent = lowpassFreq.value + ' Hz';
  noiseReductionValue.textContent = noiseReduction.value + '%';
  smoothingValue.textContent = smoothing.value + '%';
}

// Apply preset
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  enableGate.checked = preset.enableGate;
  gateThreshold.value = preset.gateThreshold;
  gateRelease.value = preset.gateRelease;
  enableHighpass.checked = preset.enableHighpass;
  highpassFreq.value = preset.highpassFreq;
  enableLowpass.checked = preset.enableLowpass;
  lowpassFreq.value = preset.lowpassFreq;
  noiseReduction.value = preset.noiseReduction;
  smoothing.value = preset.smoothing;

  updateValueDisplays();

  // Update preset buttons
  const buttons = presetButtons.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    if (btn.dataset.preset === presetName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Handle file selection
async function handleFile(file) {
  if (!file) return;

  audioFile = file;
  progressContainer.classList.add('show');
  updateProgress(0, '載入音訊檔案...');

  try {
    updateProgress(30, '解碼音訊...');
    audioBuffer = await decodeAudioFile(file);

    updateProgress(100, '完成！');

    fileName.textContent = file.name;
    fileDuration.textContent = `時長：${formatDuration(audioBuffer.duration)}`;
    fileSampleRate.textContent = `取樣率：${audioBuffer.sampleRate} Hz`;
    fileChannels.textContent = `聲道：${audioBuffer.numberOfChannels === 1 ? '單聲道' : '立體聲'}`;

    fileInfo.classList.add('show');

    // Create original preview URL
    originalPreview.src = URL.createObjectURL(file);

    processBtn.disabled = false;
    resetBtn.style.display = 'flex';
    resetBtn.classList.add('show');

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 500);

  } catch (error) {
    alert('無法載入音訊：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Process audio with noise reduction
async function processAudio() {
  if (!audioBuffer) return;

  const options = {
    enableGate: enableGate.checked,
    gateThreshold: parseFloat(gateThreshold.value),
    gateRelease: parseFloat(gateRelease.value),
    enableHighpass: enableHighpass.checked,
    highpassFreq: parseFloat(highpassFreq.value),
    enableLowpass: enableLowpass.checked,
    lowpassFreq: parseFloat(lowpassFreq.value),
    noiseReduction: parseFloat(noiseReduction.value),
    smoothing: parseFloat(smoothing.value)
  };

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用降噪處理...');

    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    processedBuffer = applyDenoise(audioBuffer, options);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultReduction.textContent = options.noiseReduction + '%';
    resultHighpass.textContent = options.enableHighpass ? options.highpassFreq + ' Hz' : '--';
    resultLowpass.textContent = options.enableLowpass ? options.lowpassFreq + ' Hz' : '--';
    outputSize.textContent = formatFileSize(outputBlob.size);
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    downloadBtn.classList.add('show');
    downloadLabel.textContent = `下載 ${format.toUpperCase()}`;

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 1000);

  } catch (error) {
    alert('處理失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  processBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;
  const baseName = audioFile.name.replace(/\.[^/.]+$/, '');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_denoised.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  audioFile = null;
  audioBuffer = null;
  processedBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  processBtn.disabled = true;
  downloadBtn.style.display = 'none';
  downloadBtn.classList.remove('show');
  resetBtn.style.display = 'none';
  resetBtn.classList.remove('show');

  // Reset to default preset
  applyPreset('normal');

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
  if (originalPreview.src) {
    URL.revokeObjectURL(originalPreview.src);
    originalPreview.src = '';
  }
}

// Update output format UI
function updateOutputFormatUI() {
  const format = outputFormat.value;
  bitrateRow.style.display = format === 'mp3' ? 'flex' : 'none';
}

// Event listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

gateThreshold.addEventListener('input', updateValueDisplays);
gateRelease.addEventListener('input', updateValueDisplays);
highpassFreq.addEventListener('input', updateValueDisplays);
lowpassFreq.addEventListener('input', updateValueDisplays);
noiseReduction.addEventListener('input', updateValueDisplays);
smoothing.addEventListener('input', updateValueDisplays);

// Preset button clicks
presetButtons.addEventListener('click', (e) => {
  if (e.target.classList.contains('preset-btn')) {
    applyPreset(e.target.dataset.preset);
  }
});

outputFormat.addEventListener('change', updateOutputFormatUI);
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
updateValueDisplays();
