/**
 * IMG-050 批量去背
 * 批量處理多張圖片的背景移除
 */

class BatchBackgroundRemovalTool {
  constructor() {
    this.files = [];
    this.results = [];
    this.zipBlob = null;
    this.isModelLoaded = false;

    this.init();
  }

  async init() {
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingProgressFill = document.getElementById('loadingProgressFill');

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.fileItems = document.getElementById('fileItems');
    this.fileCount = document.getElementById('fileCount');

    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.resultSummary = document.getElementById('resultSummary');
    this.statProcessed = document.getElementById('statProcessed');
    this.statSuccess = document.getElementById('statSuccess');
    this.statFailed = document.getElementById('statFailed');

    this.bindEvents();
    await this.preloadModel();
  }

  async preloadModel() {
    try {
      this.loadingText.textContent = '載入 AI 去背模型中（約 20MB）...';
      this.loadingProgressFill.style.width = '30%';

      if (typeof imglyRemoveBackground === 'undefined') {
        throw new Error('AI 模型庫載入失敗');
      }

      this.loadingProgressFill.style.width = '100%';
      this.loadingText.textContent = '模型載入完成！';

      setTimeout(() => {
        this.loadingOverlay.classList.add('hidden');
        this.isModelLoaded = true;
      }, 500);

    } catch (error) {
      console.error('Model load error:', error);
      this.loadingText.textContent = '模型載入失敗，請重新整理頁面';
    }
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      this.addFiles(e.dataTransfer.files);
    });
    this.fileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Action buttons
    this.processBtn.addEventListener('click', () => this.processAll());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  addFiles(fileList) {
    for (const file of fileList) {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        continue;
      }

      if (this.files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        continue;
      }

      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      this.files.push({
        id,
        file,
        status: 'pending',
        thumb: null,
        resultThumb: null,
        result: null
      });
    }

    this.renderFileList();
    this.updateUI();
  }

  renderFileList() {
    this.fileItems.innerHTML = '';

    this.files.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.id = `file-${item.id}`;

      // Create thumbnail
      if (!item.thumb) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.thumb = e.target.result;
          const img = div.querySelector('.file-thumb.original');
          if (img) img.src = item.thumb;
        };
        reader.readAsDataURL(item.file);
      }

      div.innerHTML = `
        <div class="file-thumbs">
          <img class="file-thumb original" src="${item.thumb || ''}" alt="${item.file.name}">
          <img class="file-thumb result" src="${item.resultThumb || ''}" alt="Result" style="display: ${item.resultThumb ? 'block' : 'none'}">
        </div>
        <div class="file-info">
          <div class="file-name">${item.file.name}</div>
          <div class="file-size">${this.formatSize(item.file.size)}</div>
        </div>
        <span class="file-status ${item.status}">${this.getStatusText(item.status)}</span>
        <button class="file-remove" data-id="${item.id}">×</button>
      `;

      div.querySelector('.file-remove').addEventListener('click', () => {
        this.removeFile(item.id);
      });

      this.fileItems.appendChild(div);
    });

    this.fileCount.textContent = `${this.files.length} 張`;
  }

  removeFile(id) {
    this.files = this.files.filter(f => f.id !== id);
    this.renderFileList();
    this.updateUI();
  }

  getStatusText(status) {
    switch (status) {
      case 'pending': return '等待中';
      case 'processing': return '處理中...';
      case 'done': return '已完成';
      case 'error': return '失敗';
      default: return status;
    }
  }

  updateUI() {
    const hasFiles = this.files.length > 0;
    this.fileList.style.display = hasFiles ? 'block' : 'none';
    this.processBtn.disabled = !hasFiles || !this.isModelLoaded;
  }

  async processAll() {
    if (!this.isModelLoaded) {
      this.showStatus('error', 'AI 模型尚未載入完成');
      return;
    }

    this.progressContainer.style.display = 'block';
    this.processBtn.disabled = true;
    this.results = [];

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.updateFileStatus(item.id, 'processing');

      const percent = ((i + 1) / this.files.length * 100).toFixed(0);
      this.updateProgress(percent, `AI 處理中 ${i + 1}/${this.files.length}：${item.file.name}`);

      try {
        const blob = await imglyRemoveBackground(item.file);

        item.result = blob;
        item.status = 'done';

        // Create result thumbnail
        item.resultThumb = URL.createObjectURL(blob);
        this.updateFileThumbnail(item.id, item.resultThumb);
        this.updateFileStatus(item.id, 'done');

        const baseName = item.file.name.replace(/\.[^/.]+$/, '');
        this.results.push({
          name: `${baseName}_nobg.png`,
          blob
        });

        successCount++;

      } catch (error) {
        console.error('Process error:', error);
        item.status = 'error';
        this.updateFileStatus(item.id, 'error');
        failedCount++;
      }
    }

    this.progressContainer.style.display = 'none';

    // Create ZIP
    if (this.results.length > 0) {
      await this.createZip();
    }

    // Show summary
    this.statProcessed.textContent = this.files.length;
    this.statSuccess.textContent = successCount;
    this.statFailed.textContent = failedCount;
    this.resultSummary.style.display = 'block';

    if (this.results.length > 0) {
      this.downloadBtn.style.display = 'inline-flex';
    }
    this.resetBtn.style.display = 'inline-flex';

    if (failedCount === 0) {
      this.showStatus('success', `成功處理 ${successCount} 張圖片，背景已全部移除`);
    } else {
      this.showStatus('info', `處理完成：${successCount} 張成功，${failedCount} 張失敗`);
    }
  }

  updateFileStatus(id, status) {
    const item = document.querySelector(`#file-${id} .file-status`);
    if (item) {
      item.className = `file-status ${status}`;
      item.textContent = this.getStatusText(status);
    }
  }

  updateFileThumbnail(id, thumbUrl) {
    const item = document.querySelector(`#file-${id} .file-thumb.result`);
    if (item) {
      item.src = thumbUrl;
      item.style.display = 'block';
    }
  }

  async createZip() {
    const zip = new JSZip();

    for (const result of this.results) {
      zip.file(result.name, result.blob);
    }

    this.zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  downloadZip() {
    if (!this.zipBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.zipBlob);
    link.download = `background_removed_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'ZIP 已下載');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  reset() {
    this.files = [];
    this.results = [];
    this.zipBlob = null;

    this.fileInput.value = '';
    this.fileItems.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.processBtn.disabled = true;
    this.progressContainer.style.display = 'none';
    this.resultSummary.style.display = 'none';

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BatchBackgroundRemovalTool();
});
