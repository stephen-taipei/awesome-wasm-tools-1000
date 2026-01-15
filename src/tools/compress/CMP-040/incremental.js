/**
 * CMP-040: Incremental Compression
 *
 * Compresses only new or modified files.
 * All processing is done locally in the browser.
 */

class IncrementalCompressor {
  constructor() {
    this.baseZip = null;
    this.baseHashes = new Map();
    this.newFiles = [];
    this.comparison = {
      new: [],
      modified: [],
      unchanged: []
    };
    this.compressedBlob = null;
    this.init();
  }

  init() {
    this.baseUploadArea = document.getElementById('baseUploadArea');
    this.baseFileInput = document.getElementById('baseFileInput');
    this.baseInfo = document.getElementById('baseInfo');
    this.baseName = document.getElementById('baseName');
    this.baseFileCount = document.getElementById('baseFileCount');
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.compressBtn = document.getElementById('compressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.comparisonPanel = document.getElementById('comparisonPanel');
    this.newCount = document.getElementById('newCount');
    this.modifiedCount = document.getElementById('modifiedCount');
    this.unchangedCount = document.getElementById('unchangedCount');
    this.changesList = document.getElementById('changesList');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.outputFileName = document.getElementById('outputFileName');
    this.outputFileSize = document.getElementById('outputFileSize');
    this.includedFiles = document.getElementById('includedFiles');
    this.savedSpace = document.getElementById('savedSpace');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Base file upload
    this.baseUploadArea.addEventListener('click', () => this.baseFileInput.click());
    this.baseFileInput.addEventListener('change', (e) => this.handleBaseFileSelect(e));

    this.baseUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.baseUploadArea.classList.add('dragover');
    });

    this.baseUploadArea.addEventListener('dragleave', () => {
      this.baseUploadArea.classList.remove('dragover');
    });

    this.baseUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.baseUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.loadBaseFile(file);
    });

    // New files upload
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
      if (files.length > 0) this.processNewFiles(files);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleBaseFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.loadBaseFile(file);
  }

  async loadBaseFile(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.showStatus('error', '請選擇 ZIP 格式的基礎壓縮檔');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.baseZip = await JSZip.loadAsync(arrayBuffer);
      this.baseHashes.clear();

      // Calculate hashes for all files in base
      let count = 0;
      for (const [path, entry] of Object.entries(this.baseZip.files)) {
        if (!entry.dir) {
          const content = await entry.async('uint8array');
          const hash = await this.calculateHash(content);
          this.baseHashes.set(path, hash);
          count++;
        }
      }

      this.baseName.textContent = file.name;
      this.baseFileCount.textContent = `${count} 個檔案`;
      this.baseInfo.style.display = 'flex';

      this.showStatus('info', `已載入基礎壓縮檔: ${file.name}`);

      // Re-compare if new files are already loaded
      if (this.newFiles.length > 0) {
        await this.compareFiles();
      }

    } catch (error) {
      console.error('Base file error:', error);
      this.showStatus('error', '載入基礎壓縮檔失敗');
    }
  }

  clearBase() {
    this.baseZip = null;
    this.baseHashes.clear();
    this.baseFileInput.value = '';
    this.baseInfo.style.display = 'none';

    // Re-compare if new files are loaded
    if (this.newFiles.length > 0) {
      this.compareFiles();
    }
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processNewFiles(files);
  }

  async processNewFiles(files) {
    this.newFiles = files;
    await this.compareFiles();
    this.compressBtn.disabled = false;
    this.showStatus('info', `已載入 ${files.length} 個新檔案`);
  }

  async calculateHash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async compareFiles() {
    this.comparison = {
      new: [],
      modified: [],
      unchanged: []
    };

    for (const file of this.newFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const content = new Uint8Array(arrayBuffer);
      const hash = await this.calculateHash(content);

      if (this.baseHashes.has(file.name)) {
        const baseHash = this.baseHashes.get(file.name);
        if (hash === baseHash) {
          this.comparison.unchanged.push({
            name: file.name,
            size: file.size,
            file: file
          });
        } else {
          this.comparison.modified.push({
            name: file.name,
            size: file.size,
            file: file
          });
        }
      } else {
        this.comparison.new.push({
          name: file.name,
          size: file.size,
          file: file
        });
      }
    }

    this.displayComparison();
  }

  displayComparison() {
    this.newCount.textContent = this.comparison.new.length;
    this.modifiedCount.textContent = this.comparison.modified.length;
    this.unchangedCount.textContent = this.comparison.unchanged.length;

    let html = '';

    if (this.comparison.new.length > 0) {
      html += '<div class="changes-group"><h4>新增檔案</h4>';
      for (const item of this.comparison.new) {
        html += `<div class="change-item new">
          <span class="change-icon">+</span>
          <span class="change-name">${item.name}</span>
          <span class="change-size">${this.formatFileSize(item.size)}</span>
        </div>`;
      }
      html += '</div>';
    }

    if (this.comparison.modified.length > 0) {
      html += '<div class="changes-group"><h4>已修改</h4>';
      for (const item of this.comparison.modified) {
        html += `<div class="change-item modified">
          <span class="change-icon">*</span>
          <span class="change-name">${item.name}</span>
          <span class="change-size">${this.formatFileSize(item.size)}</span>
        </div>`;
      }
      html += '</div>';
    }

    if (this.comparison.unchanged.length > 0) {
      html += '<div class="changes-group"><h4>未變更（將跳過）</h4>';
      for (const item of this.comparison.unchanged) {
        html += `<div class="change-item unchanged">
          <span class="change-icon">=</span>
          <span class="change-name">${item.name}</span>
          <span class="change-size">${this.formatFileSize(item.size)}</span>
        </div>`;
      }
      html += '</div>';
    }

    this.changesList.innerHTML = html;
    this.comparisonPanel.style.display = 'block';
  }

  async compress() {
    const filesToCompress = [...this.comparison.new, ...this.comparison.modified];

    if (filesToCompress.length === 0) {
      this.showStatus('warning', '沒有需要壓縮的檔案（全部未變更）');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;

    try {
      this.updateProgress(10, '建立增量壓縮檔...');

      const zip = new JSZip();
      const total = filesToCompress.length;

      for (let i = 0; i < total; i++) {
        const item = filesToCompress[i];
        this.updateProgress(10 + (i / total) * 70, `壓縮: ${item.name}`);

        const arrayBuffer = await item.file.arrayBuffer();
        zip.file(item.name, new Uint8Array(arrayBuffer));
      }

      this.updateProgress(85, '產生壓縮檔...');

      this.compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Calculate stats
      const totalOriginalSize = filesToCompress.reduce((sum, f) => sum + f.size, 0);
      const allFilesSize = this.newFiles.reduce((sum, f) => sum + f.size, 0);
      const savedSize = allFilesSize - totalOriginalSize;
      const savedPercent = allFilesSize > 0 ? ((savedSize / allFilesSize) * 100).toFixed(1) : 0;

      this.outputFileName.textContent = 'incremental_backup.zip';
      this.outputFileSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.includedFiles.textContent = `${filesToCompress.length} 個`;
      this.savedSpace.textContent = `${this.formatFileSize(savedSize)} (${savedPercent}% 省略未變更)`;

      this.updateProgress(100, `完成！耗時 ${processingTime} 秒`);

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.resultPanel.style.display = 'block';
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.showStatus('success', `增量壓縮完成！僅壓縮 ${filesToCompress.length} 個變更檔案`);
        this.compressBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.compressBtn.disabled = false;
    }
  }

  download() {
    if (!this.compressedBlob) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
    link.download = `incremental_${timestamp}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.newFiles = [];
    this.comparison = { new: [], modified: [], unchanged: [] };
    this.compressedBlob = null;
    this.comparisonPanel.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
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
  window.incrementalCompressor = new IncrementalCompressor();
});

export default IncrementalCompressor;
