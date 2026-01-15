/**
 * AUD-077: Audio Waveform Generator
 * Generate waveform images from audio files
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const waveformContainer = document.getElementById('waveformContainer');
const settingsPanel = document.getElementById('settingsPanel');
const canvas = document.getElementById('waveformCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const waveColor = document.getElementById('waveColor');
const bgColor = document.getElementById('bgColor');
const waveStyle = document.getElementById('waveStyle');

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#f857a6'; });
uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#4a4a6a'; });
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = '#4a4a6a';
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

generateBtn.addEventListener('click', generateWaveform);
downloadBtn.addEventListener('click', downloadImage);
waveColor.addEventListener('change', generateWaveform);
bgColor.addEventListener('change', generateWaveform);
waveStyle.addEventListener('change', generateWaveform);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  waveformContainer.classList.add('show');
  settingsPanel.classList.add('show');
  generateBtn.disabled = false;

  resizeCanvas();
  generateWaveform();
}

function resizeCanvas() {
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
}

function generateWaveform() {
  if (!audioBuffer) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const style = waveStyle.value;

  ctx.fillStyle = bgColor.value;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = waveColor.value;
  ctx.strokeStyle = waveColor.value;
  ctx.lineWidth = 2;

  if (style === 'bars') {
    const barWidth = Math.max(2, width / (data.length / step) - 1);
    for (let i = 0; i < width; i += barWidth + 1) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = Math.floor(i / barWidth) * step + j;
        if (idx < data.length) {
          if (data[idx] < min) min = data[idx];
          if (data[idx] > max) max = data[idx];
        }
      }
      const barHeight = Math.max(2, (max - min) * height / 2);
      ctx.fillRect(i, (height - barHeight) / 2, barWidth, barHeight);
    }
  } else if (style === 'mirror') {
    for (let i = 0; i < width; i++) {
      let min = 1.0, max = -1.0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) {
          if (data[idx] < min) min = data[idx];
          if (data[idx] > max) max = data[idx];
        }
      }
      const y1 = height / 2 + min * height / 2;
      const y2 = height / 2 + max * height / 2;
      ctx.fillRect(i, y1, 1, y2 - y1);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i < width; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) sum += data[idx];
      }
      const avg = sum / step;
      const y = height / 2 + avg * height / 2;
      ctx.lineTo(i, y);
    }
    ctx.stroke();
  }

  downloadBtn.style.display = 'flex';
}

function downloadImage() {
  const link = document.createElement('a');
  link.download = (currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'waveform') + '_waveform.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (audioBuffer) generateWaveform();
});
