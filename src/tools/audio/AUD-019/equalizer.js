/**
 * AUD-019 Audio Equalizer Tool
 * 10-band equalizer for adjusting frequency response
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
const eqBands = document.getElementById('eqBands');
const resetEqBtn = document.getElementById('resetEqBtn');
const presetRow = document.getElementById('presetRow');
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
const resultDuration = document.getElementById('resultDuration');
const resultBands = document.getElementById('resultBands');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// EQ frequencies
const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

// Presets (values in dB)
const presets = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 0, -1],
  rock: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
  pop: [1, 2, 3, 2, 0, -1, 1, 2, 3, 2],
  jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  classical: [4, 3, 2, 1, 0, 0, 0, 1, 2, 3]
};

// State
let audioFile = null;
let audioBuffer = null;
let processedBuffer = null;
let outputBlob = null;
let eqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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

// Decode audio file
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Simple biquad filter coefficients for peaking EQ
function calculateBiquadCoefficients(frequency, gain, q, sampleRate) {
  const w0 = 2 * Math.PI * frequency / sampleRate;
  const A = Math.pow(10, gain / 40);
  const alpha = Math.sin(w0) / (2 * q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0
  };
}

// Apply biquad filter to data
function applyBiquadFilter(data, coeffs) {
  const output = new Float32Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < data.length; i++) {
    const x0 = data[i];
    const y0 = coeffs.b0 * x0 + coeffs.b1 * x1 + coeffs.b2 * x2 - coeffs.a1 * y1 - coeffs.a2 * y2;

    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    output[i] = y0;
  }

  return output;
}

// Apply equalizer to audio buffer
function applyEqualizer(buffer, gains) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const processed = ctx.createBuffer(numChannels, length, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    let data = buffer.getChannelData(ch).slice();

    // Apply each EQ band
    for (let i = 0; i < frequencies.length; i++) {
      if (gains[i] !== 0) {
        const freq = frequencies[i];
        const gain = gains[i];
        const q = 1.4; // Q factor for each band

        const coeffs = calculateBiquadCoefficients(freq, gain, q, sampleRate);
        data = applyBiquadFilter(data, coeffs);
      }
    }

    // Normalize if needed
    let maxVal = 0;
    for (let i = 0; i < length; i++) {
      maxVal = Math.max(maxVal, Math.abs(data[i]));
    }

    const outputData = processed.getChannelData(ch);
    if (maxVal > 1) {
      for (let i = 0; i < length; i++) {
        outputData[i] = data[i] / maxVal;
      }
    } else {
      for (let i = 0; i < length; i++) {
        outputData[i] = data[i];
      }
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

// Update EQ slider values display
function updateEqDisplay() {
  frequencies.forEach((freq, idx) => {
    const valueEl = eqBands.querySelector(`.eq-value[data-freq="${freq}"]`);
    if (valueEl) {
      const val = eqGains[idx];
      valueEl.textContent = val > 0 ? `+${val} dB` : `${val} dB`;
    }
  });
}

// Apply preset to EQ
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  eqGains = [...preset];

  // Update sliders
  const sliders = eqBands.querySelectorAll('.eq-slider');
  sliders.forEach((slider, idx) => {
    slider.value = preset[idx];
  });

  updateEqDisplay();

  // Update preset buttons
  const buttons = presetRow.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    if (btn.dataset.preset === presetName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Reset EQ to flat
function resetEq() {
  applyPreset('flat');
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

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 500);

  } catch (error) {
    alert('無法載入音訊：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }
}

// Process audio with equalizer
async function processAudio() {
  if (!audioBuffer) return;

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用等化器...');
    processedBuffer = applyEqualizer(audioBuffer, eqGains);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // Count modified bands
    const modifiedBands = eqGains.filter(g => g !== 0).length;

    resultDuration.textContent = formatDuration(processedBuffer.duration);
    resultBands.textContent = modifiedBands + ' 個';
    outputSize.textContent = formatFileSize(outputBlob.size);
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
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
  a.download = `${baseName}_eq.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset all
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
  resetBtn.style.display = 'none';

  resetEq();

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

// EQ slider events
eqBands.querySelectorAll('.eq-slider').forEach((slider, idx) => {
  slider.addEventListener('input', () => {
    eqGains[idx] = parseInt(slider.value);
    updateEqDisplay();

    // Clear active preset
    presetRow.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  });
});

resetEqBtn.addEventListener('click', resetEq);

// Preset button clicks
presetRow.addEventListener('click', (e) => {
  if (e.target.classList.contains('preset-btn') && e.target.dataset.preset) {
    applyPreset(e.target.dataset.preset);
  }
});

outputFormat.addEventListener('change', updateOutputFormatUI);
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
updateEqDisplay();
