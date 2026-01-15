/**
 * AUD-091: Channel Merger
 * Merge left and right channel files into stereo
 */

let audioContext = null;
let leftBuffer = null;
let rightBuffer = null;
let leftFile = null;
let rightFile = null;
let processedBlob = null;

const uploadAreaLeft = document.getElementById('uploadAreaLeft');
const uploadAreaRight = document.getElementById('uploadAreaRight');
const fileInputLeft = document.getElementById('fileInputLeft');
const fileInputRight = document.getElementById('fileInputRight');
const fileNameLeft = document.getElementById('fileNameLeft');
const fileNameRight = document.getElementById('fileNameRight');
const mergeBtn = document.getElementById('mergeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const resultInfo = document.getElementById('resultInfo');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

// Left channel upload
uploadAreaLeft.addEventListener('click', () => fileInputLeft.click());
uploadAreaLeft.addEventListener('dragover', (e) => { e.preventDefault(); uploadAreaLeft.style.borderColor = '#06b6d4'; });
uploadAreaLeft.addEventListener('dragleave', () => uploadAreaLeft.style.borderColor = leftBuffer ? '#10b981' : '#4a4a6a');
uploadAreaLeft.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'left'); });
fileInputLeft.addEventListener('change', (e) => handleFile(e.target.files[0], 'left'));

// Right channel upload
uploadAreaRight.addEventListener('click', () => fileInputRight.click());
uploadAreaRight.addEventListener('dragover', (e) => { e.preventDefault(); uploadAreaRight.style.borderColor = '#06b6d4'; });
uploadAreaRight.addEventListener('dragleave', () => uploadAreaRight.style.borderColor = rightBuffer ? '#10b981' : '#4a4a6a');
uploadAreaRight.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 'right'); });
fileInputRight.addEventListener('change', (e) => handleFile(e.target.files[0], 'right'));

mergeBtn.addEventListener('click', mergeChannels);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file, channel) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);

  if (channel === 'left') {
    leftBuffer = buffer;
    leftFile = file;
    fileNameLeft.textContent = file.name;
    uploadAreaLeft.classList.add('has-file');
  } else {
    rightBuffer = buffer;
    rightFile = file;
    fileNameRight.textContent = file.name;
    uploadAreaRight.classList.add('has-file');
  }

  mergeBtn.disabled = !(leftBuffer && rightBuffer);
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function mergeChannels() {
  if (!leftBuffer || !rightBuffer) return;

  mergeBtn.disabled = true;
  mergeBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();

    // Use the higher sample rate
    const sr = Math.max(leftBuffer.sampleRate, rightBuffer.sampleRate);

    // Use the longer duration
    const length = Math.max(leftBuffer.length, rightBuffer.length);

    // Create stereo buffer
    const stereoBuffer = ctx.createBuffer(2, length, sr);

    // Get channel data (use first channel if stereo)
    const leftData = leftBuffer.getChannelData(0);
    const rightData = rightBuffer.getChannelData(0);

    const stereoLeft = stereoBuffer.getChannelData(0);
    const stereoRight = stereoBuffer.getChannelData(1);

    // Copy left channel
    for (let i = 0; i < leftBuffer.length; i++) {
      stereoLeft[i] = leftData[i];
    }

    // Copy right channel
    for (let i = 0; i < rightBuffer.length; i++) {
      stereoRight[i] = rightData[i];
    }

    processedBlob = audioBufferToWav(stereoBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultInfo.textContent = `立體聲輸出: ${stereoBuffer.duration.toFixed(2)}s @ ${sr}Hz`;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    mergeBtn.disabled = false;
    mergeBtn.innerHTML = '<span>🔗</span> 合併聲道';
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
  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = 'merged_stereo.wav';
  link.click();
}
