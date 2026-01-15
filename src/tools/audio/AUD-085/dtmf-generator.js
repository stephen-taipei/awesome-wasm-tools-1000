/**
 * AUD-085: DTMF Tone Generator
 * Generate Dual-Tone Multi-Frequency signaling tones
 */

// DTMF frequency table
const DTMF_FREQ = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], 'A': [697, 1633],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477], 'B': [770, 1633],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], 'C': [852, 1633],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477], 'D': [941, 1633]
};

let processedBlob = null;
const sequenceInput = document.getElementById('sequence');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');
const keys = document.querySelectorAll('.key');

keys.forEach(key => {
  key.addEventListener('click', () => {
    const char = key.dataset.key;
    sequenceInput.value += char;
    key.classList.add('active');
    setTimeout(() => key.classList.remove('active'), 200);
    playTone(char);
  });
});

generateBtn.addEventListener('click', generateDTMF);
downloadBtn.addEventListener('click', downloadResult);

function playTone(char) {
  if (!DTMF_FREQ[char]) return;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const [f1, f2] = DTMF_FREQ[char];

  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc1.frequency.value = f1;
  osc2.frequency.value = f2;
  gain.gain.value = 0.3;

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);

  osc1.start();
  osc2.start();

  setTimeout(() => {
    osc1.stop();
    osc2.stop();
    audioCtx.close();
  }, 150);
}

function generateDTMF() {
  const sequence = sequenceInput.value.toUpperCase();
  if (!sequence) {
    alert('請輸入號碼序列');
    return;
  }

  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>⏳</span> 生成中...';

  setTimeout(() => {
    const sr = 44100;
    const toneDuration = 0.15; // 150ms per tone
    const pauseDuration = 0.05; // 50ms pause between tones
    const totalDuration = sequence.length * (toneDuration + pauseDuration);
    const numSamples = Math.ceil(totalDuration * sr);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(1, numSamples, sr);
    const data = buffer.getChannelData(0);

    let offset = 0;
    for (const char of sequence) {
      if (DTMF_FREQ[char]) {
        const [f1, f2] = DTMF_FREQ[char];
        const tonesamples = Math.floor(toneDuration * sr);

        for (let i = 0; i < tonesamples; i++) {
          const t = i / sr;
          const envelope = Math.min(1, Math.min(i / (sr * 0.01), (tonesamples - i) / (sr * 0.01)));
          data[offset + i] = (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t)) * 0.3 * envelope;
        }
        offset += tonesamples;
      }
      offset += Math.floor(pauseDuration * sr);
    }

    processedBlob = audioBufferToWav(buffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);
    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>📞</span> 生成 DTMF';
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

function downloadResult() {
  if (!processedBlob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `dtmf_${sequenceInput.value}.wav`;
  link.click();
}
