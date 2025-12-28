/**
 * AUD-014 Audio Speed Adjustment Tool
 * Adjusts audio playback speed with or without pitch change
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
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const presetButtons = document.getElementById('presetButtons');
const durationPreview = document.getElementById('durationPreview');
const originalDuration = document.getElementById('originalDuration');
const newDuration = document.getElementById('newDuration');
const durationChange = document.getElementById('durationChange');
const processingMode = document.getElementById('processingMode');
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
const resultSpeed = document.getElementById('resultSpeed');
const resultMode = document.getElementById('resultMode');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');
const originalPreview = document.getElementById('originalPreview');

// State
let audioFile = null;
let audioBuffer = null;
let processedBuffer = null;
let outputBlob = null;
let currentSpeed = 1;

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

// Speed change with pitch change (simple resampling)
function changeSpeedWithPitch(buffer, speed) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const originalSampleRate = buffer.sampleRate;
  const originalLength = buffer.length;

  // New length after speed change
  const newLength = Math.floor(originalLength / speed);

  const processed = ctx.createBuffer(numChannels, newLength, originalSampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    for (let i = 0; i < newLength; i++) {
      // Linear interpolation for smoother resampling
      const srcIndex = i * speed;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, originalLength - 1);
      const fraction = srcIndex - srcIndexFloor;

      outputData[i] = inputData[srcIndexFloor] * (1 - fraction) +
                      inputData[srcIndexCeil] * fraction;
    }
  }

  return processed;
}

// Time stretching (speed change without pitch change)
// Using a simplified phase vocoder approach
function timeStretch(buffer, speed) {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const originalLength = buffer.length;
  const newLength = Math.floor(originalLength / speed);

  const processed = ctx.createBuffer(numChannels, newLength, sampleRate);

  // Parameters for overlap-add
  const frameSize = 2048;
  const hopSizeIn = Math.floor(frameSize / 4);
  const hopSizeOut = Math.floor(hopSizeIn / speed);

  // Hann window
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / frameSize));
  }

  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = buffer.getChannelData(ch);
    const outputData = processed.getChannelData(ch);

    // Zero out output
    outputData.fill(0);

    // Overlap-add with windowing
    let inputPos = 0;
    let outputPos = 0;

    while (inputPos + frameSize < originalLength && outputPos + frameSize < newLength) {
      for (let i = 0; i < frameSize; i++) {
        if (outputPos + i < newLength) {
          outputData[outputPos + i] += inputData[inputPos + i] * window[i];
        }
      }

      inputPos += hopSizeIn;
      outputPos += hopSizeOut;
    }

    // Normalize to prevent clipping
    let maxVal = 0;
    for (let i = 0; i < newLength; i++) {
      maxVal = Math.max(maxVal, Math.abs(outputData[i]));
    }

    if (maxVal > 1) {
      for (let i = 0; i < newLength; i++) {
        outputData[i] /= maxVal;
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

// Update duration preview
function updateDurationPreview() {
  if (!audioBuffer) return;

  const originalDur = audioBuffer.duration;
  const newDur = originalDur / currentSpeed;
  const change = ((newDur - originalDur) / originalDur) * 100;

  originalDuration.textContent = formatDuration(originalDur);
  newDuration.textContent = formatDuration(newDur);

  if (change > 0) {
    durationChange.textContent = `+${change.toFixed(1)}%`;
  } else {
    durationChange.textContent = `${change.toFixed(1)}%`;
  }

  durationPreview.style.display = 'flex';
}

// Update speed display
function updateSpeedDisplay() {
  speedValue.textContent = currentSpeed.toFixed(2) + 'x';

  // Update preset buttons
  const buttons = presetButtons.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    const btnSpeed = parseFloat(btn.dataset.speed);
    if (Math.abs(btnSpeed - currentSpeed) < 0.01) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateDurationPreview();
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
    updateDurationPreview();

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

// Process audio with speed adjustment
async function processAudio() {
  if (!audioBuffer) return;

  const speed = currentSpeed;
  const mode = processingMode.value;
  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '調整速度...');

    if (mode === 'pitch') {
      // Speed change with pitch change
      processedBuffer = changeSpeedWithPitch(audioBuffer, speed);
    } else {
      // Time stretching (speed change without pitch change)
      processedBuffer = timeStretch(audioBuffer, speed);
    }

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(processedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(processedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    resultSpeed.textContent = speed.toFixed(2) + 'x';
    resultMode.textContent = mode === 'pitch' ? '變速變調' : '變速不變調';
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
  const speedStr = currentSpeed.toFixed(2).replace('.', '_');

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_${speedStr}x.${format}`;
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
  durationPreview.style.display = 'none';

  processBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  currentSpeed = 1;
  speedSlider.value = 1;
  updateSpeedDisplay();

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

speedSlider.addEventListener('input', () => {
  currentSpeed = parseFloat(speedSlider.value);
  updateSpeedDisplay();
});

// Preset button clicks
presetButtons.addEventListener('click', (e) => {
  if (e.target.classList.contains('preset-btn')) {
    currentSpeed = parseFloat(e.target.dataset.speed);
    speedSlider.value = currentSpeed;
    updateSpeedDisplay();
  }
});

outputFormat.addEventListener('change', updateOutputFormatUI);
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
updateSpeedDisplay();
