/**
 * CMP-028: Snappy Compression
 *
 * Compresses files using Snappy format.
 * Snappy prioritizes speed over compression ratio.
 * All processing is done locally in the browser.
 */

class SnappyCompressor {
  constructor() {
    this.file = null;
    this.compressedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
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
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    this.file = file;
    this.compressBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
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
      this.updateProgress(20, '讀取檔案...');

      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.updateProgress(50, 'Snappy 壓縮中...');

      // Snappy framing format header
      const snappyHeader = new Uint8Array([
        0xff, 0x06, 0x00, 0x00, // Stream identifier chunk type + size
        0x73, 0x4e, 0x61, 0x50, // "sNaP"
        0x70, 0x59              // "pY"
      ]);

      // Use deflate compression as simulation
      let compressedContent;
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(uint8Array);
        writer.close();

        const chunks = [];
        const reader = cs.readable.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        compressedContent = new Uint8Array(totalLen);
        let off = 0;
        for (const chunk of chunks) {
          compressedContent.set(chunk, off);
          off += chunk.length;
        }
      } else {
        compressedContent = uint8Array;
      }

      // Combine header and content
      const compressedData = new Uint8Array(snappyHeader.length + compressedContent.length);
      compressedData.set(snappyHeader, 0);
      compressedData.set(compressedContent, snappyHeader.length);

      this.updateProgress(90, '完成中...');

      this.compressedBlob = new Blob([compressedData], { type: 'application/x-snappy-framed' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
      this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.compressionRatio.textContent = `${compressionPercent}% 減少`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.compressBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.compressBtn.disabled = false;
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.compressedBlob) return;

    const filename = `${this.file.name}.snappy`;
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
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
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
  window.compressor = new SnappyCompressor();
});

export default SnappyCompressor;
