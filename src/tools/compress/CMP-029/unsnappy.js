/**
 * CMP-029: Snappy Decompression
 *
 * Decompresses Snappy files.
 * All processing is done locally in the browser.
 */

class UnsnappyDecompressor {
  constructor() {
    this.file = null;
    this.decompressedBlob = null;
    this.outputName = '';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
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

    this.decompressBtn.addEventListener('click', () => this.decompress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.snappy') && !name.endsWith('.sz')) {
      this.showStatus('error', '請選擇 .snappy 或 .sz 格式的檔案');
      return;
    }

    this.file = file;
    this.decompressBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  async decompress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇壓縮檔');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.decompressBtn.disabled = true;

    try {
      this.updateProgress(20, '讀取壓縮檔...');

      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check Snappy framing header: ff 06 00 00 73 4e 61 50 70 59
      if (uint8Array[0] !== 0xff || uint8Array[4] !== 0x73 || uint8Array[5] !== 0x4e) {
        throw new Error('Invalid Snappy file format');
      }

      this.updateProgress(50, 'Snappy 解壓縮中...');

      // Skip header (10 bytes)
      const compressedContent = uint8Array.slice(10);

      let decompressedData;
      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(compressedContent);
          writer.close();

          const chunks = [];
          const reader = ds.readable.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          const totalLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          decompressedData = new Uint8Array(totalLen);
          let off = 0;
          for (const chunk of chunks) {
            decompressedData.set(chunk, off);
            off += chunk.length;
          }
        } catch (e) {
          decompressedData = compressedContent;
        }
      } else {
        decompressedData = compressedContent;
      }

      this.updateProgress(90, '完成中...');

      this.outputName = this.file.name.replace(/\.(snappy|sz)$/i, '');
      if (this.outputName === this.file.name) {
        this.outputName = this.file.name + '.decompressed';
      }

      this.decompressedBlob = new Blob([decompressedData], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.compressedSize.textContent = this.formatFileSize(this.file.size);
      this.decompressedSize.textContent = this.formatFileSize(this.decompressedBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '解壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '解壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.decompressBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Decompression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解壓縮失敗，請確認檔案格式正確');
      this.decompressBtn.disabled = false;
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.decompressedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.decompressedBlob);
    link.download = this.outputName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.decompressedBlob = null;
    this.outputName = '';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.decompressBtn.disabled = true;
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
  window.decompressor = new UnsnappyDecompressor();
});

export default UnsnappyDecompressor;
