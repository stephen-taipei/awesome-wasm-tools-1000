/**
 * AUD-089: Audio Reverse
 * Reverse audio playback
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const duration = document.getElementById('duration');
const sampleRate = document.getElementById('sampleRate');
const reverseBtn = document.getElementById('reverseBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#ef4444'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
reverseBtn.addEventListener('click', reverseAudio);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  fileName.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
  duration.textContent = formatDuration(audioBuffer.duration);
  sampleRate.textContent = audioBuffer.sampleRate + ' Hz';

  fileInfo.classList.add('show');
  reverseBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function reverseAudio() {
  if (!audioBuffer) return;

  reverseBtn.disabled = true;
  reverseBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sr = audioBuffer.sampleRate;

    const newBuffer = ctx.createBuffer(numChannels, length, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[length - 1 - i];
      }
    }

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    reverseBtn.disabled = false;
    reverseBtn.innerHTML = '<span>⏪</span> 倒放音訊';
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
  link.download = `${baseName}_reversed.wav`;
  link.click();
}
