/**
 * AUD-025 Audio Flanger Effect
 * Creates jet-plane sweeping sound through short modulated delay with feedback
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
const rate = document.getElementById('rate');
const rateValue = document.getElementById('rateValue');
const depth = document.getElementById('depth');
const depthValue = document.getElementById('depthValue');
const delay = document.getElementById('delay');
const delayValue = document.getElementById('delayValue');
const feedback = document.getElementById('feedback');
const feedbackValue = document.getElementById('feedbackValue');
const wetDry = document.getElementById('wetDry');
const wetDryValue = document.getElementById('wetDryValue');
const stereoPhase = document.getElementById('stereoPhase');
const stereoPhaseValue = document.getElementById('stereoPhaseValue');
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
const resultRate = document.getElementById('resultRate');
const resultFeedback = document.getElementById('resultFeedback');
const resultWetDry = document.getElementById('resultWetDry');
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
  subtle: { rate: 0.2, depth: 30, delay: 2, feedback: 20, wetDry: 30, stereoPhase: 45 },
  classic: { rate: 0.5, depth: 70, delay: 3, feedback: 50, wetDry: 50, stereoPhase: 90 },
  jet: { rate: 0.3, depth: 90, delay: 5, feedback: 70, wetDry: 60, stereoPhase: 120 },
  metallic: { rate: 1.5, depth: 80, delay: 1.5, feedback: 85, wetDry: 55, stereoPhase: 90 },
  psychedelic: { rate: 0.1, depth: 100, delay: 7, feedback: 80, wetDry: 70, stereoPhase: 180 }
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

// Decode audio file
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Flanger delay line class
class FlangerLine {
  constructor(sampleRate, maxDelayMs) {
    this.sampleRate = sampleRate;
    const maxDelaySamples = Math.ceil((maxDelayMs / 1000) * sampleRate) + 10;
    this.buffer = new Float32Array(maxDelaySamples);
    this.writeIndex = 0;
    this.bufferLength = maxDelaySamples;
  }

  write(sample) {
    this.buffer[this.writeIndex] = sample;
    this.writeIndex = (this.writeIndex + 1) % this.bufferLength;
  }

  read(delaySamples) {
    // Calculate read position with linear interpolation
    let readPos = this.writeIndex - 1 - delaySamples;
    if (readPos < 0) readPos += this.bufferLength;

    const readIndex = Math.floor(readPos);
    const frac = readPos - readIndex;

    const idx0 = ((readIndex % this.bufferLength) + this.bufferLength) % this.bufferLength;
    const idx1 = ((readIndex + 1) % this.bufferLength + this.bufferLength) % this.bufferLength;

    // Linear interpolation
    return this.buffer[idx0] * (1 - frac) + this.buffer[idx1] * frac;
  }
}

// Apply flanger effect
function applyFlanger(buffer, options) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const processed = ctx.createBuffer(numChannels, length, sampleRate);

  // Parameters
  const rateHz = options.rate;
  const depthPercent = options.depth / 100;
  const baseDelayMs = options.delay;
  const feedbackAmount = options.feedback / 100;
  const wetMix = options.wetDry / 100;
  const dryMix = 1 - wetMix;
  const stereoPhaseDeg = options.stereoPhase;
  const stereoPhaseRad = (stereoPhaseDeg * Math.PI) / 180;

  // Calculate delay range
  const minDelayMs = 0.5;
  const maxDelayMs = baseDelayMs * 2;
  const delayRange = (maxDelayMs - minDelayMs) * depthPercent;

  // Process each channel
  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    // Phase offset for stereo effect
    const phaseOffset = ch === 0 ? 0 : stereoPhaseRad;

    // Create flanger delay line
    const flangerLine = new FlangerLine(sampleRate, maxDelayMs + 5);

    // Feedback storage
    let feedbackSample = 0;

    // Process samples
    for (let i = 0; i < length; i++) {
      const input = inputData[i];

      // Calculate modulated delay using LFO (sine wave)
      const lfoPhase = 2 * Math.PI * rateHz * (i / sampleRate) + phaseOffset;
      const lfoValue = (Math.sin(lfoPhase) + 1) / 2; // 0 to 1
      const currentDelayMs = minDelayMs + delayRange * lfoValue;
      const currentDelaySamples = (currentDelayMs / 1000) * sampleRate;

      // Write input plus feedback to delay line
      flangerLine.write(input + feedbackSample * feedbackAmount);

      // Read delayed sample
      const delayedSample = flangerLine.read(currentDelaySamples);

      // Store for feedback
      feedbackSample = delayedSample;

      // Mix dry and wet signals
      outputData[i] = input * dryMix + delayedSample * wetMix;

      // Soft clip to prevent distortion from feedback
      if (outputData[i] > 1) {
        outputData[i] = 1 - Math.exp(-outputData[i] + 1);
      } else if (outputData[i] < -1) {
        outputData[i] = -1 + Math.exp(outputData[i] + 1);
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

// Update value displays
function updateValueDisplays() {
  rateValue.textContent = parseFloat(rate.value).toFixed(1) + ' Hz';
  depthValue.textContent = depth.value + '%';
  delayValue.textContent = parseFloat(delay.value).toFixed(1) + ' ms';
  feedbackValue.textContent = feedback.value + '%';
  wetDryValue.textContent = wetDry.value + '%';
  stereoPhaseValue.textContent = stereoPhase.value + '°';
}

// Apply preset
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  rate.value = preset.rate;
  depth.value = preset.depth;
  delay.value = preset.delay;
  feedback.value = preset.feedback;
  wetDry.value = preset.wetDry;
  stereoPhase.value = preset.stereoPhase;

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

// Process audio with flanger
async function processAudio() {
  if (!audioBuffer) return;

  const options = {
    rate: parseFloat(rate.value),
    depth: parseFloat(depth.value),
    delay: parseFloat(delay.value),
    feedback: parseFloat(feedback.value),
    wetDry: parseFloat(wetDry.value),
    stereoPhase: parseFloat(stereoPhase.value)
  };

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用鎡射效果...');

    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    processedBuffer = applyFlanger(audioBuffer, options);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultRate.textContent = options.rate.toFixed(1) + ' Hz';
    resultFeedback.textContent = options.feedback + '%';
    resultWetDry.textContent = options.wetDry + '%';
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
  a.download = `${baseName}_flanger.${format}`;
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
  applyPreset('classic');

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

rate.addEventListener('input', updateValueDisplays);
depth.addEventListener('input', updateValueDisplays);
delay.addEventListener('input', updateValueDisplays);
feedback.addEventListener('input', updateValueDisplays);
wetDry.addEventListener('input', updateValueDisplays);
stereoPhase.addEventListener('input', updateValueDisplays);

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
