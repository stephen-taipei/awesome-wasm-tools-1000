/**
 * AUD-094: Crossfade
 * Crossfade two audio files together
 */

let audioContext = null;
let buffer1 = null;
let buffer2 = null;
let processedBlob = null;

const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const fileName1 = document.getElementById('fileName1');
const fileName2 = document.getElementById('fileName2');
const settingsPanel = document.getElementById('settingsPanel');
const fadeTime = document.getElementById('fadeTime');
const fadeTimeValue = document.getElementById('fadeTimeValue');
const fadeCurve = document.getElementById('fadeCurve');
const crossfadeBtn = document.getElementById('crossfadeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const resultInfo = document.getElementById('resultInfo');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

// Track 1 upload
uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea1.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea1.style.borderColor = '#a855f7'; });
uploadArea1.addEventListener('dragleave', () => uploadArea1.style.borderColor = buffer1 ? '#10b981' : '#4a4a6a');
uploadArea1.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 1); });
fileInput1.addEventListener('change', (e) => handleFile(e.target.files[0], 1));

// Track 2 upload
uploadArea2.addEventListener('click', () => fileInput2.click());
uploadArea2.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea2.style.borderColor = '#a855f7'; });
uploadArea2.addEventListener('dragleave', () => uploadArea2.style.borderColor = buffer2 ? '#10b981' : '#4a4a6a');
uploadArea2.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], 2); });
fileInput2.addEventListener('change', (e) => handleFile(e.target.files[0], 2));

fadeTime.addEventListener('input', () => fadeTimeValue.textContent = fadeTime.value + ' 秒');

crossfadeBtn.addEventListener('click', processCrossfade);
downloadBtn.addEventListener('click', downloadResult);

async function handleFile(file, track) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);

  if (track === 1) {
    buffer1 = buffer;
    fileName1.textContent = file.name;
    uploadArea1.classList.add('has-file');
  } else {
    buffer2 = buffer;
    fileName2.textContent = file.name;
    uploadArea2.classList.add('has-file');
  }

  if (buffer1 && buffer2) {
    settingsPanel.classList.add('show');
    crossfadeBtn.disabled = false;
  }
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function getCurveValue(t, curve) {
  switch (curve) {
    case 'linear':
      return t;
    case 'equal-power':
      return Math.sqrt(t);
    case 'exponential':
      return t * t;
    case 'logarithmic':
      return Math.log10(1 + t * 9) / Math.log10(10);
    default:
      return t;
  }
}

function processCrossfade() {
  if (!buffer1 || !buffer2) return;

  crossfadeBtn.disabled = true;
  crossfadeBtn.innerHTML = '<span>⏳</span> 處理中...';

  setTimeout(() => {
    const ctx = getAudioContext();
    const fadeSeconds = parseFloat(fadeTime.value);
    const curve = fadeCurve.value;

    // Use the higher sample rate
    const sr = Math.max(buffer1.sampleRate, buffer2.sampleRate);
    const numChannels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);
    const fadeSamples = Math.floor(fadeSeconds * sr);

    // Calculate total length: track1 + track2 - fadeTime
    const totalLength = buffer1.length + buffer2.length - fadeSamples;
    const newBuffer = ctx.createBuffer(numChannels, totalLength, sr);

    for (let ch = 0; ch < numChannels; ch++) {
      const outputData = newBuffer.getChannelData(ch);

      // Get input data (use channel 0 if mono)
      const input1 = buffer1.getChannelData(Math.min(ch, buffer1.numberOfChannels - 1));
      const input2 = buffer2.getChannelData(Math.min(ch, buffer2.numberOfChannels - 1));

      // Copy first part of track 1 (before crossfade)
      const track1FadeStart = buffer1.length - fadeSamples;
      for (let i = 0; i < track1FadeStart; i++) {
        outputData[i] = input1[i];
      }

      // Crossfade region
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const fadeOut = 1 - getCurveValue(t, curve);
        const fadeIn = getCurveValue(t, curve);

        const sample1 = input1[track1FadeStart + i] * fadeOut;
        const sample2 = input2[i] * fadeIn;

        outputData[track1FadeStart + i] = sample1 + sample2;
      }

      // Copy remaining part of track 2 (after crossfade)
      for (let i = fadeSamples; i < buffer2.length; i++) {
        outputData[track1FadeStart + i] = input2[i];
      }
    }

    processedBlob = audioBufferToWav(newBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultInfo.textContent = `輸出時長: ${newBuffer.duration.toFixed(2)} 秒 | 交叉淡化: ${fadeSeconds} 秒`;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    crossfadeBtn.disabled = false;
    crossfadeBtn.innerHTML = '<span>🔀</span> 交叉淡化';
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
  link.download = 'crossfade_output.wav';
  link.click();
}
