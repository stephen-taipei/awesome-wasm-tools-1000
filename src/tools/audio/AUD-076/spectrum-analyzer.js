/**
 * AUD-076: Audio Spectrum Analyzer
 * Real-time audio spectrum visualization
 */

let audioContext = null;
let analyser = null;
let sourceNode = null;
let audioBuffer = null;
let isPlaying = false;
let animationId = null;
let currentFile = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const spectrumContainer = document.getElementById('spectrumContainer');
const infoPanel = document.getElementById('infoPanel');
const canvas = document.getElementById('spectrumCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const fileName = document.getElementById('fileName');
const duration = document.getElementById('duration');
const sampleRate = document.getElementById('sampleRate');
const peakFreq = document.getElementById('peakFreq');

function setLanguage(lang) {
  // Simple language support
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.connect(audioContext.destination);
  }
  return audioContext;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

playBtn.addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stopBtn.addEventListener('click', stop);

async function handleFile(file) {
  if (!file) return;
  currentFile = file;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  fileName.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
  duration.textContent = formatDuration(audioBuffer.duration);
  sampleRate.textContent = audioBuffer.sampleRate + ' Hz';

  infoPanel.classList.add('show');
  spectrumContainer.classList.add('show');
  playBtn.disabled = false;

  resizeCanvas();
}

function resizeCanvas() {
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
}

function play() {
  if (!audioBuffer) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  if (sourceNode) {
    sourceNode.stop();
  }

  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(analyser);
  sourceNode.start();

  isPlaying = true;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;

  sourceNode.onended = () => {
    if (isPlaying) {
      isPlaying = false;
      playBtn.disabled = false;
      pauseBtn.disabled = true;
    }
  };

  drawSpectrum();
}

function pause() {
  if (audioContext) {
    audioContext.suspend();
    isPlaying = false;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function stop() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode = null;
  }
  isPlaying = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSpectrum() {
  if (!isPlaying) return;

  animationId = requestAnimationFrame(drawSpectrum);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);

  const barWidth = (width / bufferLength) * 2.5;
  let x = 0;
  let maxVal = 0;
  let maxIdx = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height;

    if (dataArray[i] > maxVal) {
      maxVal = dataArray[i];
      maxIdx = i;
    }

    const hue = (i / bufferLength) * 240;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(x, height - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }

  // Calculate peak frequency
  const nyquist = audioContext.sampleRate / 2;
  const frequency = (maxIdx / bufferLength) * nyquist;
  peakFreq.textContent = Math.round(frequency) + ' Hz';
}

window.addEventListener('resize', resizeCanvas);
