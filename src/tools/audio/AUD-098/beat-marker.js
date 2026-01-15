/**
 * AUD-098: Beat Marker
 * Mark beats in audio and add click track
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;
let detectedBeats = [];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const sensitivity = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const clickVolume = document.getElementById('clickVolume');
const clickVolumeValue = document.getElementById('clickVolumeValue');
const markBtn = document.getElementById('markBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const beatStats = document.getElementById('beatStats');
const beatCanvas = document.getElementById('beatCanvas');
const audioPreview = document.getElementById('audioPreview');

const sensitivityLabels = ['非常低', '低', '中', '高', '非常高'];

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#6366f1'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

sensitivity.addEventListener('input', () => sensitivityValue.textContent = sensitivityLabels[sensitivity.value - 1]);
clickVolume.addEventListener('input', () => clickVolumeValue.textContent = clickVolume.value + '%');

markBtn.addEventListener('click', markBeats);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  settingsPanel.classList.add('show');
  markBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function detectBeats(monoData, sr, sensitivityLevel) {
  // Onset detection using energy difference
  const hopSize = Math.floor(sr * 0.01); // 10ms
  const windowSize = Math.floor(sr * 0.02); // 20ms
  const numFrames = Math.floor((monoData.length - windowSize) / hopSize);

  // Calculate energy for each frame
  const energy = new Float32Array(numFrames);
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize;
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      sum += monoData[start + i] * monoData[start + i];
    }
    energy[frame] = sum;
  }

  // Calculate onset function (positive energy difference)
  const onsetFunction = new Float32Array(numFrames - 1);
  for (let i = 1; i < numFrames; i++) {
    onsetFunction[i - 1] = Math.max(0, energy[i] - energy[i - 1]);
  }

  // Adaptive threshold based on sensitivity
  const thresholdMultiplier = [2.0, 1.5, 1.0, 0.7, 0.5][sensitivityLevel - 1];
  const mean = onsetFunction.reduce((a, b) => a + b, 0) / onsetFunction.length;
  const threshold = mean * thresholdMultiplier;

  // Peak picking with minimum distance (100ms)
  const minDistance = Math.floor(0.1 * sr / hopSize);
  const beats = [];
  let lastBeat = -minDistance;

  for (let i = 1; i < onsetFunction.length - 1; i++) {
    if (onsetFunction[i] > threshold &&
        onsetFunction[i] > onsetFunction[i - 1] &&
        onsetFunction[i] > onsetFunction[i + 1] &&
        i - lastBeat >= minDistance) {
      beats.push(i * hopSize / sr);
      lastBeat = i;
    }
  }

  return beats;
}

function createClickSound(sr, duration = 0.02) {
  // Create a short click sound
  const length = Math.floor(sr * duration);
  const click = new Float32Array(length);
  const freq = 1000; // 1kHz

  for (let i = 0; i < length; i++) {
    const t = i / sr;
    const envelope = Math.exp(-t * 100); // Fast decay
    click[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
  }

  return click;
}

function markBeats() {
  if (!audioBuffer) return;

  markBtn.disabled = true;
  markBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Mix to mono for beat detection
    const monoData = new Float32Array(length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[i] / numChannels;
      }
    }

    // Detect beats
    const sensitivityLevel = parseInt(sensitivity.value);
    detectedBeats = detectBeats(monoData, sr, sensitivityLevel);

    // Create click track
    const clickSound = createClickSound(sr);
    const clickVol = parseInt(clickVolume.value) / 100;

    // Create output buffer with click track
    const newBuffer = ctx.createBuffer(numChannels, length, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);

      // Copy original audio
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i];
      }

      // Add clicks at beat positions
      for (const beatTime of detectedBeats) {
        const beatSample = Math.floor(beatTime * sr);
        for (let i = 0; i < clickSound.length; i++) {
          const idx = beatSample + i;
          if (idx < length) {
            outputData[idx] = outputData[idx] * 0.8 + clickSound[i] * clickVol;
          }
        }
      }

      // Normalize if needed
      let max = 0;
      for (let i = 0; i < length; i++) {
        max = Math.max(max, Math.abs(outputData[i]));
      }
      if (max > 1) {
        for (let i = 0; i < length; i++) {
          outputData[i] /= max;
        }
      }
    }

    // Calculate BPM from beat intervals
    let bpm = 0;
    if (detectedBeats.length > 1) {
      const intervals = [];
      for (let i = 1; i < detectedBeats.length; i++) {
        intervals.push(detectedBeats[i] - detectedBeats[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = 60 / avgInterval;
    }

    // Display stats
    beatStats.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">偵測節拍數</div>
        <div class="stat-value">${detectedBeats.length}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">估計 BPM</div>
        <div class="stat-value">${bpm.toFixed(0)}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">平均間隔</div>
        <div class="stat-value">${(60 / bpm * 1000).toFixed(0)} ms</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">總時長</div>
        <div class="stat-value">${audioBuffer.duration.toFixed(2)}s</div>
      </div>
    `;

    // Draw beat visualization
    drawBeatVisualization(monoData, sr, detectedBeats);

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    markBtn.disabled = false;
    markBtn.innerHTML = '<span>🥁</span> 標記節拍';
  }, 100);
}

function drawBeatVisualization(data, sr, beats) {
  const canvas = beatCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, width, height);

  // Draw waveform
  const samplesPerPixel = Math.ceil(data.length / width);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < width; x++) {
    const start = x * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, data.length);
    let max = 0;
    for (let i = start; i < end; i++) {
      max = Math.max(max, Math.abs(data[i]));
    }
    const y = height / 2 - (max * height / 2);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Draw beat markers
  ctx.fillStyle = '#6366f1';
  const duration = data.length / sr;

  for (const beatTime of beats) {
    const x = (beatTime / duration) * width;
    ctx.fillRect(x - 1, 0, 2, height);
  }
}

function audioBufferToWav(buffer, sampleRate) {
  const numChannels = buffer.numberOfChannels;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function downloadResult() {
  if (!processedBlob) return;
  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_beats.wav`;
  link.click();
}
