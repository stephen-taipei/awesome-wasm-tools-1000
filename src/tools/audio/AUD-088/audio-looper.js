/**
 * AUD-088: Audio Looper
 * Loop audio segments with optional crossfade
 */

let audioContext = null;
let audioBuffer = null;
let currentFile = null;
let processedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const loopCount = document.getElementById('loopCount');
const loopValue = document.getElementById('loopValue');
const crossfade = document.getElementById('crossfade');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const resultInfo = document.getElementById('resultInfo');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#f59e0b'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
loopCount.addEventListener('input', () => loopValue.textContent = loopCount.value + ' 次');
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  settingsPanel.classList.add('show');
  processBtn.disabled = false;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function processAudio() {
  if (!audioBuffer) return;

  const loops = parseInt(loopCount.value);
  const fadeMs = parseInt(crossfade.value);

  processBtn.disabled = true;
  processBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const sr = audioBuffer.sampleRate;
    const originalLength = audioBuffer.length;
    const fadeSamples = Math.floor(fadeMs * sr / 1000);

    // Calculate total length with crossfade overlap
    const totalLength = originalLength * loops - fadeSamples * (loops - 1);
    const newBuffer = ctx.createBuffer(numChannels, totalLength, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const inputData = audioBuffer.getChannelData(ch);
      const outputData = newBuffer.getChannelData(ch);

      let offset = 0;
      for (let loop = 0; loop < loops; loop++) {
        for (let i = 0; i < originalLength; i++) {
          const outIdx = offset + i;
          if (outIdx >= totalLength) break;

          let sample = inputData[i];

          // Apply crossfade
          if (fadeSamples > 0) {
            // Fade in at start of each loop (except first)
            if (loop > 0 && i < fadeSamples) {
              const fadeIn = i / fadeSamples;
              sample *= fadeIn;
            }
            // Fade out at end of each loop (except last)
            if (loop < loops - 1 && i >= originalLength - fadeSamples) {
              const fadeOut = (originalLength - i) / fadeSamples;
              sample *= fadeOut;
            }
          }

          outputData[outIdx] = (outputData[outIdx] || 0) + sample;
        }
        offset += originalLength - fadeSamples;
      }

      // Normalize if needed
      let max = 0;
      for (let i = 0; i < totalLength; i++) {
        max = Math.max(max, Math.abs(outputData[i]));
      }
      if (max > 1) {
        for (let i = 0; i < totalLength; i++) {
          outputData[i] /= max;
        }
      }
    }

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    const originalDur = (audioBuffer.duration).toFixed(2);
    const newDur = (newBuffer.duration).toFixed(2);
    resultInfo.textContent = `原始時長: ${originalDur}s -> 循環後: ${newDur}s (${loops}次)`;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    processBtn.disabled = false;
    processBtn.innerHTML = '<span>🔄</span> 生成循環';
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
  link.download = `${baseName}_loop${loopCount.value}x.wav`;
  link.click();
}
