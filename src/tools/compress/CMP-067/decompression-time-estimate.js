/**
 * CMP-067: Decompression Time Estimator
 *
 * Estimates decompression time for compressed archives.
 * All processing is done locally in the browser.
 */

class DecompressionTimeEstimator {
  constructor() {
    this.file = null;
    this.fileData = null;
    this.fileFormat = null;
    this.sampleSize = 256 * 1024;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileFormat = document.getElementById('fileFormat');
    this.sampleSizeSelect = document.getElementById('sampleSize');
    this.estimateBtn = document.getElementById('estimateBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.estimationResults = document.getElementById('estimationResults');
    this.estimatedTime = document.getElementById('estimatedTime');
    this.decompressionSpeed = document.getElementById('decompressionSpeed');
    this.compressionRatio = document.getElementById('compressionRatio');
    this.estimatedSize = document.getElementById('estimatedSize');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.fileCount = document.getElementById('fileCount');
    this.dirCount = document.getElementById('dirCount');
    this.fileList = document.getElementById('fileList');

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

    this.sampleSizeSelect.addEventListener('change', (e) => {
      this.sampleSize = parseInt(e.target.value) * 1024;
    });

    this.estimateBtn.addEventListener('click', () => this.estimate());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.setFile(event.target.files[0]);
    }
  }

  setFile(file) {
    this.file = file;

    // Detect format
    let format = 'unknown';
    if (file.name.endsWith('.zip')) {
      format = 'ZIP';
    } else if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
      format = 'GZIP';
    }

    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `壓縮大小: ${this.formatFileSize(file.size)}`;
    document.getElementById('fileFormat').textContent = `格式: ${format}`;
    this.fileInfo.style.display = 'block';
    this.estimateBtn.disabled = false;
    this.resetBtn.style.display = 'inline-flex';
    this.detectedFormat = format;
  }

  async estimate() {
    if (!this.file) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '讀取壓縮檔...');

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      this.fileData = new Uint8Array(arrayBuffer);

      this.updateProgress(20, '分析壓縮檔結構...');

      let estimation;
      if (this.detectedFormat === 'ZIP') {
        estimation = await this.estimateZip(arrayBuffer);
      } else if (this.detectedFormat === 'GZIP') {
        estimation = await this.estimateGzip();
      } else {
        throw new Error('不支援的格式');
      }

      this.updateProgress(100, '估算完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '估算完成！');
      }, 500);

    } catch (error) {
      console.error('Estimation error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '估算失敗: ' + error.message);
    }
  }

  async estimateZip(arrayBuffer) {
    this.updateProgress(30, '解析 ZIP 結構...');

    const zip = await JSZip.loadAsync(arrayBuffer);
    const files = Object.keys(zip.files);
    const fileEntries = files.filter(f => !f.endsWith('/'));
    const dirEntries = files.filter(f => f.endsWith('/'));

    this.fileCount.textContent = `${fileEntries.length} 個`;
    this.dirCount.textContent = `${dirEntries.length} 個`;

    this.updateProgress(50, '執行解壓縮測試...');

    // Sample decompression test
    let totalCompressedSize = 0;
    let totalUncompressedSize = 0;
    let totalTime = 0;
    let testedFiles = 0;
    let testedSize = 0;

    // Sort by size and test a sample
    const fileInfos = [];
    for (const path of fileEntries) {
      const file = zip.files[path];
      fileInfos.push({
        path,
        file,
        compressedSize: file._data ? file._data.compressedSize : 0
      });
    }

    for (const info of fileInfos) {
      if (testedSize > this.sampleSize) break;

      const start = performance.now();
      const content = await info.file.async('uint8array');
      const time = performance.now() - start;

      totalTime += time;
      totalUncompressedSize += content.length;
      testedFiles++;
      testedSize += content.length;
    }

    this.updateProgress(70, '計算估算值...');

    // Calculate total uncompressed size
    let estimatedTotalSize = 0;
    for (const info of fileInfos) {
      const content = await info.file.async('uint8array');
      estimatedTotalSize += content.length;
    }

    // Estimate based on sample
    const bytesPerMs = totalUncompressedSize / totalTime;
    const estimatedTime = estimatedTotalSize / bytesPerMs;
    const speed = (totalUncompressedSize / 1024 / 1024) / (totalTime / 1000);
    const ratio = ((estimatedTotalSize - this.file.size) / estimatedTotalSize) * 100;

    this.estimatedTime.textContent = this.formatTime(estimatedTime);
    this.decompressionSpeed.textContent = `${speed.toFixed(2)} MB/s`;
    this.compressionRatio.textContent = `${ratio.toFixed(1)}%`;
    this.estimatedSize.textContent = this.formatFileSize(estimatedTotalSize);
    this.estimationResults.style.display = 'block';

    // Display file list (first 20)
    this.displayFileList(fileInfos.slice(0, 20));
    this.archiveInfo.style.display = 'block';

    return { estimatedTime, speed, ratio, estimatedTotalSize };
  }

  async estimateGzip() {
    this.updateProgress(30, '測試解壓縮速度...');

    // For GZIP, take samples and test
    const sampleSize = Math.min(this.sampleSize, this.fileData.length);
    const sample = this.fileData.slice(0, sampleSize);

    const start = performance.now();
    let decompressed;
    try {
      decompressed = pako.ungzip(this.fileData);
    } catch (e) {
      // If full decompression fails, try inflate
      decompressed = pako.inflate(this.fileData);
    }
    const time = performance.now() - start;

    const speed = (decompressed.length / 1024 / 1024) / (time / 1000);
    const ratio = ((decompressed.length - this.file.size) / decompressed.length) * 100;

    this.estimatedTime.textContent = this.formatTime(time);
    this.decompressionSpeed.textContent = `${speed.toFixed(2)} MB/s`;
    this.compressionRatio.textContent = `${ratio.toFixed(1)}%`;
    this.estimatedSize.textContent = this.formatFileSize(decompressed.length);
    this.estimationResults.style.display = 'block';

    // For GZIP, show single file info
    this.fileCount.textContent = '1 個';
    this.dirCount.textContent = '0 個';
    const fileName = this.file.name.replace(/\.(gz|gzip)$/i, '');
    this.fileList.innerHTML = `<div class="file-item">📄 ${fileName} (${this.formatFileSize(decompressed.length)})</div>`;
    this.archiveInfo.style.display = 'block';

    return { estimatedTime: time, speed, ratio, estimatedTotalSize: decompressed.length };
  }

  displayFileList(files) {
    let html = '';
    for (const info of files) {
      const icon = info.path.endsWith('/') ? '📁' : '📄';
      html += `<div class="file-item">${icon} ${info.path}</div>`;
    }
    if (files.length === 20) {
      html += '<div class="file-item">...</div>';
    }
    this.fileList.innerHTML = html;
  }

  formatTime(ms) {
    if (ms < 1000) {
      return `${ms.toFixed(0)} 毫秒`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)} 秒`;
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes} 分 ${seconds} 秒`;
    } else {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours} 小時 ${minutes} 分`;
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.fileData = null;
    this.detectedFormat = null;
    this.fileInfo.style.display = 'none';
    this.estimationResults.style.display = 'none';
    this.archiveInfo.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.estimateBtn.disabled = true;
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
  window.estimator = new DecompressionTimeEstimator();
});

export default DecompressionTimeEstimator;
