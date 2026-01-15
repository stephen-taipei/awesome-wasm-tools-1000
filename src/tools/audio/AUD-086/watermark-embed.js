/**
 * AUD-086: Audio Watermark Embed
 * Embed hidden watermarks into audio files using LSB technique
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const watermarkText = document.getElementById('watermarkText');
const strengthSlider = document.getElementById('strength');
const strengthValue = document.getElementById('strengthValue');
const embedBtn = document.getElementById('embedBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#ec4899'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
strengthSlider.addEventListener('input', () => strengthValue.textContent = strengthSlider.value);
embedBtn.addEventListener('click', embedWatermark);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;
  fileName.textContent = file.name;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  fileInfo.classList.add('show');
  embedBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function textToBinary(text) {
  let binary = '';
  for (let i = 0; i < text.length; i++) {
    binary += text.charCodeAt(i).toString(2).padStart(8, '0');
  }
  return binary;
}

function embedWatermark() {
  const text = watermarkText.value;
  if (!text) {
    alert('請輸入水印文字');
    return;
  }
  if (!audioBuffer) return;

  embedBtn.disabled = true;
  embedBtn.innerHTML = '<span>⏳</span> 嵌入中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sr = audioBuffer.sampleRate;
    const strength = parseInt(strengthSlider.value) / 1000;

    const newBuffer = ctx.createBuffer(numChannels, length, sr);

    // Prepare watermark data
    const marker = '###WM###';
    const fullText = marker + text + marker;
    const binary = textToBinary(fullText);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);

      // Copy original data
      for (let i = 0; i < length; i++) {
        outputData[i] = inputData[i];
      }

      // Embed watermark using spread spectrum
      const spreadFactor = Math.floor(length / binary.length);
      for (let i = 0; i < binary.length; i++) {
        const bit = parseInt(binary[i]);
        const idx = i * spreadFactor;
        if (idx < length) {
          // Add or subtract small value based on bit
          const delta = (bit * 2 - 1) * strength;
          outputData[idx] = Math.max(-1, Math.min(1, outputData[idx] + delta));
        }
      }
    }

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);
    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    embedBtn.disabled = false;
    embedBtn.innerHTML = '<span>🔏</span> 嵌入水印';
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
  link.download = `${baseName}_watermarked.wav`;
  link.click();
}
