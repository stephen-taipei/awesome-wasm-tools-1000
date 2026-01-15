/**
 * AUD-093: Auto Trim
 * Automatically remove silence from beginning and end of audio
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const threshold = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const trimStart = document.getElementById('trimStart');
const trimEnd = document.getElementById('trimEnd');
const trimBtn = document.getElementById('trimBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');
const trimInfo = document.getElementById('trimInfo');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#f43f5e'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

threshold.addEventListener('input', () => thresholdValue.textContent = threshold.value + ' dB');

trimBtn.addEventListener('click', autoTrim);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  settingsPanel.classList.add('show');
  trimBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function autoTrim() {
  if (!audioBuffer) return;

  trimBtn.disabled = true;
  trimBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const thresholdDb = parseFloat(threshold.value);
    const doTrimStart = trimStart.checked;
    const doTrimEnd = trimEnd.checked;

    const ctx = getAudioContext();
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Convert dB threshold to linear amplitude
    const thresholdLinear = Math.pow(10, thresholdDb / 20);

    // Mix all channels for analysis
    const mixedData = new Float32Array(length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mixedData[i] = Math.max(mixedData[i], Math.abs(channelData[i]));
      }
    }

    // Find start position (first non-silent sample)
    let startSample = 0;
    if (doTrimStart) {
      for (let i = 0; i < length; i++) {
        if (mixedData[i] >= thresholdLinear) {
          startSample = i;
          break;
        }
      }
    }

    // Find end position (last non-silent sample)
    let endSample = length;
    if (doTrimEnd) {
      for (let i = length - 1; i >= 0; i--) {
        if (mixedData[i] >= thresholdLinear) {
          endSample = i + 1;
          break;
        }
      }
    }

    // Ensure valid range
    if (endSample <= startSample) {
      alert('裁切後無有效音訊');
      trimBtn.disabled = false;
      trimBtn.innerHTML = '<span>✂️</span> 自動裁切';
      return;
    }

    const newLength = endSample - startSample;
    const newBuffer = ctx.createBuffer(numChannels, newLength, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);
      for (let i = 0; i < newLength; i++) {
        outputData[i] = inputData[startSample + i];
      }
    }

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    const trimmedStart = (startSample / sr).toFixed(2);
    const trimmedEnd = ((length - endSample) / sr).toFixed(2);
    const originalDur = audioBuffer.duration.toFixed(2);
    const newDur = newBuffer.duration.toFixed(2);

    trimInfo.innerHTML = `
      <p>原始時長: ${originalDur} 秒</p>
      <p>裁切後時長: ${newDur} 秒</p>
      <p>開頭裁切: ${trimmedStart} 秒</p>
      <p>結尾裁切: ${trimmedEnd} 秒</p>
    `;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    trimBtn.disabled = false;
    trimBtn.innerHTML = '<span>✂️</span> 自動裁切';
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
  link.download = `${baseName}_trimmed.wav`;
  link.click();
}
