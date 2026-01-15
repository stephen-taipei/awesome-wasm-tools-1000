/**
 * CMP-047: Stream Decompression Processing
 *
 * Uses Web Streams API for efficient large file decompression.
 * All processing is done locally in the browser.
 */

class StreamDecompressor {
  constructor() {
    this.file = null;
    this.decompressedBlob = null;
    this.decompressionFormat = 'gzip';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.decompressionFormatSelect = document.getElementById('decompressionFormat');
    this.outputFilename = document.getElementById('outputFilename');
    this.decompressBtn = document.getElementById('decompressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.compressedSize = document.getElementById('compressedSize');
    this.decompressedSize = document.getElementById('decompressedSize');
    this.expansionRatio = document.getElementById('expansionRatio');
    this.averageSpeed = document.getElementById('averageSpeed');
    this.chunksProcessed = document.getElementById('chunksProcessed');
    this.bytesRead = document.getElementById('bytesRead');
    this.bytesDecompressed = document.getElementById('bytesDecompressed');
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

    this.decompressionFormatSelect.addEventListener('change', (e) => {
      this.decompressionFormat = e.target.value;
    });

    this.decompressBtn.addEventListener('click', () => this.decompress());
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

    // Auto-detect format and set output filename
    let outputName = file.name;
    if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
      this.decompressionFormatSelect.value = 'gzip';
      this.decompressionFormat = 'gzip';
      outputName = file.name.replace(/\.(gz|gzip)$/, '');
    } else if (file.name.endsWith('.deflate')) {
      this.decompressionFormatSelect.value = 'deflate';
      this.decompressionFormat = 'deflate';
      outputName = file.name.replace(/\.deflate$/, '');
    }
    this.outputFilename.value = outputName || 'decompressed';
    this.decompressBtn.disabled = false;
  }

  async decompress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.decompressBtn.disabled = true;

    try {
      // Check if DecompressionStream is supported
      if (typeof DecompressionStream !== 'undefined') {
        await this.decompressWithStreams(startTime);
      } else {
        await this.decompressWithChunks(startTime);
      }

    } catch (error) {
      console.error('Decompression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解壓縮失敗，請確認檔案格式正確');
      this.decompressBtn.disabled = false;
    }
  }

  async decompressWithStreams(startTime) {
    const stream = this.file.stream();
    const decompressionStream = new DecompressionStream(this.decompressionFormat);
    const decompressedStream = stream.pipeThrough(decompressionStream);

    const reader = decompressedStream.getReader();
    const chunks = [];
    let chunksCount = 0;
    let totalBytesRead = 0;
    let decompressedBytes = 0;
    let lastUpdate = startTime;
    let lastBytesProcessed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      chunksCount++;
      decompressedBytes += value.length;

      const now = performance.now();
      if (now - lastUpdate > 100) {
        const speed = (decompressedBytes - lastBytesProcessed) / ((now - lastUpdate) / 1000);
        const progress = Math.min((chunksCount * 1024 * 64 / this.file.size) * 100, 95);

        this.updateProgress(progress, '串流解壓縮中...');
        this.chunksProcessed.textContent = `${chunksCount}`;
        this.bytesRead.textContent = this.formatFileSize(Math.min(chunksCount * 64 * 1024, this.file.size));
        this.bytesDecompressed.textContent = this.formatFileSize(decompressedBytes);
        this.processingSpeed.textContent = `${(speed / 1048576).toFixed(2)} MB/s`;

        lastUpdate = now;
        lastBytesProcessed = decompressedBytes;
      }
    }

    this.decompressedBlob = new Blob(chunks, { type: 'application/octet-stream' });
    this.finishDecompression(startTime);
  }

  async decompressWithChunks(startTime) {
    // Fallback for browsers without DecompressionStream
    const arrayBuffer = await this.file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check if it's our custom stream format
    if (uint8Array[0] === 0x53 && uint8Array[1] === 0x54 &&
        uint8Array[2] === 0x52 && uint8Array[3] === 0x4D) {
      await this.decompressCustomFormat(uint8Array, startTime);
    } else {
      await this.decompressSimple(uint8Array, startTime);
    }
  }

  async decompressCustomFormat(data, startTime) {
    const view = new DataView(data.buffer);
    const originalSize = view.getUint32(4, true);
    const chunkSize = view.getUint32(8, true);
    const totalChunks = view.getUint32(12, true);

    const decompressedChunks = [];
    let offset = 16;
    let decompressedBytes = 0;
    let lastUpdate = startTime;

    for (let i = 0; i < totalChunks && offset < data.length; i++) {
      const chunkLength = view.getUint32(offset, true);
      offset += 4;

      const chunk = data.slice(offset, offset + chunkLength);
      const decompressedChunk = this.decompressChunk(chunk);
      decompressedChunks.push(decompressedChunk);
      decompressedBytes += decompressedChunk.length;
      offset += chunkLength;

      const now = performance.now();
      if (now - lastUpdate > 100) {
        const progress = ((i + 1) / totalChunks) * 95;
        const speed = decompressedBytes / ((now - startTime) / 1000);

        this.updateProgress(progress, '串流解壓縮中...');
        this.chunksProcessed.textContent = `${i + 1} / ${totalChunks}`;
        this.bytesRead.textContent = this.formatFileSize(offset);
        this.bytesDecompressed.textContent = this.formatFileSize(decompressedBytes);
        this.processingSpeed.textContent = `${(speed / 1048576).toFixed(2)} MB/s`;

        lastUpdate = now;
      }
    }

    // Combine all chunks
    const totalSize = decompressedChunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalSize);
    let resultOffset = 0;
    for (const chunk of decompressedChunks) {
      result.set(chunk, resultOffset);
      resultOffset += chunk.length;
    }

    this.decompressedBlob = new Blob([result], { type: 'application/octet-stream' });
    this.finishDecompression(startTime);
  }

  async decompressSimple(data, startTime) {
    // Try to decompress using RLE decoding
    const output = [];
    let i = 0;
    let lastUpdate = startTime;

    while (i < data.length) {
      if (data[i] === 0xFF && i + 2 < data.length) {
        const byte = data[i + 1];
        const count = data[i + 2];
        for (let j = 0; j < count; j++) {
          output.push(byte);
        }
        i += 3;
      } else {
        output.push(data[i]);
        i++;
      }

      const now = performance.now();
      if (now - lastUpdate > 100 && i % 10000 === 0) {
        const progress = (i / data.length) * 95;
        this.updateProgress(progress, '解壓縮中...');
        this.bytesRead.textContent = this.formatFileSize(i);
        this.bytesDecompressed.textContent = this.formatFileSize(output.length);
        lastUpdate = now;
      }
    }

    this.decompressedBlob = new Blob([new Uint8Array(output)], { type: 'application/octet-stream' });
    this.finishDecompression(startTime);
  }

  decompressChunk(chunk) {
    // RLE decompression for chunks
    const output = [];
    let i = 0;

    while (i < chunk.length) {
      if (chunk[i] === 0xFF && i + 2 < chunk.length) {
        const byte = chunk[i + 1];
        const count = chunk[i + 2];
        for (let j = 0; j < count; j++) {
          output.push(byte);
        }
        i += 3;
      } else {
        output.push(chunk[i]);
        i++;
      }
    }

    return new Uint8Array(output);
  }

  finishDecompression(startTime) {
    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    const expansionPercent = ((this.decompressedBlob.size / this.file.size - 1) * 100).toFixed(1);
    const avgSpeed = this.decompressedBlob.size / ((endTime - startTime) / 1000);

    this.processTime.textContent = `${processingTime} 秒`;
    this.compressedSize.textContent = this.formatFileSize(this.file.size);
    this.decompressedSize.textContent = this.formatFileSize(this.decompressedBlob.size);
    this.expansionRatio.textContent = `${expansionPercent}% 增加`;
    this.averageSpeed.textContent = `${(avgSpeed / 1048576).toFixed(2)} MB/s`;
    this.performanceInfo.style.display = 'block';

    this.updateProgress(100, '解壓縮完成！');

    setTimeout(() => {
      this.progressContainer.classList.remove('active');
      this.showStatus('success', '解壓縮完成！');
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.decompressBtn.disabled = false;
    }, 500);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.decompressedBlob) return;

    const filename = this.outputFilename.value || 'decompressed';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.decompressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.decompressedBlob = null;
    this.fileInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.decompressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = '';
    this.decompressionFormatSelect.value = 'gzip';
    this.decompressionFormat = 'gzip';
    this.chunksProcessed.textContent = '0';
    this.bytesRead.textContent = '0 Bytes';
    this.bytesDecompressed.textContent = '0 Bytes';
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
  window.decompressor = new StreamDecompressor();
});

export default StreamDecompressor;
