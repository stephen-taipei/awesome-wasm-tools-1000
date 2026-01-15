/**
 * AUD-081: Sine Wave Generator
 * Generate pure sine wave audio files
 */

let processedBlob = null;

const frequencySlider = document.getElementById('frequency');
const freqInput = document.getElementById('freqInput');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const sampleRate = document.getElementById('sampleRate');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');
const waveCanvas = document.getElementById('waveCanvas');
const ctx = waveCanvas.getContext('2d');

frequencySlider.addEventListener('input', () => {
  freqInput.value = frequencySlider.value;
});

freqInput.addEventListener('input', () => {
  frequencySlider.value = freqInput.value;
});

durationSlider.addEventListener('input', () => {
  durationValue.textContent = durationSlider.value + ' 秒';
});

volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = volumeSlider.value + '%';
});

generateBtn.addEventListener('click', generateSineWave);
downloadBtn.addEventListener('click', downloadResult);

function generateSineWave() {
  const freq = parseInt(freqInput.value);
  const dur = parseInt(durationSlider.value);
  const vol = parseInt(volumeSlider.value) / 100;
  const sr = parseInt(sampleRate.value);

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>⏳</span> 生成中...';

  setTimeout(() => {
    const numSamples = dur * sr;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(2, numSamples, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < numSamples; i++) {
        data[i] = Math.sin(2 * Math.PI * freq * i / sr) * vol;
      }
    }

    processedBlob = audioBufferToWav(buffer, sr);

    audioPreview.src = URL.createObjectURL(processedBlob);
    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    drawWaveform(freq, vol);

    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>🎵</span> 生成正弦波';
  }, 100);
}

function drawWaveform(freq, vol) {
  waveCanvas.width = waveCanvas.offsetWidth * 2;
  waveCanvas.height = waveCanvas.offsetHeight * 2;

  const width = waveCanvas.width;
  const height = waveCanvas.height;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const periods = Math.min(freq / 50, 10);
  for (let x = 0; x < width; x++) {
    const t = (x / width) * periods * 2 * Math.PI;
    const y = height / 2 - Math.sin(t) * (height / 2 - 10) * vol;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function audioBufferToWav(buffer, sampleRate) {
  const numChannels = buffer.numberOfChannels;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function downloadResult() {
  if (!processedBlob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `sine_${freqInput.value}Hz_${durationSlider.value}s.wav`;
  link.click();
  URL.revokeObjectURL(link.href);
}
