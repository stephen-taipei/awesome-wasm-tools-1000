/**
 * CMP-048: Compression Progress Monitor
 *
 * Monitors compression progress with detailed statistics.
 * All processing is done locally in the browser.
 */

class ProgressMonitor {
  constructor() {
    this.files = [];
    this.compressedBlob = null;
    this.isPaused = false;
    this.stats = {
      filesProcessed: 0,
      bytesProcessed: 0,
      compressedBytes: 0,
      startTime: 0
    };
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.selectedFiles = document.getElementById('selectedFiles');
    this.totalSize = document.getElementById('totalSize');
    this.compressBtn = document.getElementById('compressBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Monitor elements
    this.overallProgressFill = document.getElementById('overallProgressFill');
    this.overallProgress = document.getElementById('overallProgress');
    this.currentFile = document.getElementById('currentFile');
    this.filesProcessed = document.getElementById('filesProcessed');
    this.bytesProcessed = document.getElementById('bytesProcessed');
    this.compressedBytes = document.getElementById('compressedBytes');
    this.currentRatio = document.getElementById('currentRatio');
    this.processingSpeed = document.getElementById('processingSpeed');
    this.estimatedTime = document.getElementById('estimatedTime');
    this.fileProgressList = document.getElementById('fileProgressList');
    this.fileProgressItems = document.getElementById('fileProgressItems');

    // Final stats elements
    this.totalTime = document.getElementById('totalTime');
    this.totalFilesEl = document.getElementById('totalFiles');
    this.originalTotalSize = document.getElementById('originalTotalSize');
    this.compressedTotalSize = document.getElementById('compressedTotalSize');
    this.finalRatio = document.getElementById('finalRatio');
    this.avgSpeed = document.getElementById('avgSpeed');

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
      this.addFiles(e.dataTransfer.files);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addFiles(event.target.files);
  }

  addFiles(fileList) {
    for (const file of fileList) {
      this.files.push(file);
    }
    this.updateFileList();
    this.compressBtn.disabled = this.files.length === 0;
  }

  updateFileList() {
    this.selectedFiles.innerHTML = '';
    let total = 0;

    this.files.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.selectedFiles.appendChild(li);
      total += file.size;
    });

    this.selectedFiles.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.files.splice(index, 1);
        this.updateFileList();
        this.compressBtn.disabled = this.files.length === 0;
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileList.style.display = this.files.length > 0 ? 'block' : 'none';

    // Initialize file progress items
    this.initFileProgressItems();
  }

  initFileProgressItems() {
    this.fileProgressItems.innerHTML = '';
    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-progress-item';
      item.id = `file-progress-${index}`;
      item.innerHTML = `
        <div class="file-progress-header">
          <span class="file-name">${file.name}</span>
          <span class="file-status" id="file-status-${index}">等待中</span>
        </div>
        <div class="progress-bar small">
          <div class="progress-fill" id="file-progress-fill-${index}"></div>
        </div>
        <div class="file-progress-stats">
          <span id="file-size-${index}">${this.formatFileSize(file.size)}</span>
          <span id="file-compressed-${index}">-</span>
        </div>
      `;
      this.fileProgressItems.appendChild(item);
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.pauseBtn.innerHTML = this.isPaused
      ? '<span>▶️</span><span>繼續</span>'
      : '<span>⏸️</span><span>暫停</span>';
    this.progressText.textContent = this.isPaused ? '已暫停' : '壓縮中...';
  }

  async compress() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    this.stats.startTime = performance.now();
    this.stats.filesProcessed = 0;
    this.stats.bytesProcessed = 0;
    this.stats.compressedBytes = 0;

    this.progressContainer.classList.add('active');
    this.fileProgressList.style.display = 'block';
    this.compressBtn.disabled = true;
    this.pauseBtn.style.display = 'inline-flex';

    try {
      const zip = new JSZip();
      const totalFiles = this.files.length;
      let totalOriginalSize = 0;

      for (let i = 0; i < totalFiles; i++) {
        // Check for pause
        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const file = this.files[i];
        this.currentFile.textContent = file.name;
        this.updateFileStatus(i, 'processing', '處理中...');

        const arrayBuffer = await file.arrayBuffer();
        totalOriginalSize += file.size;
        this.stats.bytesProcessed += file.size;

        zip.file(file.name, arrayBuffer, {
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });

        this.stats.filesProcessed = i + 1;
        this.updateFileStatus(i, 'completed', '完成');
        this.updateFileProgress(i, 100, file.size);
        this.updateMonitor(totalFiles, totalOriginalSize);
      }

      this.progressText.textContent = '生成 ZIP 檔案...';
      this.compressedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        const progress = 90 + metadata.percent * 0.1;
        this.updateProgress(progress, '壓縮中...');
        this.stats.compressedBytes = Math.round(totalOriginalSize * (1 - metadata.percent / 200));
        this.updateMonitor(totalFiles, totalOriginalSize);
      });

      this.stats.compressedBytes = this.compressedBlob.size;
      this.finishCompression(totalOriginalSize);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.compressBtn.disabled = false;
      this.pauseBtn.style.display = 'none';
    }
  }

  updateFileStatus(index, status, text) {
    const statusEl = document.getElementById(`file-status-${index}`);
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `file-status ${status}`;
    }
  }

  updateFileProgress(index, progress, compressedSize) {
    const fillEl = document.getElementById(`file-progress-fill-${index}`);
    const compressedEl = document.getElementById(`file-compressed-${index}`);
    if (fillEl) {
      fillEl.style.width = `${progress}%`;
    }
    if (compressedEl && compressedSize) {
      compressedEl.textContent = `已處理`;
    }
  }

  updateMonitor(totalFiles, totalOriginalSize) {
    const elapsed = (performance.now() - this.stats.startTime) / 1000;
    const progress = (this.stats.bytesProcessed / totalOriginalSize) * 100;
    const speed = this.stats.bytesProcessed / elapsed;
    const remaining = (totalOriginalSize - this.stats.bytesProcessed) / speed;
    const ratio = this.stats.compressedBytes > 0
      ? ((1 - this.stats.compressedBytes / this.stats.bytesProcessed) * 100).toFixed(1)
      : 0;

    this.overallProgressFill.style.width = `${progress}%`;
    this.overallProgress.textContent = `${progress.toFixed(1)}%`;
    this.filesProcessed.textContent = `${this.stats.filesProcessed} / ${totalFiles}`;
    this.bytesProcessed.textContent = this.formatFileSize(this.stats.bytesProcessed);
    this.compressedBytes.textContent = this.formatFileSize(this.stats.compressedBytes);
    this.currentRatio.textContent = `${ratio}%`;
    this.processingSpeed.textContent = `${(speed / 1048576).toFixed(2)} MB/s`;
    this.estimatedTime.textContent = this.formatTime(remaining);

    this.updateProgress(progress * 0.9, '壓縮中...');
  }

  finishCompression(totalOriginalSize) {
    const endTime = performance.now();
    const totalTimeSeconds = ((endTime - this.stats.startTime) / 1000).toFixed(2);
    const finalRatio = ((1 - this.compressedBlob.size / totalOriginalSize) * 100).toFixed(1);
    const avgSpeed = totalOriginalSize / ((endTime - this.stats.startTime) / 1000);

    this.totalTime.textContent = `${totalTimeSeconds} 秒`;
    this.totalFilesEl.textContent = `${this.files.length} 個`;
    this.originalTotalSize.textContent = this.formatFileSize(totalOriginalSize);
    this.compressedTotalSize.textContent = this.formatFileSize(this.compressedBlob.size);
    this.finalRatio.textContent = `${finalRatio}% 減少`;
    this.avgSpeed.textContent = `${(avgSpeed / 1048576).toFixed(2)} MB/s`;
    this.performanceInfo.style.display = 'block';

    this.updateProgress(100, '壓縮完成！');
    this.currentFile.textContent = '全部完成';
    this.estimatedTime.textContent = '0 秒';

    setTimeout(() => {
      this.progressContainer.classList.remove('active');
      this.showStatus('success', '壓縮完成！');
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.pauseBtn.style.display = 'none';
      this.compressBtn.disabled = false;
    }, 500);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '-';
    if (seconds < 60) return `${Math.round(seconds)} 秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
    return `${Math.floor(seconds / 3600)} 時 ${Math.floor((seconds % 3600) / 60)} 分`;
  }

  download() {
    if (!this.compressedBlob) return;

    const filename = 'archive.zip';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.compressedBlob = null;
    this.isPaused = false;
    this.stats = { filesProcessed: 0, bytesProcessed: 0, compressedBytes: 0, startTime: 0 };
    this.selectedFiles.innerHTML = '';
    this.fileList.style.display = 'none';
    this.fileProgressList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    // Reset monitor
    this.overallProgressFill.style.width = '0%';
    this.overallProgress.textContent = '0%';
    this.currentFile.textContent = '-';
    this.filesProcessed.textContent = '0 / 0';
    this.bytesProcessed.textContent = '0 Bytes';
    this.compressedBytes.textContent = '0 Bytes';
    this.currentRatio.textContent = '0%';
    this.processingSpeed.textContent = '- MB/s';
    this.estimatedTime.textContent = '-';
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
  window.monitor = new ProgressMonitor();
});

export default ProgressMonitor;
