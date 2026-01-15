/**
 * CMP-042: DEFLATE Decompression
 *
 * Uses pako library to decompress DEFLATE compressed files.
 * All processing is done locally in the browser.
 */

class DeflateDecompressor {
  constructor() {
    this.file = null;
    this.decompressedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
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

    // Remove compression extension for output filename
    let outputName = file.name;
    if (outputName.endsWith('.deflate')) {
      outputName = outputName.slice(0, -8);
    } else if (outputName.endsWith('.zz') || outputName.endsWith('.z')) {
      outputName = outputName.slice(0, outputName.lastIndexOf('.'));
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
      this.updateProgress(10, '讀取檔案...');
      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.updateProgress(30, '解壓縮中...');

      const decompressed = pako.inflate(uint8Array);

      this.updateProgress(90, '生成檔案...');
      this.decompressedBlob = new Blob([decompressed], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const expansionPercent = ((this.decompressedBlob.size / this.file.size - 1) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.compressedSize.textContent = this.formatFileSize(this.file.size);
      this.decompressedSize.textContent = this.formatFileSize(this.decompressedBlob.size);
      this.expansionRatio.textContent = `${expansionPercent}% 增加`;
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
  window.decompressor = new DeflateDecompressor();
});

export default DeflateDecompressor;
