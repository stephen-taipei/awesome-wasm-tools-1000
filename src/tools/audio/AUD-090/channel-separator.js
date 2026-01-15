/**
 * AUD-090: Channel Separator
 * Separate stereo audio into left and right channel files
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let leftBlob = null;
let rightBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const channels = document.getElementById('channels');
const separateBtn = document.getElementById('separateBtn');
const resultPanel = document.getElementById('resultPanel');
const leftPreview = document.getElementById('leftPreview');
const rightPreview = document.getElementById('rightPreview');
const downloadLeft = document.getElementById('downloadLeft');
const downloadRight = document.getElementById('downloadRight');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#8b5cf6'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
separateBtn.addEventListener('click', separateChannels);
downloadLeft.addEventListener('click', () => downloadChannel('left'));
downloadRight.addEventListener('click', () => downloadChannel('right'));

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  fileName.textContent = file.name;
  channels.textContent = audioBuffer.numberOfChannels === 2 ? '立體聲' : '單聲道';

  fileInfo.classList.add('show');
  separateBtn.disabled = audioBuffer.numberOfChannels < 2;
  resultPanel.classList.remove('show');

  if (audioBuffer.numberOfChannels < 2) {
    alert('此檔案是單聲道，無法分離聲道');
  }
}

function separateChannels() {
  if (!audioBuffer || audioBuffer.numberOfChannels < 2) return;

  separateBtn.disabled = true;
  separateBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const length = audioBuffer.length;
    const sr = audioBuffer.sampleRate;

    // Create mono buffers for each channel
    const leftBuffer = ctx.createBuffer(1, length, sr);
    const rightBuffer = ctx.createBuffer(1, length, sr);

    const leftData = leftBuffer.getChannelData(0);
    const rightData = rightBuffer.getChannelData(0);
    const srcLeft = audioBuffer.getChannelData(0);
    const srcRight = audioBuffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      leftData[i] = srcLeft[i];
      rightData[i] = srcRight[i];
    }

    leftBlob = audioBufferToWav(leftBuffer, sr);
    rightBlob = audioBufferToWav(rightBuffer, sr);

    leftPreview.src = URL.createObjectURL(leftBlob);
    rightPreview.src = URL.createObjectURL(rightBlob);

    resultPanel.classList.add('show');

    separateBtn.disabled = false;
    separateBtn.innerHTML = '<span>📤</span> 分離聲道';
  }, 100);
}

function audioBufferToWav(buffer, sampleRate) {
  const numChannels = 1;
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

  const data = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function downloadChannel(channel) {
  const blob = channel === 'left' ? leftBlob : rightBlob;
  if (!blob) return;

  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${baseName}_${channel === 'left' ? 'L' : 'R'}.wav`;
  link.click();
}
