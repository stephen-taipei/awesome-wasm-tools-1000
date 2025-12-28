/**
 * AUD-021 Audio Limiter
 * Prevents audio from exceeding a specified ceiling level
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
const ceiling = document.getElementById('ceiling');
const ceilingValue = document.getElementById('ceilingValue');
const inputGain = document.getElementById('inputGain');
const inputGainValue = document.getElementById('inputGainValue');
const release = document.getElementById('release');
const releaseValue = document.getElementById('releaseValue');
const lookahead = document.getElementById('lookahead');
const lookaheadValue = document.getElementById('lookaheadValue');
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
const resultCeiling = document.getElementById('resultCeiling');
const resultGain = document.getElementById('resultGain');
const peakReduction = document.getElementById('peakReduction');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// State
let audioFile = null;
let audioBuffer = null;
let processedBuffer = null;
let outputBlob = null;
let maxPeakReduction = 0;

// Presets
const presets = {
  transparent: { ceiling: -0.1, inputGain: 0, release: 200, lookahead: 5 },
  normal: { ceiling: -0.3, inputGain: 0, release: 100, lookahead: 5 },
  loud: { ceiling: -0.1, inputGain: 6, release: 50, lookahead: 3 },
  broadcast: { ceiling: -1, inputGain: 3, release: 100, lookahead: 5 },
  mastering: { ceiling: -0.3, inputGain: 0, release: 150, lookahead: 10 }
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

// Convert linear to dB
function linearToDb(linear) {
  if (linear <= 0) return -100;
  return 20 * Math.log10(linear);
}

// Decode audio file
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Apply limiter effect
function applyLimiter(buffer, ceilingDb, inputGainDb, releaseMs, lookaheadMs) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const processed = ctx.createBuffer(numChannels, length, sampleRate);

  // Convert parameters
  const ceilingLinear = dbToLinear(ceilingDb);
  const inputGainLinear = dbToLinear(inputGainDb);

  // Calculate lookahead in samples
  const lookaheadSamples = Math.floor((lookaheadMs / 1000) * sampleRate);

  // Release coefficient
  const releaseCoeff = Math.exp(-1 / (sampleRate * releaseMs / 1000));

  // Track max peak reduction
  maxPeakReduction = 0;

  // First pass: find peaks with lookahead (for all channels combined)
  const peakBuffer = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let maxSample = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.abs(buffer.getChannelData(ch)[i] * inputGainLinear);
      maxSample = Math.max(maxSample, sample);
    }
    peakBuffer[i] = maxSample;
  }

  // Apply lookahead to find upcoming peaks
  const lookaheadPeaks = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let maxPeak = peakBuffer[i];
    const endIdx = Math.min(i + lookaheadSamples, length);
    for (let j = i; j < endIdx; j++) {
      maxPeak = Math.max(maxPeak, peakBuffer[j]);
    }
    lookaheadPeaks[i] = maxPeak;
  }

  // Calculate gain reduction envelope
  const gainReduction = new Float32Array(length);
  let currentGain = 1;

  for (let i = 0; i < length; i++) {
    const peak = lookaheadPeaks[i];
    let targetGain = 1;

    if (peak > ceilingLinear) {
      targetGain = ceilingLinear / peak;
    }

    // Smooth gain changes
    if (targetGain < currentGain) {
      // Attack - instant for limiter
      currentGain = targetGain;
    } else {
      // Release - smooth recovery
      currentGain = releaseCoeff * currentGain + (1 - releaseCoeff) * targetGain;
    }

    gainReduction[i] = currentGain;

    // Track max reduction
    const reductionDb = linearToDb(currentGain);
    if (reductionDb < maxPeakReduction) {
      maxPeakReduction = reductionDb;
    }
  }

  // Apply gain reduction to all channels
  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      // Apply input gain and gain reduction
      let sample = inputData[i] * inputGainLinear * gainReduction[i];

      // Hard clip at ceiling as safety
      if (sample > ceilingLinear) {
        sample = ceilingLinear;
      } else if (sample < -ceilingLinear) {
        sample = -ceilingLinear;
      }

      outputData[i] = sample;
    }
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
  ceilingValue.textContent = ceiling.value + ' dB';
  inputGainValue.textContent = inputGain.value + ' dB';
  releaseValue.textContent = release.value + ' ms';
  lookaheadValue.textContent = lookahead.value + ' ms';
}

// Apply preset
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  ceiling.value = preset.ceiling;
  inputGain.value = preset.inputGain;
  release.value = preset.release;
  lookahead.value = preset.lookahead;

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

// Process audio with limiter
async function processAudio() {
  if (!audioBuffer) return;

  const ceilingDb = parseFloat(ceiling.value);
  const inputGainDb = parseFloat(inputGain.value);
  const releaseMs = parseFloat(release.value);
  const lookaheadMs = parseFloat(lookahead.value);
  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用限制器...');

    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    processedBuffer = applyLimiter(audioBuffer, ceilingDb, inputGainDb, releaseMs, lookaheadMs);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultCeiling.textContent = ceilingDb + ' dB';
    resultGain.textContent = inputGainDb + ' dB';
    peakReduction.textContent = maxPeakReduction.toFixed(1) + ' dB';
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
  a.download = `${baseName}_limited.${format}`;
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
  maxPeakReduction = 0;

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

ceiling.addEventListener('input', updateValueDisplays);
inputGain.addEventListener('input', updateValueDisplays);
release.addEventListener('input', updateValueDisplays);
lookahead.addEventListener('input', updateValueDisplays);

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
