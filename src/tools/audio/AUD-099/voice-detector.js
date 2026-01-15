/**
 * AUD-099: Voice Activity Detector
 * Detect voice/speech segments in audio
 */

let audioContext = null;
let audioBuffer = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const detectBtn = document.getElementById('detectBtn');
const resultPanel = document.getElementById('resultPanel');
const statsGrid = document.getElementById('statsGrid');
const vadCanvas = document.getElementById('vadCanvas');
const segmentList = document.getElementById('segmentList');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#14b8a6'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

detectBtn.addEventListener('click', detectVoice);

async function handleFile(file) {
  if (!file) return;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  detectBtn.disabled = false;
  resultPanel.classList.remove('show');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

function detectVoice() {
  if (!audioBuffer) return;

  detectBtn.disabled = true;
  detectBtn.innerHTML = '<span>⏳</span> 分析中...';

  setTimeout(() => {
    const sr = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Mix to mono
    const monoData = new Float32Array(length);
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        monoData[i] += channelData[i] / numChannels;
      }
    }

    // Voice Activity Detection using energy and zero-crossing rate
    const frameSize = Math.floor(sr * 0.025); // 25ms frames
    const hopSize = Math.floor(sr * 0.01); // 10ms hop
    const numFrames = Math.floor((length - frameSize) / hopSize);

    const frameEnergy = new Float32Array(numFrames);
    const frameZCR = new Float32Array(numFrames);

    // Calculate frame-level features
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      let energy = 0;
      let zcr = 0;

      for (let i = 0; i < frameSize; i++) {
        const sample = monoData[start + i];
        energy += sample * sample;

        if (i > 0) {
          const prev = monoData[start + i - 1];
          if ((sample >= 0 && prev < 0) || (sample < 0 && prev >= 0)) {
            zcr++;
          }
        }
      }

      frameEnergy[frame] = energy / frameSize;
      frameZCR[frame] = zcr / frameSize;
    }

    // Calculate adaptive thresholds
    const energySorted = [...frameEnergy].sort((a, b) => a - b);
    const energyMin = energySorted[Math.floor(numFrames * 0.1)];
    const energyMax = energySorted[Math.floor(numFrames * 0.9)];
    const energyThreshold = energyMin + (energyMax - energyMin) * 0.1;

    const zcrSorted = [...frameZCR].sort((a, b) => a - b);
    const zcrMean = zcrSorted.reduce((a, b) => a + b, 0) / numFrames;
    const zcrThresholdLow = zcrMean * 0.3;
    const zcrThresholdHigh = zcrMean * 2.0;

    // Voice detection: high energy + moderate ZCR (typical for speech)
    const voiceFrames = new Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      const hasEnergy = frameEnergy[i] > energyThreshold;
      const goodZCR = frameZCR[i] > zcrThresholdLow && frameZCR[i] < zcrThresholdHigh;
      voiceFrames[i] = hasEnergy && goodZCR;
    }

    // Smoothing: fill small gaps
    const minGapFrames = Math.floor(0.1 / (hopSize / sr)); // 100ms minimum gap
    for (let i = minGapFrames; i < numFrames - minGapFrames; i++) {
      if (!voiceFrames[i]) {
        let hasVoiceBefore = false;
        let hasVoiceAfter = false;

        for (let j = 1; j <= minGapFrames; j++) {
          if (voiceFrames[i - j]) hasVoiceBefore = true;
          if (voiceFrames[i + j]) hasVoiceAfter = true;
        }

        if (hasVoiceBefore && hasVoiceAfter) {
          voiceFrames[i] = true;
        }
      }
    }

    // Extract segments
    const segments = [];
    let inVoice = false;
    let segmentStart = 0;

    for (let i = 0; i < numFrames; i++) {
      const time = (i * hopSize) / sr;

      if (voiceFrames[i] && !inVoice) {
        inVoice = true;
        segmentStart = time;
      } else if (!voiceFrames[i] && inVoice) {
        inVoice = false;
        const duration = time - segmentStart;
        if (duration >= 0.2) { // Minimum 200ms voice segment
          segments.push({ type: 'voice', start: segmentStart, end: time, duration });
        }
      }
    }

    // Handle ending in voice
    if (inVoice) {
      const endTime = (numFrames * hopSize) / sr;
      const duration = endTime - segmentStart;
      if (duration >= 0.2) {
        segments.push({ type: 'voice', start: segmentStart, end: endTime, duration });
      }
    }

    // Add silence segments between voice segments
    const allSegments = [];
    let lastEnd = 0;

    for (const seg of segments) {
      if (seg.start > lastEnd + 0.1) {
        allSegments.push({
          type: 'silence',
          start: lastEnd,
          end: seg.start,
          duration: seg.start - lastEnd
        });
      }
      allSegments.push(seg);
      lastEnd = seg.end;
    }

    if (lastEnd < audioBuffer.duration - 0.1) {
      allSegments.push({
        type: 'silence',
        start: lastEnd,
        end: audioBuffer.duration,
        duration: audioBuffer.duration - lastEnd
      });
    }

    // Calculate statistics
    const voiceSegments = segments.length;
    const totalVoice = segments.reduce((sum, s) => sum + s.duration, 0);
    const voicePercent = (totalVoice / audioBuffer.duration) * 100;

    // Display stats
    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">語音區段</div>
        <div class="stat-value">${voiceSegments}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">語音時長</div>
        <div class="stat-value">${totalVoice.toFixed(1)}s</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">語音佔比</div>
        <div class="stat-value">${voicePercent.toFixed(1)}%</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">總時長</div>
        <div class="stat-value">${audioBuffer.duration.toFixed(1)}s</div>
      </div>
    `;

    // Draw visualization
    drawVADVisualization(voiceFrames, audioBuffer.duration);

    // Display segment list
    segmentList.innerHTML = allSegments.map(seg => `
      <div class="segment-item">
        <div class="segment-info">
          <span class="segment-type ${seg.type}">${seg.type === 'voice' ? '語音' : '靜音'}</span>
          <span class="segment-time">${formatTime(seg.start)} - ${formatTime(seg.end)}</span>
        </div>
        <span class="segment-duration">${seg.duration.toFixed(2)}s</span>
      </div>
    `).join('');

    resultPanel.classList.add('show');

    detectBtn.disabled = false;
    detectBtn.innerHTML = '<span>🎤</span> 偵測語音';
  }, 100);
}

function drawVADVisualization(voiceFrames, duration) {
  const canvas = vadCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, width, height);

  // Draw voice activity
  const framesPerPixel = voiceFrames.length / width;

  for (let x = 0; x < width; x++) {
    const startFrame = Math.floor(x * framesPerPixel);
    const endFrame = Math.floor((x + 1) * framesPerPixel);

    // Check if any frame in this pixel range has voice
    let hasVoice = false;
    for (let i = startFrame; i < endFrame; i++) {
      if (voiceFrames[i]) {
        hasVoice = true;
        break;
      }
    }

    if (hasVoice) {
      ctx.fillStyle = 'rgba(20, 184, 166, 0.8)';
      ctx.fillRect(x, height * 0.2, 1, height * 0.6);
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.fillRect(x, height * 0.4, 1, height * 0.2);
    }
  }

  // Draw time markers
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  const interval = Math.ceil(duration / 10);
  for (let t = 0; t <= duration; t += interval) {
    const x = (t / duration) * width;
    ctx.fillText(t + 's', x, height - 5);
  }
}
