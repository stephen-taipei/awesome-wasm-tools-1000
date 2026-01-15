/**
 * AUD-075: Audio Metadata Editor
 * Edit audio file metadata (title, artist, album, etc.)
 */

const i18n = {
  'zh-TW': {
    toolName: '音訊元資料編輯',
    toolDesc: '編輯音訊檔案的標題、藝人等元資料',
    uploadText: '拖放音訊檔案到此處',
    uploadHint: '支援 MP3, WAV, OGG, FLAC 格式',
    fileName: '檔案名稱',
    fileSize: '檔案大小',
    format: '格式',
    duration: '時長',
    metadata: '元資料編輯',
    title: '標題',
    artist: '藝人',
    album: '專輯',
    year: '年份',
    genre: '類型',
    track: '曲目編號',
    comment: '備註',
    save: '儲存變更',
    download: '下載結果',
    reset: '重置',
    processComplete: '元資料已更新',
    footer: '所有處理均在本地完成，檔案不會上傳至伺服器'
  },
  'en': {
    toolName: 'Audio Metadata Editor',
    toolDesc: 'Edit audio file metadata (title, artist, etc.)',
    uploadText: 'Drop audio file here',
    uploadHint: 'Supports MP3, WAV, OGG, FLAC formats',
    fileName: 'File Name',
    fileSize: 'File Size',
    format: 'Format',
    duration: 'Duration',
    metadata: 'Metadata Editor',
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 'Year',
    genre: 'Genre',
    track: 'Track Number',
    comment: 'Comment',
    save: 'Save Changes',
    download: 'Download',
    reset: 'Reset',
    processComplete: 'Metadata Updated',
    footer: 'All processing is done locally'
  },
  'ja': {
    toolName: 'オーディオメタデータ編集',
    toolDesc: 'オーディオファイルのメタデータを編集',
    uploadText: 'オーディオファイルをここにドロップ',
    uploadHint: 'MP3, WAV, OGG, FLAC形式に対応',
    fileName: 'ファイル名',
    fileSize: 'ファイルサイズ',
    format: 'フォーマット',
    duration: '長さ',
    metadata: 'メタデータ編集',
    title: 'タイトル',
    artist: 'アーティスト',
    album: 'アルバム',
    year: '年',
    genre: 'ジャンル',
    track: 'トラック番号',
    comment: 'コメント',
    save: '変更を保存',
    download: 'ダウンロード',
    reset: 'リセット',
    processComplete: 'メタデータを更新しました',
    footer: 'すべての処理はローカルで行われます'
  }
};

let currentLang = 'zh-TW';
let audioContext = null;
let currentFile = null;
let audioBuffer = null;
let processedBlob = null;

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang] && i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

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

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const format = document.getElementById('format');
const duration = document.getElementById('duration');
const metadataPanel = document.getElementById('metadataPanel');
const metaTitle = document.getElementById('metaTitle');
const metaArtist = document.getElementById('metaArtist');
const metaAlbum = document.getElementById('metaAlbum');
const metaYear = document.getElementById('metaYear');
const metaGenre = document.getElementById('metaGenre');
const metaTrack = document.getElementById('metaTrack');
const metaComment = document.getElementById('metaComment');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const audioPreview = document.getElementById('audioPreview');

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
processBtn.addEventListener('click', processAudio);
downloadBtn.addEventListener('click', downloadResult);
resetBtn.addEventListener('click', reset);

async function handleFile(file) {
  if (!file || !file.type.startsWith('audio/')) {
    alert('請選擇有效的音訊檔案');
    return;
  }

  currentFile = file;
  fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
  fileSize.textContent = formatFileSize(file.size);

  const ext = file.name.split('.').pop().toUpperCase();
  format.textContent = ext;

  try {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    duration.textContent = formatDuration(audioBuffer.duration);

    fileInfo.classList.add('show');
    metadataPanel.style.display = 'block';
    processBtn.disabled = false;
    resultPanel.classList.remove('show');
    downloadBtn.style.display = 'none';
    resetBtn.style.display = 'none';

    // Pre-fill with filename as title
    metaTitle.value = file.name.replace(/\.[^/.]+$/, '');
  } catch (error) {
    alert('無法解碼音訊檔案：' + error.message);
  }
}

function updateProgress(percent, text) {
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

async function processAudio() {
  if (!audioBuffer) return;

  progressContainer.classList.add('show');
  processBtn.disabled = true;
  updateProgress(0, '處理中...');

  try {
    updateProgress(30, '編碼音訊...');

    const ctx = getAudioContext();
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sr = audioBuffer.sampleRate;

    // Create WAV with metadata
    const metadata = {
      title: metaTitle.value,
      artist: metaArtist.value,
      album: metaAlbum.value,
      year: metaYear.value,
      genre: metaGenre.value,
      track: metaTrack.value,
      comment: metaComment.value
    };

    updateProgress(60, '嵌入元資料...');

    processedBlob = audioBufferToWavWithMetadata(audioBuffer, sr, metadata);

    updateProgress(100, '完成！');

    audioPreview.src = URL.createObjectURL(processedBlob);

    resultPanel.classList.add('show');
    downloadBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';

    setTimeout(() => progressContainer.classList.remove('show'), 1000);
  } catch (error) {
    alert('處理失敗：' + error.message);
    progressContainer.classList.remove('show');
  }

  processBtn.disabled = false;
}

function audioBufferToWavWithMetadata(buffer, sampleRate, metadata) {
  const numChannels = buffer.numberOfChannels;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;

  // Create INFO chunk for metadata
  let infoChunk = '';
  if (metadata.title) infoChunk += createInfoSubChunk('INAM', metadata.title);
  if (metadata.artist) infoChunk += createInfoSubChunk('IART', metadata.artist);
  if (metadata.album) infoChunk += createInfoSubChunk('IPRD', metadata.album);
  if (metadata.year) infoChunk += createInfoSubChunk('ICRD', metadata.year);
  if (metadata.genre) infoChunk += createInfoSubChunk('IGNR', metadata.genre);
  if (metadata.track) infoChunk += createInfoSubChunk('ITRK', metadata.track);
  if (metadata.comment) infoChunk += createInfoSubChunk('ICMT', metadata.comment);

  const infoBytes = new TextEncoder().encode(infoChunk);
  const listChunkSize = infoBytes.length > 0 ? 4 + infoBytes.length : 0;
  const hasInfo = listChunkSize > 0;

  const bufferSize = 44 + dataSize + (hasInfo ? 8 + listChunkSize : 0);

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
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

  // LIST INFO chunk
  if (hasInfo) {
    writeString(offset, 'LIST');
    view.setUint32(offset + 4, listChunkSize, true);
    writeString(offset + 8, 'INFO');
    offset += 12;

    for (let i = 0; i < infoBytes.length; i++) {
      view.setUint8(offset + i, infoBytes[i]);
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function createInfoSubChunk(id, value) {
  const strValue = String(value);
  const paddedLength = strValue.length + (strValue.length % 2 === 0 ? 1 : 2);
  let chunk = id;
  chunk += String.fromCharCode(paddedLength & 0xFF);
  chunk += String.fromCharCode((paddedLength >> 8) & 0xFF);
  chunk += String.fromCharCode((paddedLength >> 16) & 0xFF);
  chunk += String.fromCharCode((paddedLength >> 24) & 0xFF);
  chunk += strValue + '\0';
  if (strValue.length % 2 === 0) chunk += '\0';
  return chunk;
}

function downloadResult() {
  if (!processedBlob) return;

  const baseName = currentFile.name.replace(/\.[^/.]+$/, '');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `${baseName}_tagged.wav`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function reset() {
  currentFile = null;
  audioBuffer = null;
  processedBlob = null;

  fileInput.value = '';
  fileInfo.classList.remove('show');
  metadataPanel.style.display = 'none';
  resultPanel.classList.remove('show');
  progressContainer.classList.remove('show');
  downloadBtn.style.display = 'none';
  resetBtn.style.display = 'none';
  processBtn.disabled = true;

  metaTitle.value = '';
  metaArtist.value = '';
  metaAlbum.value = '';
  metaYear.value = '';
  metaGenre.value = '';
  metaTrack.value = '';
  metaComment.value = '';

  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
}

setLanguage('zh-TW');
