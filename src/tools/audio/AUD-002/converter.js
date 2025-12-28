/**
 * AUD-002 WAV to MP3 Converter
 * Uses lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const sampleRate = document.getElementById('sampleRate');
const channels = document.getElementById('channels');
const duration = document.getElementById('duration');
const bitrateSelect = document.getElementById('bitrateSelect');
const vbrQuality = document.getElementById('vbrQuality');
const vbrValue = document.getElementById('vbrValue');
const encodingMode = document.getElementById('encodingMode');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const originalSize = document.getElementById('originalSize');
const mp3Size = document.getElementById('mp3Size');
const compressionRatio = document.getElementById('compressionRatio');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let currentFile = null;
let wavData = null;
let mp3Blob = null;

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse WAV file header and get audio data
function parseWAV(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  // Check RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    throw new Error('Invalid WAV file: missing RIFF header');
  }

  // Check WAVE format
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') {
    throw new Error('Invalid WAV file: missing WAVE format');
  }

  // Find fmt chunk
  let offset = 12;
  let fmtChunk = null;
  let dataChunk = null;

  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      fmtChunk = {
        audioFormat: view.getUint16(offset + 8, true),
        numChannels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        byteRate: view.getUint32(offset + 16, true),
        blockAlign: view.getUint16(offset + 20, true),
        bitsPerSample: view.getUint16(offset + 22, true)
      };
    } else if (chunkId === 'data') {
      dataChunk = {
        offset: offset + 8,
        size: chunkSize
      };
    }

    offset += 8 + chunkSize;
    // Align to even byte
    if (chunkSize % 2 !== 0) offset++;
  }

  if (!fmtChunk) throw new Error('Invalid WAV file: missing fmt chunk');
  if (!dataChunk) throw new Error('Invalid WAV file: missing data chunk');

  // Only support PCM
  if (fmtChunk.audioFormat !== 1) {
    throw new Error('Only PCM WAV files are supported');
  }

  // Extract audio samples
  const dataView = new DataView(arrayBuffer, dataChunk.offset, dataChunk.size);
  const bytesPerSample = fmtChunk.bitsPerSample / 8;
  const numSamples = dataChunk.size / (bytesPerSample * fmtChunk.numChannels);

  const samples = [];
  for (let ch = 0; ch < fmtChunk.numChannels; ch++) {
    samples.push(new Int16Array(numSamples));
  }

  let sampleIndex = 0;
  for (let i = 0; i < dataChunk.size; i += bytesPerSample * fmtChunk.numChannels) {
    for (let ch = 0; ch < fmtChunk.numChannels; ch++) {
      const byteOffset = i + ch * bytesPerSample;
      let sample;

      if (bytesPerSample === 1) {
        // 8-bit unsigned to 16-bit signed
        sample = (dataView.getUint8(byteOffset) - 128) * 256;
      } else if (bytesPerSample === 2) {
        // 16-bit signed
        sample = dataView.getInt16(byteOffset, true);
      } else if (bytesPerSample === 3) {
        // 24-bit to 16-bit
        const b0 = dataView.getUint8(byteOffset);
        const b1 = dataView.getUint8(byteOffset + 1);
        const b2 = dataView.getInt8(byteOffset + 2);
        sample = ((b2 << 16) | (b1 << 8) | b0) >> 8;
      } else if (bytesPerSample === 4) {
        // 32-bit to 16-bit
        sample = dataView.getInt32(byteOffset, true) >> 16;
      }

      samples[ch][sampleIndex] = sample;
    }
    sampleIndex++;
  }

  return {
    sampleRate: fmtChunk.sampleRate,
    numChannels: fmtChunk.numChannels,
    bitsPerSample: fmtChunk.bitsPerSample,
    samples: samples,
    duration: numSamples / fmtChunk.sampleRate
  };
}

// Encode to MP3 using lamejs
function encodeMP3(wavData, bitrate, vbrQuality, useVBR) {
  return new Promise((resolve, reject) => {
    try {
      const mp3encoder = new lamejs.Mp3Encoder(
        wavData.numChannels,
        wavData.sampleRate,
        bitrate
      );

      const mp3Data = [];
      const sampleBlockSize = 1152;
      const totalSamples = wavData.samples[0].length;
      let samplesProcessed = 0;

      const leftChannel = wavData.samples[0];
      const rightChannel = wavData.numChannels > 1 ? wavData.samples[1] : wavData.samples[0];

      // Process in chunks with progress updates
      function processChunk() {
        const chunkSize = Math.min(sampleBlockSize * 10, totalSamples - samplesProcessed);

        for (let i = 0; i < chunkSize; i += sampleBlockSize) {
          const start = samplesProcessed + i;
          const end = Math.min(start + sampleBlockSize, totalSamples);
          const actualSize = end - start;

          const leftChunk = leftChannel.slice(start, end);
          const rightChunk = rightChannel.slice(start, end);

          let mp3buf;
          if (wavData.numChannels === 1) {
            mp3buf = mp3encoder.encodeBuffer(leftChunk);
          } else {
            mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          }

          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
        }

        samplesProcessed += chunkSize;
        const progress = (samplesProcessed / totalSamples) * 100;
        updateProgress(progress, `編碼中... ${Math.round(progress)}%`);

        if (samplesProcessed < totalSamples) {
          setTimeout(processChunk, 0);
        } else {
          // Flush remaining data
          const mp3buf = mp3encoder.flush();
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }

          // Combine all chunks
          const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const buf of mp3Data) {
            result.set(buf, offset);
            offset += buf.length;
          }

          resolve(result);
        }
      }

      processChunk();
    } catch (error) {
      reject(error);
    }
  });
}

// Update progress
function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

// Handle file selection
async function handleFile(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.wav')) {
    alert('請選擇 WAV 格式的音訊檔案');
    return;
  }

  currentFile = file;

  // Show file info
  fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
  fileSize.textContent = formatFileSize(file.size);

  try {
    // Read and parse WAV
    const arrayBuffer = await file.arrayBuffer();
    wavData = parseWAV(arrayBuffer);

    sampleRate.textContent = wavData.sampleRate + ' Hz';
    channels.textContent = wavData.numChannels === 1 ? '單聲道' : '立體聲';
    duration.textContent = formatDuration(wavData.duration);

    fileInfo.classList.add('show');
    convertBtn.disabled = false;

    // Reset previous results
    resultPanel.classList.remove('show');
    downloadBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    mp3Blob = null;

  } catch (error) {
    alert('無法解析 WAV 檔案：' + error.message);
    console.error(error);
  }
}

// Start conversion
async function startConversion() {
  if (!wavData) return;

  const bitrate = parseInt(bitrateSelect.value);
  const vbr = parseInt(vbrQuality.value);
  const useVBR = encodingMode.value === 'vbr';

  // Show progress
  progressContainer.classList.add('show');
  convertBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(5, '正在編碼...');

    const mp3Data = await encodeMP3(wavData, bitrate, vbr, useVBR);

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // Create blob
    mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });

    // Update results
    originalSize.textContent = formatFileSize(currentFile.size);
    mp3Size.textContent = formatFileSize(mp3Blob.size);
    compressionRatio.textContent = ((1 - mp3Blob.size / currentFile.size) * 100).toFixed(1) + '%';
    processTime.textContent = elapsed + ' 秒';

    // Set audio preview
    audioPreview.src = URL.createObjectURL(mp3Blob);

    // Show results
    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';

    updateProgress(100, '轉換完成！');

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 1000);

  } catch (error) {
    alert('轉換失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  convertBtn.disabled = false;
}

// Download MP3
function downloadMP3() {
  if (!mp3Blob) return;

  const url = URL.createObjectURL(mp3Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFile.name.replace(/\.wav$/i, '.mp3');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  currentFile = null;
  wavData = null;
  mp3Blob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');

  convertBtn.disabled = true;
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

// Event listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleFile(file);
});

vbrQuality.addEventListener('input', () => {
  vbrValue.textContent = vbrQuality.value;
});

convertBtn.addEventListener('click', startConversion);
downloadBtn.addEventListener('click', downloadMP3);
resetBtn.addEventListener('click', reset);
