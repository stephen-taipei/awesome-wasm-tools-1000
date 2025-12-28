/**
 * AUD-012 Audio Merger Tool
 * Merges multiple audio files into one
 * Uses Web Audio API for processing and lamejs for MP3 encoding
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const fileCount = document.getElementById('fileCount');
const totalDuration = document.getElementById('totalDuration');
const outputFormat = document.getElementById('outputFormat');
const bitrateRow = document.getElementById('bitrateRow');
const bitrate = document.getElementById('bitrate');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const mergeBtn = document.getElementById('mergeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadLabel = document.getElementById('downloadLabel');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const mergedCount = document.getElementById('mergedCount');
const mergedDuration = document.getElementById('mergedDuration');
const outputSize = document.getElementById('outputSize');
const processTime = document.getElementById('processTime');
const audioPreview = document.getElementById('audioPreview');

// State
let audioFiles = [];
let audioBuffers = [];
let mergedBuffer = null;
let outputBlob = null;
let draggedItem = null;

// Audio context
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

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

// Decode audio file using Web Audio API
async function decodeAudioFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  return await ctx.decodeAudioData(arrayBuffer);
}

// Merge audio buffers
function mergeAudioBuffers(buffers) {
  if (buffers.length === 0) return null;
  if (buffers.length === 1) return buffers[0];

  const ctx = getAudioContext();
  const numChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  const sampleRate = buffers[0].sampleRate;
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

  const merged = ctx.createBuffer(numChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    for (let ch = 0; ch < numChannels; ch++) {
      const mergedData = merged.getChannelData(ch);
      const sourceData = buffer.numberOfChannels > ch
        ? buffer.getChannelData(ch)
        : buffer.getChannelData(0);

      for (let i = 0; i < buffer.length; i++) {
        mergedData[offset + i] = sourceData[i];
      }
    }
    offset += buffer.length;
  }

  return merged;
}

// Convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
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

// Convert AudioBuffer to MP3 using lamejs
function audioBufferToMp3(buffer, bitrateKbps) {
  return new Promise((resolve) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrateKbps);
    const mp3Data = [];

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

    const leftInt16 = new Int16Array(leftChannel.length);
    const rightInt16 = new Int16Array(rightChannel.length);

    for (let i = 0; i < leftChannel.length; i++) {
      leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(leftChannel[i] * 32767)));
      rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(rightChannel[i] * 32767)));
    }

    const sampleBlockSize = 1152;
    const totalSamples = leftInt16.length;
    let samplesProcessed = 0;

    function processChunk() {
      const chunkSize = Math.min(sampleBlockSize * 50, totalSamples - samplesProcessed);

      for (let i = 0; i < chunkSize; i += sampleBlockSize) {
        const start = samplesProcessed + i;
        const end = Math.min(start + sampleBlockSize, totalSamples);

        const leftChunk = leftInt16.slice(start, end);
        const rightChunk = rightInt16.slice(start, end);

        let mp3buf;
        if (numChannels === 1) {
          mp3buf = mp3encoder.encodeBuffer(leftChunk);
        } else {
          mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        }

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      samplesProcessed += chunkSize;
      const progress = 50 + (samplesProcessed / totalSamples) * 50;
      updateProgress(progress, `編碼 MP3... ${Math.round(progress)}%`);

      if (samplesProcessed < totalSamples) {
        setTimeout(processChunk, 0);
      } else {
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of mp3Data) {
          result.set(buf, offset);
          offset += buf.length;
        }

        resolve(new Blob([result], { type: 'audio/mp3' }));
      }
    }

    processChunk();
  });
}

// Update progress
function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

// Render file list
function renderFileList() {
  fileItems.innerHTML = '';

  audioFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.draggable = true;
    item.dataset.index = index;

    const duration = audioBuffers[index] ? formatDuration(audioBuffers[index].duration) : '--:--';

    item.innerHTML = `
      <div class="file-item-info">
        <span class="file-item-order">${index + 1}</span>
        <span class="file-item-name">${file.name}</span>
        <span class="file-item-duration">${duration}</span>
      </div>
      <button class="file-item-remove" data-index="${index}">×</button>
    `;

    // Drag events
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);

    fileItems.appendChild(item);
  });

  // Update totals
  fileCount.textContent = `${audioFiles.length} 個檔案`;

  const total = audioBuffers.reduce((sum, b) => sum + (b ? b.duration : 0), 0);
  totalDuration.textContent = `總時長：${formatDuration(total)}`;

  // Update button state
  mergeBtn.disabled = audioFiles.length < 2;
}

// Drag and drop handlers
function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();

  if (this !== draggedItem) {
    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // Swap files and buffers
    [audioFiles[fromIndex], audioFiles[toIndex]] = [audioFiles[toIndex], audioFiles[fromIndex]];
    [audioBuffers[fromIndex], audioBuffers[toIndex]] = [audioBuffers[toIndex], audioBuffers[fromIndex]];

    renderFileList();
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  draggedItem = null;
}

// Handle file selection
async function handleFiles(files) {
  const newFiles = Array.from(files);

  progressContainer.classList.add('show');
  updateProgress(0, '載入音訊檔案...');

  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i];
    try {
      const progress = ((i + 1) / newFiles.length) * 100;
      updateProgress(progress, `解碼 ${file.name}...`);

      const buffer = await decodeAudioFile(file);
      audioFiles.push(file);
      audioBuffers.push(buffer);
    } catch (error) {
      console.error(`Failed to decode ${file.name}:`, error);
    }
  }

  progressContainer.classList.remove('show');

  if (audioFiles.length > 0) {
    fileList.classList.add('show');
    renderFileList();
  }

  resultPanel.classList.remove('show');
  downloadBtn.style.display = 'none';
  resetBtn.style.display = audioFiles.length > 0 ? 'flex' : 'none';
}

// Remove file
function removeFile(index) {
  audioFiles.splice(index, 1);
  audioBuffers.splice(index, 1);
  renderFileList();

  if (audioFiles.length === 0) {
    fileList.classList.remove('show');
    resetBtn.style.display = 'none';
  }
}

// Update UI based on output format
function updateOutputFormatUI() {
  const format = outputFormat.value;

  if (format === 'mp3') {
    bitrateRow.style.display = 'flex';
  } else {
    bitrateRow.style.display = 'none';
  }

  downloadLabel.textContent = `下載 ${format.toUpperCase()}`;
}

// Merge audio
async function mergeAudio() {
  if (audioBuffers.length < 2) return;

  const format = outputFormat.value;
  const bitrateKbps = parseInt(bitrate.value);

  progressContainer.classList.add('show');
  mergeBtn.disabled = true;
  updateProgress(0, '準備中...');

  const startTime = performance.now();

  try {
    updateProgress(25, '合併音頻...');
    mergedBuffer = mergeAudioBuffers(audioBuffers);

    updateProgress(50, '編碼輸出...');

    if (format === 'wav') {
      outputBlob = audioBufferToWav(mergedBuffer);
      updateProgress(100, '完成！');
    } else if (format === 'mp3') {
      outputBlob = await audioBufferToMp3(mergedBuffer, bitrateKbps);
    }

    const endTime = performance.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    mergedCount.textContent = `${audioFiles.length} 個`;
    mergedDuration.textContent = formatDuration(mergedBuffer.duration);
    outputSize.textContent = formatFileSize(outputBlob.size);
    processTime.textContent = elapsed + ' 秒';

    audioPreview.src = URL.createObjectURL(outputBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';

    setTimeout(() => {
      progressContainer.classList.remove('show');
    }, 1000);

  } catch (error) {
    alert('處理失敗：' + error.message);
    console.error(error);
    progressContainer.classList.remove('show');
  }

  mergeBtn.disabled = false;
}

// Download output
function downloadOutput() {
  if (!outputBlob) return;

  const format = outputFormat.value;

  const url = URL.createObjectURL(outputBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `merged_audio.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Reset
function reset() {
  audioFiles = [];
  audioBuffers = [];
  mergedBuffer = null;
  outputBlob = null;

  fileInput.value = '';
  fileList.classList.remove('show');
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');
  fileItems.innerHTML = '';

  mergeBtn.disabled = true;
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
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// Remove button click handler (event delegation)
fileItems.addEventListener('click', (e) => {
  if (e.target.classList.contains('file-item-remove')) {
    const index = parseInt(e.target.dataset.index);
    removeFile(index);
  }
});

outputFormat.addEventListener('change', updateOutputFormatUI);

mergeBtn.addEventListener('click', mergeAudio);
downloadBtn.addEventListener('click', downloadOutput);
resetBtn.addEventListener('click', reset);

// Initialize
updateOutputFormatUI();
