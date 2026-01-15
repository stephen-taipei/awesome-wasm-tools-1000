/**
 * AUD-095: Loudness Normalization
 * Normalize audio to target loudness (LUFS)
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;
let measuredLufs = 0;
let measuredPeak = 0;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const targetPreset = document.getElementById('targetPreset');
const customTargetGroup = document.getElementById('customTargetGroup');
const targetLufs = document.getElementById('targetLufs');
const targetValue = document.getElementById('targetValue');
const currentLufs = document.getElementById('currentLufs');
const currentPeak = document.getElementById('currentPeak');
const normalizeBtn = document.getElementById('normalizeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const resultInfo = document.getElementById('resultInfo');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#22c55e'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

targetPreset.addEventListener('change', () => {
  customTargetGroup.style.display = targetPreset.value === 'custom' ? 'block' : 'none';
});

targetLufs.addEventListener('input', () => targetValue.textContent = targetLufs.value + ' LUFS');

normalizeBtn.addEventListener('click', normalizeLoudness);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  settingsPanel.classList.add('show');
  normalizeBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';

  // Analyze current loudness
  analyzeLoudness();
}

function analyzeLoudness() {
  currentLufs.textContent = '分析中...';
  currentPeak.textContent = '分析中...';

  setTimeout(() => {
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Calculate RMS (simplified LUFS approximation)
    let sumSquared = 0;
    let peak = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const sample = data[i];
        sumSquared += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
    }

    const rms = Math.sqrt(sumSquared / (length * numChannels));
    measuredLufs = 20 * Math.log10(rms) - 0.691; // Simplified LUFS approximation
    measuredPeak = 20 * Math.log10(peak);

    currentLufs.textContent = measuredLufs.toFixed(1) + ' LUFS';
    currentPeak.textContent = measuredPeak.toFixed(1) + ' dBFS';
  }, 100);
}

function normalizeLoudness() {
  if (!audioBuffer) return;

  normalizeBtn.disabled = true;
  normalizeBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const targetLufsValue = targetPreset.value === 'custom'
      ? parseFloat(targetLufs.value)
      : parseFloat(targetPreset.value);

    const ctx = getAudioContext();
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Calculate gain needed
    const gainDb = targetLufsValue - measuredLufs;
    let gain = Math.pow(10, gainDb / 20);

    // Limit gain to prevent clipping (true peak limiting)
    const maxGain = 1 / Math.pow(10, measuredPeak / 20);
    if (gain > maxGain * 0.99) {
      gain = maxGain * 0.99; // Leave 0.1dB headroom
    }

    const newBuffer = ctx.createBuffer(numChannels, length, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i] * gain;
      }
    }

    // Measure new loudness
    let sumSquared = 0;
    let newPeak = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const data = newBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        sumSquared += data[i] * data[i];
        newPeak = Math.max(newPeak, Math.abs(data[i]));
      }
    }
    const newRms = Math.sqrt(sumSquared / (length * numChannels));
    const newLufs = 20 * Math.log10(newRms) - 0.691;
    const newPeakDb = 20 * Math.log10(newPeak);

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultInfo.innerHTML = `
      <p>原始響度: ${measuredLufs.toFixed(1)} LUFS -> 新響度: ${newLufs.toFixed(1)} LUFS</p>
      <p>增益調整: ${gainDb.toFixed(1)} dB (實際: ${(20 * Math.log10(gain)).toFixed(1)} dB)</p>
      <p>峰值: ${newPeakDb.toFixed(1)} dBFS</p>
    `;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    normalizeBtn.disabled = false;
    normalizeBtn.innerHTML = '<span>📊</span> 標準化響度';
  }, 100);
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
  link.download = `${baseName}_normalized.wav`;
  link.click();
}
