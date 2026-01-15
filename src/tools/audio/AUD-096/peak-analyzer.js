/**
 * AUD-096: Peak Analyzer
 * Analyze audio peaks and dynamic range
 */

let audioContext = null;
let audioBuffer = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultPanel = document.getElementById('resultPanel');
const statsGrid = document.getElementById('statsGrid');
const peakCanvas = document.getElementById('peakCanvas');
const peakListContent = document.getElementById('peakListContent');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#f97316'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

analyzeBtn.addEventListener('click', analyzePeaks);

async function handleFile(file) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  analyzeBtn.disabled = false;
  resultPanel.classList.remove('show');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

function analyzePeaks() {
  if (!audioBuffer) return;

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<span>⏳</span> 分析中...';

  setTimeout(() => {
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Mix to mono for analysis
    const mixedData = new Float32Array(length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mixedData[i] = Math.max(mixedData[i], Math.abs(channelData[i]));
      }
    }

    // Find peaks
    let truePeak = 0;
    let truePeakSample = 0;
    let sumSquared = 0;
    let minSample = 0;

    const peaks = [];
    const windowSize = Math.floor(sr * 0.1); // 100ms windows

    for (let i = 0; i < length; i++) {
      const sample = mixedData[i];
      sumSquared += sample * sample;

      if (sample > truePeak) {
        truePeak = sample;
        truePeakSample = i;
      }

      minSample = Math.min(minSample, Math.abs(sample));

      // Find local peaks (every 100ms window)
      if (i > 0 && i % windowSize === 0) {
        let windowPeak = 0;
        let windowPeakIdx = i - windowSize;
        for (let j = i - windowSize; j < i; j++) {
          if (mixedData[j] > windowPeak) {
            windowPeak = mixedData[j];
            windowPeakIdx = j;
          }
        }
        if (windowPeak > 0.1) {
          peaks.push({
            time: windowPeakIdx / sr,
            level: windowPeak,
            levelDb: 20 * Math.log10(windowPeak)
          });
        }
      }
    }

    // Sort peaks by level
    peaks.sort((a, b) => b.level - a.level);
    const topPeaks = peaks.slice(0, 10);

    // Calculate statistics
    const rms = Math.sqrt(sumSquared / length);
    const truePeakDb = 20 * Math.log10(truePeak);
    const rmsDb = 20 * Math.log10(rms);
    const dynamicRange = truePeakDb - rmsDb;
    const crestFactor = truePeak / rms;

    // Display stats
    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">True Peak</div>
        <div class="stat-value">${truePeakDb.toFixed(1)} dBFS</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">RMS 平均</div>
        <div class="stat-value">${rmsDb.toFixed(1)} dBFS</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">動態範圍</div>
        <div class="stat-value">${dynamicRange.toFixed(1)} dB</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Crest Factor</div>
        <div class="stat-value">${crestFactor.toFixed(2)}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">峰值位置</div>
        <div class="stat-value">${formatTime(truePeakSample / sr)}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">總時長</div>
        <div class="stat-value">${audioBuffer.duration.toFixed(2)}s</div>
      </div>
    `;

    // Display peak list
    peakListContent.innerHTML = topPeaks.map((peak, idx) => `
      <div class="peak-item">
        <span class="peak-time">#${idx + 1} @ ${formatTime(peak.time)}</span>
        <span class="peak-level">${peak.levelDb.toFixed(1)} dBFS</span>
      </div>
    `).join('');

    // Draw peak envelope
    drawPeakEnvelope(mixedData, sr);

    resultPanel.classList.add('show');

    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<span>📈</span> 分析峰值';
  }, 100);
}

function drawPeakEnvelope(data, sr) {
  const canvas = peakCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, width, height);

  // Calculate peak envelope (downsample for display)
  const samplesPerPixel = Math.ceil(data.length / width);
  const envelope = [];

  for (let x = 0; x < width; x++) {
    const start = x * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, data.length);
    let max = 0;
    for (let i = start; i < end; i++) {
      max = Math.max(max, data[i]);
    }
    envelope.push(max);
  }

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
  gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
  gradient.addColorStop(1, 'rgba(249, 115, 22, 0.1)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, height);

  for (let x = 0; x < envelope.length; x++) {
    const y = height - (envelope[x] * height);
    ctx.lineTo(x, y);
  }

  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Draw peak line
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < envelope.length; x++) {
    const y = height - (envelope[x] * height);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Draw threshold lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.setLineDash([5, 5]);

  // -3dB line
  const db3 = Math.pow(10, -3/20);
  ctx.beginPath();
  ctx.moveTo(0, height - (db3 * height));
  ctx.lineTo(width, height - (db3 * height));
  ctx.stroke();

  // -6dB line
  const db6 = Math.pow(10, -6/20);
  ctx.beginPath();
  ctx.moveTo(0, height - (db6 * height));
  ctx.lineTo(width, height - (db6 * height));
  ctx.stroke();

  ctx.setLineDash([]);
}
