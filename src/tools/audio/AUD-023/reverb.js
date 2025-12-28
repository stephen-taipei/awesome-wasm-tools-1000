/**
 * AUD-023 Audio Reverb Tool
 * Adds reverb/spatial effects to audio
 * Uses Schroeder reverb algorithm with comb and all-pass filters
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const fileSampleRate = document.getElementById('fileSampleRate');
const fileChannels = document.getElementById('fileChannels');
const roomSize = document.getElementById('roomSize');
const roomSizeValue = document.getElementById('roomSizeValue');
const decayTime = document.getElementById('decayTime');
const decayTimeValue = document.getElementById('decayTimeValue');
const preDelay = document.getElementById('preDelay');
const preDelayValue = document.getElementById('preDelayValue');
const damping = document.getElementById('damping');
const dampingValue = document.getElementById('dampingValue');
const wetDry = document.getElementById('wetDry');
const wetDryValue = document.getElementById('wetDryValue');
const stereoWidth = document.getElementById('stereoWidth');
const stereoWidthValue = document.getElementById('stereoWidthValue');
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
const resultRoomSize = document.getElementById('resultRoomSize');
const resultDecay = document.getElementById('resultDecay');
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
  room: { roomSize: 30, decayTime: 0.8, preDelay: 10, damping: 70, wetDry: 30, stereoWidth: 80 },
  hall: { roomSize: 50, decayTime: 2.0, preDelay: 20, damping: 50, wetDry: 40, stereoWidth: 100 },
  church: { roomSize: 80, decayTime: 4.0, preDelay: 40, damping: 40, wetDry: 50, stereoWidth: 100 },
  plate: { roomSize: 40, decayTime: 1.5, preDelay: 5, damping: 30, wetDry: 35, stereoWidth: 90 },
  spring: { roomSize: 25, decayTime: 1.0, preDelay: 15, damping: 60, wetDry: 45, stereoWidth: 70 },
  cave: { roomSize: 100, decayTime: 6.0, preDelay: 60, damping: 20, wetDry: 60, stereoWidth: 100 }
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

// Comb filter class
class CombFilter {
  constructor(delayLength, feedback, damping) {
    this.buffer = new Float32Array(delayLength);
    this.bufferIndex = 0;
    this.bufferLength = delayLength;
    this.feedback = feedback;
    this.damping = damping;
    this.filterStore = 0;
  }

  process(input) {
    const output = this.buffer[this.bufferIndex];

    // Low-pass filter for damping
    this.filterStore = output * (1 - this.damping) + this.filterStore * this.damping;

    // Write new sample with feedback
    this.buffer[this.bufferIndex] = input + this.filterStore * this.feedback;

    // Increment buffer index
    this.bufferIndex = (this.bufferIndex + 1) % this.bufferLength;

    return output;
  }
}

// All-pass filter class
class AllPassFilter {
  constructor(delayLength, feedback) {
    this.buffer = new Float32Array(delayLength);
    this.bufferIndex = 0;
    this.bufferLength = delayLength;
    this.feedback = feedback;
  }

  process(input) {
    const bufferOut = this.buffer[this.bufferIndex];
    const output = -input + bufferOut;

    this.buffer[this.bufferIndex] = input + bufferOut * this.feedback;
    this.bufferIndex = (this.bufferIndex + 1) % this.bufferLength;

    return output;
  }
}

// Apply reverb effect using Schroeder algorithm
function applyReverb(buffer, options) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  // Calculate reverb tail length
  const reverbTailSamples = Math.floor(options.decayTime * sampleRate);
  const outputLength = length + reverbTailSamples;

  const processed = ctx.createBuffer(numChannels, outputLength, sampleRate);

  // Parameters
  const roomSizeFactor = options.roomSize / 100;
  const decayFactor = options.decayTime / 10;
  const dampingFactor = options.damping / 100;
  const wetMix = options.wetDry / 100;
  const dryMix = 1 - wetMix;
  const stereoWidthFactor = options.stereoWidth / 100;
  const preDelaySamples = Math.floor((options.preDelay / 1000) * sampleRate);

  // Base delay lengths for comb filters (in samples at 44100Hz)
  // Scaled by room size
  const baseDelays = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116];
  const combDelays = baseDelays.map(d => Math.floor(d * (0.5 + roomSizeFactor) * (sampleRate / 44100)));

  // Base delay lengths for all-pass filters
  const allPassDelays = [225, 556, 441, 341].map(d => Math.floor(d * (sampleRate / 44100)));

  // Feedback based on decay time
  const feedback = 0.84 * (0.5 + decayFactor * 0.5);

  // Process each channel
  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    // Stereo spread: use slightly different delays for left/right
    const stereoOffset = ch === 0 ? 0 : Math.floor(23 * stereoWidthFactor);

    // Create comb filters for this channel
    const combFilters = combDelays.map((delay, i) => {
      const d = delay + (ch === 1 ? stereoOffset * (i + 1) : 0);
      return new CombFilter(d, feedback, dampingFactor);
    });

    // Create all-pass filters
    const allPassFilters = allPassDelays.map((delay, i) => {
      const d = delay + (ch === 1 ? Math.floor(stereoOffset * 0.5) : 0);
      return new AllPassFilter(d, 0.5);
    });

    // Pre-delay buffer
    const preDelayBuffer = new Float32Array(preDelaySamples + 1);
    let preDelayIndex = 0;

    // Process samples
    for (let i = 0; i < outputLength; i++) {
      // Get input sample (zero after original audio ends)
      const input = i < length ? inputData[i] : 0;

      // Apply pre-delay
      let delayedInput;
      if (preDelaySamples > 0) {
        delayedInput = preDelayBuffer[preDelayIndex];
        preDelayBuffer[preDelayIndex] = input;
        preDelayIndex = (preDelayIndex + 1) % preDelayBuffer.length;
      } else {
        delayedInput = input;
      }

      // Parallel comb filters
      let combOutput = 0;
      for (const comb of combFilters) {
        combOutput += comb.process(delayedInput);
      }
      combOutput /= combFilters.length;

      // Series all-pass filters
      let allPassOutput = combOutput;
      for (const allPass of allPassFilters) {
        allPassOutput = allPass.process(allPassOutput);
      }

      // Mix dry and wet signals
      const drySignal = i < length ? inputData[i] * dryMix : 0;
      const wetSignal = allPassOutput * wetMix;

      outputData[i] = drySignal + wetSignal;

      // Soft clip to prevent distortion
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
  roomSizeValue.textContent = roomSize.value + '%';
  decayTimeValue.textContent = parseFloat(decayTime.value).toFixed(1) + ' 秒';
  preDelayValue.textContent = preDelay.value + ' ms';
  dampingValue.textContent = damping.value + '%';
  wetDryValue.textContent = wetDry.value + '%';
  stereoWidthValue.textContent = stereoWidth.value + '%';
}

// Apply preset
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  roomSize.value = preset.roomSize;
  decayTime.value = preset.decayTime;
  preDelay.value = preset.preDelay;
  damping.value = preset.damping;
  wetDry.value = preset.wetDry;
  stereoWidth.value = preset.stereoWidth;

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

// Process audio with reverb
async function processAudio() {
  if (!audioBuffer) return;

  const options = {
    roomSize: parseFloat(roomSize.value),
    decayTime: parseFloat(decayTime.value),
    preDelay: parseFloat(preDelay.value),
    damping: parseFloat(damping.value),
    wetDry: parseFloat(wetDry.value),
    stereoWidth: parseFloat(stereoWidth.value)
  };

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '套用混響效果...');

    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    processedBuffer = applyReverb(audioBuffer, options);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultRoomSize.textContent = options.roomSize + '%';
    resultDecay.textContent = options.decayTime.toFixed(1) + ' 秒';
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
  a.download = `${baseName}_reverb.${format}`;
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
  applyPreset('hall');

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

roomSize.addEventListener('input', updateValueDisplays);
decayTime.addEventListener('input', updateValueDisplays);
preDelay.addEventListener('input', updateValueDisplays);
damping.addEventListener('input', updateValueDisplays);
wetDry.addEventListener('input', updateValueDisplays);
stereoWidth.addEventListener('input', updateValueDisplays);

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
