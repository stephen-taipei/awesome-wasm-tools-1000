/**
 * CMP-033: Batch Decompression
 *
 * Decompresses multiple archive files in batch.
 * All processing is done locally in the browser.
 */

class BatchDecompressor {
  constructor() {
    this.files = [];
    this.extractedFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.decompressBtn = document.getElementById('decompressBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.fileList = document.getElementById('fileList');
    this.fileListContent = document.getElementById('fileListContent');
    this.fileCount = document.getElementById('fileCount');
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

    this.decompressBtn.addEventListener('click', () => this.decompress());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processFiles(files);
  }

  processFiles(files) {
    // Filter supported formats
    this.files = files.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.zip') || name.endsWith('.gz') || name.endsWith('.gzip');
    });

    if (this.files.length === 0) {
      this.showStatus('error', '請選擇支援的壓縮檔格式 (ZIP, GZIP)');
      return;
    }

    this.decompressBtn.disabled = false;

    // Display file list
    let html = '';
    for (const file of this.files) {
      const format = this.getFormat(file.name);
      html += `<div class="file-item">
        <span class="file-name">${file.name}</span>
        <span class="file-format">${format}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
      </div>`;
    }
    this.fileListContent.innerHTML = html;
    this.fileCount.textContent = `${this.files.length} 個`;
    this.fileList.style.display = 'block';

    this.showStatus('info', `已載入 ${this.files.length} 個壓縮檔`);
  }

  getFormat(filename) {
    const name = filename.toLowerCase();
    if (name.endsWith('.zip')) return 'ZIP';
    if (name.endsWith('.gz') || name.endsWith('.gzip')) return 'GZIP';
    return 'Unknown';
  }

  async decompress() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇壓縮檔');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.decompressBtn.disabled = true;
    this.extractedFiles = [];

    try {
      const total = this.files.length;
      for (let i = 0; i < total; i++) {
        const file = this.files[i];
        this.updateProgress((i / total) * 100, `解壓縮中: ${file.name}`);

        const format = this.getFormat(file.name);
        const arrayBuffer = await file.arrayBuffer();

        if (format === 'ZIP') {
          await this.extractZip(file.name, arrayBuffer);
        } else if (format === 'GZIP') {
          await this.extractGzip(file.name, arrayBuffer);
        }
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `解壓縮完成！耗時 ${processingTime} 秒`);

      // Display results
      this.displayResults();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `批量解壓縮完成！共解壓 ${this.extractedFiles.length} 個檔案`);
        this.downloadAllBtn.style.display = 'inline-flex';
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

  async extractZip(archiveName, arrayBuffer) {
    const zip = await JSZip.loadAsync(arrayBuffer);

    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir) {
        const content = await entry.async('uint8array');
        const blob = new Blob([content], { type: 'application/octet-stream' });

        this.extractedFiles.push({
          name: path,
          archiveName: archiveName,
          size: blob.size,
          blob: blob
        });
      }
    }
  }

  async extractGzip(archiveName, arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(uint8Array);
    const blob = new Blob([decompressed], { type: 'application/octet-stream' });

    // Remove .gz extension for output name
    let outputName = archiveName.replace(/\.(gz|gzip)$/i, '');
    if (outputName === archiveName) {
      outputName = archiveName + '.decompressed';
    }

    this.extractedFiles.push({
      name: outputName,
      archiveName: archiveName,
      size: blob.size,
      blob: blob
    });
  }

  displayResults() {
    let html = '';
    const groupedByArchive = {};

    for (const file of this.extractedFiles) {
      if (!groupedByArchive[file.archiveName]) {
        groupedByArchive[file.archiveName] = [];
      }
      groupedByArchive[file.archiveName].push(file);
    }

    for (const [archiveName, files] of Object.entries(groupedByArchive)) {
      html += `<div class="result-group">
        <div class="result-group-header">📦 ${archiveName}</div>`;

      for (const file of files) {
        const fileId = this.extractedFiles.indexOf(file);
        html += `<div class="result-item">
          <div class="result-info">
            <span class="result-name">${file.name}</span>
            <span class="result-details">${this.formatFileSize(file.size)}</span>
          </div>
          <button class="btn btn-small" onclick="window.batchDecompressor.downloadFile(${fileId})">
            下載
          </button>
        </div>`;
      }

      html += '</div>';
    }

    this.resultList.innerHTML = html;
    this.resultPanel.style.display = 'block';
  }

  downloadFile(index) {
    const file = this.extractedFiles[index];
    if (!file) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.name.split('/').pop();
    link.click();
    URL.revokeObjectURL(link.href);
  }

  downloadAll() {
    for (let i = 0; i < this.extractedFiles.length; i++) {
      this.downloadFile(i);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.extractedFiles = [];
    this.fileList.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
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
  window.batchDecompressor = new BatchDecompressor();
});

export default BatchDecompressor;
