/**
 * CMP-032: Batch Compression
 *
 * Compresses multiple files in batch.
 * All processing is done locally in the browser.
 */

class BatchCompressor {
  constructor() {
    this.files = [];
    this.compressedFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.compressBtn = document.getElementById('compressBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.fileList = document.getElementById('fileList');
    this.fileListContent = document.getElementById('fileListContent');
    this.fileCount = document.getElementById('fileCount');
    this.totalSize = document.getElementById('totalSize');
    this.outputFormat = document.getElementById('outputFormat');
    this.compressMode = document.getElementById('compressMode');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.resultList = document.getElementById('resultList');
    this.statusMessage = document.getElementById('statusMessage');

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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) this.processFiles(files);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processFiles(files);
  }

  processFiles(files) {
    this.files = files;
    this.compressBtn.disabled = false;

    // Display file list
    let html = '';
    let total = 0;
    for (const file of files) {
      html += `<div class="file-item">
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
      </div>`;
      total += file.size;
    }
    this.fileListContent.innerHTML = html;
    this.fileCount.textContent = `${files.length} 個`;
    this.totalSize.textContent = this.formatFileSize(total);
    this.fileList.style.display = 'block';

    this.showStatus('info', `已載入 ${files.length} 個檔案`);
  }

  async compress() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;
    this.compressedFiles = [];

    const format = this.outputFormat.value;
    const mode = this.compressMode.value;

    try {
      if (mode === 'single') {
        await this.compressSingle(format);
      } else {
        await this.compressIndividual(format);
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `壓縮完成！耗時 ${processingTime} 秒`);

      // Display results
      this.displayResults();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '批量壓縮完成！');
        this.downloadAllBtn.style.display = 'inline-flex';
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

  async compressIndividual(format) {
    const total = this.files.length;
    for (let i = 0; i < total; i++) {
      const file = this.files[i];
      this.updateProgress((i / total) * 100, `壓縮中: ${file.name}`);

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let compressedBlob;
      let outputName;

      if (format === 'zip') {
        const zip = new JSZip();
        zip.file(file.name, uint8Array);
        const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        compressedBlob = content;
        outputName = file.name + '.zip';
      } else {
        // GZIP
        const compressed = pako.gzip(uint8Array);
        compressedBlob = new Blob([compressed], { type: 'application/gzip' });
        outputName = file.name + '.gz';
      }

      this.compressedFiles.push({
        name: outputName,
        originalName: file.name,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        blob: compressedBlob
      });
    }
  }

  async compressSingle(format) {
    this.updateProgress(20, '準備合併壓縮...');

    if (format === 'zip') {
      const zip = new JSZip();
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        this.updateProgress(20 + (i / this.files.length) * 60, `添加: ${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        zip.file(file.name, new Uint8Array(arrayBuffer));
      }

      this.updateProgress(85, '產生壓縮檔...');
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      const totalOriginal = this.files.reduce((sum, f) => sum + f.size, 0);
      this.compressedFiles.push({
        name: 'archive.zip',
        originalName: `${this.files.length} 個檔案`,
        originalSize: totalOriginal,
        compressedSize: content.size,
        blob: content
      });
    } else {
      // For GZIP, compress first file only (GZIP is single-file format)
      const file = this.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const compressed = pako.gzip(new Uint8Array(arrayBuffer));
      const compressedBlob = new Blob([compressed], { type: 'application/gzip' });

      this.compressedFiles.push({
        name: file.name + '.gz',
        originalName: file.name,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        blob: compressedBlob
      });

      if (this.files.length > 1) {
        this.showStatus('warning', 'GZIP 格式只能壓縮單一檔案，已壓縮第一個檔案');
      }
    }
  }

  displayResults() {
    let html = '';
    for (const file of this.compressedFiles) {
      const ratio = ((1 - file.compressedSize / file.originalSize) * 100).toFixed(1);
      html += `<div class="result-item">
        <div class="result-info">
          <span class="result-name">${file.name}</span>
          <span class="result-details">
            ${this.formatFileSize(file.originalSize)} → ${this.formatFileSize(file.compressedSize)}
            (節省 ${ratio}%)
          </span>
        </div>
        <button class="btn btn-small" onclick="window.batchCompressor.downloadFile('${file.name}')">
          下載
        </button>
      </div>`;
    }
    this.resultList.innerHTML = html;
    this.resultPanel.style.display = 'block';
  }

  downloadFile(name) {
    const file = this.compressedFiles.find(f => f.name === name);
    if (!file) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  downloadAll() {
    for (const file of this.compressedFiles) {
      this.downloadFile(file.name);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.compressedFiles = [];
    this.fileList.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
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
  window.batchCompressor = new BatchCompressor();
});

export default BatchCompressor;
