/**
 * CMP-046: Stream Compression Processing
 *
 * Uses Web Streams API for efficient large file compression.
 * All processing is done locally in the browser.
 */

class StreamCompressor {
  constructor() {
    this.file = null;
    this.compressedBlob = null;
    this.chunkSize = 1048576;
    this.compressionFormat = 'gzip';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.chunkSizeSelect = document.getElementById('chunkSize');
    this.compressionFormatSelect = document.getElementById('compressionFormat');
    this.outputFilename = document.getElementById('outputFilename');
    this.compressBtn = document.getElementById('compressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.originalSize = document.getElementById('originalSize');
    this.compressedSize = document.getElementById('compressedSize');
    this.compressionRatio = document.getElementById('compressionRatio');
    this.averageSpeed = document.getElementById('averageSpeed');
    this.chunksProcessed = document.getElementById('chunksProcessed');
    this.bytesProcessed = document.getElementById('bytesProcessed');
    this.currentCompressedSize = document.getElementById('currentCompressedSize');
    this.processingSpeed = document.getElementById('processingSpeed');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.setFile(e.dataTransfer.files[0]);
      }
    });

    this.chunkSizeSelect.addEventListener('change', (e) => {
      this.chunkSize = parseInt(e.target.value);
    });

    this.compressionFormatSelect.addEventListener('change', (e) => {
      this.compressionFormat = e.target.value;
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.setFile(event.target.files[0]);
    }
  }

  setFile(file) {
    this.file = file;
    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
    this.fileInfo.style.display = 'block';
    this.outputFilename.value = file.name;
    this.compressBtn.disabled = false;
  }

  async compress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;

    try {
      // Check if CompressionStream is supported
      if (typeof CompressionStream !== 'undefined') {
        await this.compressWithStreams(startTime);
      } else {
        await this.compressWithChunks(startTime);
      }

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.compressBtn.disabled = false;
    }
  }

  async compressWithStreams(startTime) {
    const stream = this.file.stream();
    const compressionStream = new CompressionStream(this.compressionFormat);
    const compressedStream = stream.pipeThrough(compressionStream);

    const reader = compressedStream.getReader();
    const chunks = [];
    let totalBytesRead = 0;
    let compressedBytes = 0;
    let lastUpdate = startTime;
    let lastBytesRead = 0;

    const totalChunks = Math.ceil(this.file.size / this.chunkSize);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      compressedBytes += value.length;
      totalBytesRead += value.length;

      const now = performance.now();
      if (now - lastUpdate > 100) {
        const speed = (totalBytesRead - lastBytesRead) / ((now - lastUpdate) / 1000);
        const progress = Math.min((compressedBytes / this.file.size) * 100, 95);

        this.updateProgress(progress, '串流壓縮中...');
        this.chunksProcessed.textContent = `${chunks.length}`;
        this.bytesProcessed.textContent = this.formatFileSize(totalBytesRead);
        this.currentCompressedSize.textContent = this.formatFileSize(compressedBytes);
        this.processingSpeed.textContent = `${(speed / 1048576).toFixed(2)} MB/s`;

        lastUpdate = now;
        lastBytesRead = totalBytesRead;
      }
    }

    this.compressedBlob = new Blob(chunks, { type: 'application/octet-stream' });
    this.finishCompression(startTime);
  }

  async compressWithChunks(startTime) {
    // Fallback for browsers without CompressionStream
    const arrayBuffer = await this.file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const totalChunks = Math.ceil(uint8Array.length / this.chunkSize);
    const compressedChunks = [];
    let compressedBytes = 0;
    let lastUpdate = startTime;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, uint8Array.length);
      const chunk = uint8Array.slice(start, end);

      // Simple compression using RLE for demonstration
      const compressedChunk = this.compressChunk(chunk);
      compressedChunks.push(compressedChunk);
      compressedBytes += compressedChunk.length;

      const now = performance.now();
      if (now - lastUpdate > 100) {
        const progress = ((i + 1) / totalChunks) * 95;
        const speed = (end) / ((now - startTime) / 1000);

        this.updateProgress(progress, '串流壓縮中...');
        this.chunksProcessed.textContent = `${i + 1} / ${totalChunks}`;
        this.bytesProcessed.textContent = this.formatFileSize(end);
        this.currentCompressedSize.textContent = this.formatFileSize(compressedBytes);
        this.processingSpeed.textContent = `${(speed / 1048576).toFixed(2)} MB/s`;

        lastUpdate = now;
      }
    }

    // Create header
    const header = new Uint8Array(16);
    header[0] = 0x53; // 'S'
    header[1] = 0x54; // 'T'
    header[2] = 0x52; // 'R'
    header[3] = 0x4D; // 'M'
    const view = new DataView(header.buffer);
    view.setUint32(4, uint8Array.length, true);
    view.setUint32(8, this.chunkSize, true);
    view.setUint32(12, totalChunks, true);

    // Combine all chunks
    const totalSize = header.length + compressedChunks.reduce((sum, c) => sum + c.length + 4, 0);
    const result = new Uint8Array(totalSize);
    result.set(header);

    let offset = header.length;
    for (const chunk of compressedChunks) {
      const chunkView = new DataView(result.buffer);
      chunkView.setUint32(offset, chunk.length, true);
      result.set(chunk, offset + 4);
      offset += chunk.length + 4;
    }

    this.compressedBlob = new Blob([result], { type: 'application/octet-stream' });
    this.finishCompression(startTime);
  }

  compressChunk(chunk) {
    // Simple RLE compression for chunks
    const output = [];
    let i = 0;

    while (i < chunk.length) {
      let count = 1;
      while (i + count < chunk.length && chunk[i + count] === chunk[i] && count < 255) {
        count++;
      }

      if (count >= 4) {
        output.push(0xFF, chunk[i], count);
      } else {
        for (let j = 0; j < count; j++) {
          if (chunk[i] === 0xFF) {
            output.push(0xFF, chunk[i], 1);
          } else {
            output.push(chunk[i]);
          }
        }
      }
      i += count;
    }

    return new Uint8Array(output);
  }

  finishCompression(startTime) {
    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    const compressionPercent = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);
    const avgSpeed = this.file.size / ((endTime - startTime) / 1000);

    this.processTime.textContent = `${processingTime} 秒`;
    this.originalSize.textContent = this.formatFileSize(this.file.size);
    this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
    this.compressionRatio.textContent = `${compressionPercent}% 減少`;
    this.averageSpeed.textContent = `${(avgSpeed / 1048576).toFixed(2)} MB/s`;
    this.performanceInfo.style.display = 'block';

    this.updateProgress(100, '壓縮完成！');

    setTimeout(() => {
      this.progressContainer.classList.remove('active');
      this.showStatus('success', '壓縮完成！');
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.compressBtn.disabled = false;
    }, 500);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.compressedBlob) return;

    const ext = this.compressionFormat === 'gzip' ? '.gz' : '.deflate';
    const filename = `${this.outputFilename.value || 'compressed'}${ext}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.compressedBlob = null;
    this.fileInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = '';
    this.chunkSizeSelect.value = '1048576';
    this.compressionFormatSelect.value = 'gzip';
    this.chunkSize = 1048576;
    this.compressionFormat = 'gzip';
    this.chunksProcessed.textContent = '0 / 0';
    this.bytesProcessed.textContent = '0 Bytes';
    this.currentCompressedSize.textContent = '0 Bytes';
    this.processingSpeed.textContent = '- MB/s';
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.compressor = new StreamCompressor();
});

export default StreamCompressor;
