/**
 * AUD-087: Audio Watermark Extract
 * Extract hidden watermarks from audio files
 */

let audioContext = null;
let audioBuffer = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const extractBtn = document.getElementById('extractBtn');
const resultPanel = document.getElementById('resultPanel');
const watermarkResult = document.getElementById('watermarkResult');

function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#14b8a6'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#4a4a6a');
uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#4a4a6a'; handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
extractBtn.addEventListener('click', extractWatermark);

async function handleFile(file) {
  if (!file) return;
  fileName.textContent = file.name;

  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  fileInfo.classList.add('show');
  extractBtn.disabled = false;
  resultPanel.classList.remove('show');
}

function binaryToText(binary) {
  let text = '';
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    if (byte.length === 8) {
      const charCode = parseInt(byte, 2);
      if (charCode > 0 && charCode < 128) {
        text += String.fromCharCode(charCode);
      }
    }
  }
  return text;
}

function extractWatermark() {
  if (!audioBuffer) return;

  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span>⏳</span> 提取中...';

  setTimeout(() => {
    const data = audioBuffer.getChannelData(0);
    const length = data.length;

    // Try different spread factors to find the watermark
    const marker = '###WM###';
    let foundWatermark = null;

    for (let spreadFactor = 100; spreadFactor < 10000; spreadFactor += 100) {
      const maxBits = Math.floor(length / spreadFactor);
      let binary = '';

      for (let i = 0; i < Math.min(maxBits, 2000); i++) {
        const idx = i * spreadFactor;
        if (idx < length) {
          // Extract bit based on sample value pattern
          const sample = data[idx];
          // Simple threshold-based detection
          binary += sample > 0 ? '1' : '0';
        }
      }

      const text = binaryToText(binary);
      const startIdx = text.indexOf(marker);
      if (startIdx !== -1) {
        const endIdx = text.indexOf(marker, startIdx + marker.length);
        if (endIdx !== -1) {
          foundWatermark = text.substring(startIdx + marker.length, endIdx);
          break;
        }
      }
    }

    resultPanel.classList.add('show');

    if (foundWatermark) {
      watermarkResult.textContent = foundWatermark;
      watermarkResult.classList.remove('no-watermark');
    } else {
      watermarkResult.innerHTML = '<span class="no-watermark">未找到水印或水印已損壞</span>';
      watermarkResult.classList.add('no-watermark');
    }

    extractBtn.disabled = false;
    extractBtn.innerHTML = '<span>🔍</span> 提取水印';
  }, 100);
}
