/**
 * AUD-100: Multi-Track Mixer
 * Mix multiple audio files into one output
 */

let audioContext = null;
let tracks = [];
let processedBlob = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const tracksPanel = document.getElementById('tracksPanel');
const trackList = document.getElementById('trackList');
const mixBtn = document.getElementById('mixBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultPanel = document.getElementById('resultPanel');
const resultInfo = document.getElementById('resultInfo');
const audioPreview = document.getElementById('audioPreview');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#fbbf24'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

mixBtn.addEventListener('click', mixTracks);
downloadBtn.addEventListener('click', downloadResult);

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const ctx = getAudioContext();

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);

      const trackId = Date.now() + Math.random();
      tracks.push({
        id: trackId,
        name: file.name,
        buffer: buffer,
        volume: 100,
        pan: 0
      });
    } catch (err) {
      console.error('Error loading file:', file.name, err);
    }
  }

  updateTrackList();
  tracksPanel.classList.add('show');
  mixBtn.disabled = tracks.length < 1;
  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTrackList() {
  trackList.innerHTML = tracks.map((track, index) => `
    <div class="track-item" data-id="${track.id}">
      <div class="track-header">
        <span class="track-name">${index + 1}. ${track.name.length > 25 ? track.name.substring(0, 22) + '...' : track.name}</span>
        <div>
          <span class="track-duration">${formatDuration(track.buffer.duration)}</span>
          <button class="track-remove" onclick="removeTrack(${track.id})">移除</button>
        </div>
      </div>
      <div class="track-controls">
        <div class="control-group">
          <div class="control-label">
            <span>音量</span>
            <span class="control-value" id="vol-${track.id}">${track.volume}%</span>
          </div>
          <input type="range" min="0" max="150" value="${track.volume}"
            onchange="updateTrackVolume(${track.id}, this.value)">
        </div>
        <div class="control-group">
          <div class="control-label">
            <span>平衡</span>
            <span class="control-value" id="pan-${track.id}">${track.pan}</span>
          </div>
          <input type="range" min="-100" max="100" value="${track.pan}"
            onchange="updateTrackPan(${track.id}, this.value)">
        </div>
      </div>
    </div>
  `).join('');

  mixBtn.disabled = tracks.length < 1;
}

window.removeTrack = function(trackId) {
  tracks = tracks.filter(t => t.id !== trackId);
  updateTrackList();

  if (tracks.length === 0) {
    tracksPanel.classList.remove('show');
  }
};

window.updateTrackVolume = function(trackId, value) {
  const track = tracks.find(t => t.id === trackId);
  if (track) {
    track.volume = parseInt(value);
    document.getElementById(`vol-${trackId}`).textContent = value + '%';
  }
};

window.updateTrackPan = function(trackId, value) {
  const track = tracks.find(t => t.id === trackId);
  if (track) {
    track.pan = parseInt(value);
    document.getElementById(`pan-${trackId}`).textContent = value;
  }
};

function mixTracks() {
  if (tracks.length === 0) return;

  mixBtn.disabled = true;
  mixBtn.innerHTML = '<span>⏳</span> 混音中...';

  setTimeout(() => {
    const ctx = getAudioContext();

    // Find maximum sample rate and duration
    let maxSampleRate = 0;
    let maxDuration = 0;

    for (const track of tracks) {
      maxSampleRate = Math.max(maxSampleRate, track.buffer.sampleRate);
      maxDuration = Math.max(maxDuration, track.buffer.duration);
    }

    const sr = maxSampleRate;
    const length = Math.ceil(maxDuration * sr);

    // Create stereo output buffer
    const outputBuffer = ctx.createBuffer(2, length, sr);
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);

    // Mix all tracks
    for (const track of tracks) {
      const volume = track.volume / 100;
      const pan = track.pan / 100; // -1 to 1

      // Calculate stereo pan (constant power panning)
      const panAngle = (pan + 1) * Math.PI / 4; // 0 to PI/2
      const leftGain = Math.cos(panAngle) * volume;
      const rightGain = Math.sin(panAngle) * volume;

      const numChannels = track.buffer.numberOfChannels;
      const trackLength = track.buffer.length;

      // Handle different sample rates (simple nearest neighbor)
      const ratio = track.buffer.sampleRate / sr;

      for (let i = 0; i < length; i++) {
        const srcIdx = Math.floor(i * ratio);
        if (srcIdx >= trackLength) continue;

        let leftSample = 0;
        let rightSample = 0;

        if (numChannels === 1) {
          // Mono source
          const sample = track.buffer.getChannelData(0)[srcIdx];
          leftSample = sample;
          rightSample = sample;
        } else {
          // Stereo source
          leftSample = track.buffer.getChannelData(0)[srcIdx];
          rightSample = track.buffer.getChannelData(1)[srcIdx];
        }

        leftChannel[i] += leftSample * leftGain;
        rightChannel[i] += rightSample * rightGain;
      }
    }

    // Normalize to prevent clipping
    let maxSample = 0;
    for (let i = 0; i < length; i++) {
      maxSample = Math.max(maxSample, Math.abs(leftChannel[i]), Math.abs(rightChannel[i]));
    }

    if (maxSample > 1) {
      const normalizeGain = 0.99 / maxSample;
      for (let i = 0; i < length; i++) {
        leftChannel[i] *= normalizeGain;
        rightChannel[i] *= normalizeGain;
      }
    }

    processedBlob = audioBufferToWav(outputBuffer, sr);
    audioPreview.src = URL.createObjectURL(processedBlob);

    resultInfo.innerHTML = `
      <p>混音軌數: ${tracks.length}</p>
      <p>輸出時長: ${maxDuration.toFixed(2)} 秒</p>
      <p>取樣率: ${sr} Hz | 立體聲</p>
    `;

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    mixBtn.disabled = false;
    mixBtn.innerHTML = '<span>🎛️</span> 混音';
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
  link.download = 'mixed_output.wav';
  link.click();
}
