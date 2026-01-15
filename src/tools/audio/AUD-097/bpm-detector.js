/**
 * AUD-097: BPM Detector
 * Detect beats per minute in audio
 */

let audioContext = null;
let audioBuffer = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const detectBtn = document.getElementById('detectBtn');
const resultPanel = document.getElementById('resultPanel');
const bpmValue = document.getElementById('bpmValue');
const confidence = document.getElementById('confidence');
const halfBpm = document.getElementById('halfBpm');
const beatInterval = document.getElementById('beatInterval');
const doubleBpm = document.getElementById('doubleBpm');
const tempoCanvas = document.getElementById('tempoCanvas');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#ec4899'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

detectBtn.addEventListener('click', detectBPM);

async function handleFile(file) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  detectBtn.disabled = false;
  resultPanel.classList.remove('show');
}

function detectBPM() {
  if (!audioBuffer) return;

  detectBtn.disabled = true;
  detectBtn.innerHTML = '<span>⏳</span> 分析中...';

  setTimeout(() => {
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Mix to mono
    const monoData = new Float32Array(length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[i] / numChannels;
      }
    }

    // Low-pass filter to focus on bass (kick drum detection)
    const filtered = lowPassFilter(monoData, sr, 200);

    // Calculate onset detection function (energy differences)
    const hopSize = Math.floor(sr * 0.01); // 10ms hop
    const windowSize = Math.floor(sr * 0.02); // 20ms window
    const numFrames = Math.floor((length - windowSize) / hopSize);
    const onsetFunction = new Float32Array(numFrames);

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      let energy = 0;
      for (let i = 0; i < windowSize; i++) {
        energy += filtered[start + i] * filtered[start + i];
      }
      onsetFunction[frame] = energy;
    }

    // Calculate differential (changes in energy)
    const differential = new Float32Array(numFrames - 1);
    for (let i = 1; i < numFrames; i++) {
      differential[i - 1] = Math.max(0, onsetFunction[i] - onsetFunction[i - 1]);
    }

    // Autocorrelation for tempo detection
    const minBpm = 60;
    const maxBpm = 200;
    const minLag = Math.floor((60 / maxBpm) * (sr / hopSize));
    const maxLag = Math.floor((60 / minBpm) * (sr / hopSize));

    const correlation = new Float32Array(maxLag - minLag + 1);
    let maxCorr = 0;
    let bestLag = minLag;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      const count = differential.length - lag;
      for (let i = 0; i < count; i++) {
        sum += differential[i] * differential[i + lag];
      }
      correlation[lag - minLag] = sum / count;

      if (correlation[lag - minLag] > maxCorr) {
        maxCorr = correlation[lag - minLag];
        bestLag = lag;
      }
    }

    // Calculate BPM from lag
    const detectedBpm = 60 / ((bestLag * hopSize) / sr);

    // Calculate confidence (ratio of best correlation to average)
    const avgCorr = correlation.reduce((a, b) => a + b, 0) / correlation.length;
    const confidenceValue = maxCorr / avgCorr;
    const confidencePercent = Math.min(100, Math.round(confidenceValue * 20));

    // Display results
    const roundedBpm = Math.round(detectedBpm);
    bpmValue.textContent = roundedBpm;
    confidence.textContent = `信心度: ${confidencePercent}%`;
    halfBpm.textContent = Math.round(detectedBpm / 2) + ' BPM';
    beatInterval.textContent = (60000 / detectedBpm).toFixed(0) + ' ms';
    doubleBpm.textContent = Math.round(detectedBpm * 2) + ' BPM';

    // Draw tempo histogram
    drawTempoHistogram(correlation, minBpm, maxBpm, roundedBpm);

    resultPanel.classList.add('show');

    detectBtn.disabled = false;
    detectBtn.innerHTML = '<span>🎵</span> 偵測 BPM';
  }, 100);
}

function lowPassFilter(data, sr, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sr;
  const alpha = dt / (rc + dt);

  const filtered = new Float32Array(data.length);
  filtered[0] = data[0];

  for (let i = 1; i < data.length; i++) {
    filtered[i] = filtered[i - 1] + alpha * (data[i] - filtered[i - 1]);
  }

  return filtered;
}

function drawTempoHistogram(correlation, minBpm, maxBpm, detectedBpm) {
  const canvas = tempoCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, width, height);

  // Find max for normalization
  const maxCorr = Math.max(...correlation);

  // Draw correlation as histogram
  const bpmRange = maxBpm - minBpm;
  const barWidth = width / correlation.length;

  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, 'rgba(236, 72, 153, 0.2)');
  gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');

  ctx.fillStyle = gradient;

  for (let i = 0; i < correlation.length; i++) {
    const barHeight = (correlation[i] / maxCorr) * height * 0.9;
    const x = i * barWidth;
    const y = height - barHeight;
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  }

  // Highlight detected BPM
  const detectedIdx = Math.round(((detectedBpm - minBpm) / bpmRange) * correlation.length);
  const highlightX = detectedIdx * barWidth;

  ctx.fillStyle = '#ec4899';
  ctx.fillRect(highlightX - 2, 0, 4, height);

  // Draw BPM labels
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';

  for (let bpm = Math.ceil(minBpm / 20) * 20; bpm <= maxBpm; bpm += 20) {
    const x = ((bpm - minBpm) / bpmRange) * width;
    ctx.fillText(bpm + '', x, height - 5);
  }
}
