/**
 * AUD-092: Silence Detector
 * Detect silent segments in audio
 */

let audioContext = null;
let audioBuffer = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const settingsPanel = document.getElementById('settingsPanel');
const threshold = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const minDuration = document.getElementById('minDuration');
const minDurationValue = document.getElementById('minDurationValue');
const detectBtn = document.getElementById('detectBtn');
const resultPanel = document.getElementById('resultPanel');
const silenceList = document.getElementById('silenceList');
const summary = document.getElementById('summary');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#64748b'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

threshold.addEventListener('input', () => thresholdValue.textContent = threshold.value + ' dB');
minDuration.addEventListener('input', () => minDurationValue.textContent = minDuration.value + ' 秒');

detectBtn.addEventListener('click', detectSilence);

async function handleFile(file) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  settingsPanel.classList.add('show');
  detectBtn.disabled = false;
  resultPanel.classList.remove('show');
}

function detectSilence() {
  if (!audioBuffer) return;

  detectBtn.disabled = true;
  detectBtn.innerHTML = '<span>⏳</span> 偵測中...';

  setTimeout(() => {
    const thresholdDb = parseFloat(threshold.value);
    const minDur = parseFloat(minDuration.value);
    const sr = audioBuffer.sampleRate;

    // Convert dB threshold to linear amplitude
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const minSamples = Math.floor(minDur * sr);

    // Mix all channels to mono for analysis
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mixedData = new Float32Array(length);

    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mixedData[i] += Math.abs(channelData[i]) / numChannels;
      }
    }

    // Detect silence segments
    const silenceSegments = [];
    let inSilence = false;
    let silenceStart = 0;

    for (let i = 0; i < length; i++) {
      const isSilent = mixedData[i] < thresholdLinear;

      if (isSilent && !inSilence) {
        inSilence = true;
        silenceStart = i;
      } else if (!isSilent && inSilence) {
        inSilence = false;
        const silenceLength = i - silenceStart;
        if (silenceLength >= minSamples) {
          silenceSegments.push({
            start: silenceStart / sr,
            end: i / sr,
            duration: silenceLength / sr
          });
        }
      }
    }

    // Check if audio ends in silence
    if (inSilence) {
      const silenceLength = length - silenceStart;
      if (silenceLength >= minSamples) {
        silenceSegments.push({
          start: silenceStart / sr,
          end: length / sr,
          duration: silenceLength / sr
        });
      }
    }

    // Display results
    displayResults(silenceSegments);

    detectBtn.disabled = false;
    detectBtn.innerHTML = '<span>🔍</span> 偵測靜音';
  }, 100);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

function displayResults(segments) {
  silenceList.innerHTML = '';

  if (segments.length === 0) {
    silenceList.innerHTML = '<div class="silence-item"><span>未偵測到靜音區段</span></div>';
  } else {
    segments.forEach((seg, index) => {
      const item = document.createElement('div');
      item.className = 'silence-item';
      item.innerHTML = `
        <span class="silence-time">#${index + 1}: ${formatTime(seg.start)} - ${formatTime(seg.end)}</span>
        <span class="silence-duration">${seg.duration.toFixed(2)} 秒</span>
      `;
      silenceList.appendChild(item);
    });
  }

  const totalSilence = segments.reduce((sum, seg) => sum + seg.duration, 0);
  const totalDuration = audioBuffer.duration;
  const silencePercent = ((totalSilence / totalDuration) * 100).toFixed(1);

  summary.innerHTML = `
    <p>總時長: ${totalDuration.toFixed(2)} 秒</p>
    <p>靜音區段: ${segments.length} 個</p>
    <p>靜音總時長: ${totalSilence.toFixed(2)} 秒 (${silencePercent}%)</p>
  `;

  resultPanel.classList.add('show');
}
