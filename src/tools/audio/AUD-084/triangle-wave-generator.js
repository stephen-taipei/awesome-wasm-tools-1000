/**
 * AUD-084: Triangle Wave Generator
 */

let processedBlob = null;
const frequencySlider = document.getElementById('frequency');
const freqInput = document.getElementById('freqInput');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');
const waveCanvas = document.getElementById('waveCanvas');
const ctx = waveCanvas.getContext('2d');

frequencySlider.addEventListener('input', () => freqInput.value = frequencySlider.value);
freqInput.addEventListener('input', () => frequencySlider.value = freqInput.value);
durationSlider.addEventListener('input', () => durationValue.textContent = durationSlider.value + ' 秒');
volumeSlider.addEventListener('input', () => volumeValue.textContent = volumeSlider.value + '%');

generateBtn.addEventListener('click', generateTriangleWave);
downloadBtn.addEventListener('click', downloadResult);

function generateTriangleWave() {
  const freq = parseInt(freqInput.value);
  const dur = parseInt(durationSlider.value);
  const vol = parseInt(volumeSlider.value) / 100;
  const sr = 44100;

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>⏳</span> 生成中...';

  setTimeout(() => {
    const numSamples = dur * sr;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(2, numSamples, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < numSamples; i++) {
        const t = (i / sr) * freq;
        const phase = t - Math.floor(t);
        // Triangle wave: goes up from -1 to 1 in first half, down in second half
        data[i] = (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase) * vol;
      }
    }

    processedBlob = audioBufferToWav(buffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);
    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    drawWaveform(vol);

    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>🎵</span> 生成三角波';
  }, 100);
}

function drawWaveform(vol) {
  waveCanvas.width = waveCanvas.offsetWidth * 2;
  waveCanvas.height = waveCanvas.offsetHeight * 2;
  const width = waveCanvas.width, height = waveCanvas.height;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const periods = 4;
  for (let x = 0; x < width; x++) {
    const phase = ((x / width) * periods) % 1;
    const val = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
    const y = height / 2 - val * (height / 2 - 10) * vol;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
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
  link.download = `triangle_${freqInput.value}Hz.wav`;
  link.click();
}
