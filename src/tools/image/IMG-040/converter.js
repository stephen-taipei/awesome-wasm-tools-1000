/**
 * IMG-040 批量 OCR
 * 批量處理多張圖片的 OCR 辨識
 */

class BatchOCRTool {
  constructor() {
    this.files = [];
    this.results = [];
    this.selectedLang = 'chi_tra';
    this.outputFormat = 'txt';
    this.worker = null;
    this.isWorkerReady = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.moreFileInput = document.getElementById('moreFileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.resultPanel = document.getElementById('resultPanel');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.addMoreBtn = document.getElementById('addMoreBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.fileList = document.getElementById('fileList');
    this.resultPreview = document.getElementById('resultPreview');
    this.batchStats = document.getElementById('batchStats');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.totalCount = document.getElementById('totalCount');
    this.processedCount = document.getElementById('processedCount');
    this.pendingCount = document.getElementById('pendingCount');

    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingProgress = document.getElementById('loadingProgress');

    this.bindEvents();
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

    // Add more files
    this.addMoreBtn.addEventListener('click', () => this.moreFileInput.click());
    this.moreFileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Language selector
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn[data-lang]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedLang = btn.dataset.lang;
      });
    });

    // Output format
    this.outputFormatSelect.addEventListener('change', () => {
      this.outputFormat = this.outputFormatSelect.value;
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.processAll());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  addFiles(fileList) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];

    for (const file of fileList) {
      if (validTypes.includes(file.type)) {
        // Check if already added
        if (!this.files.find(f => f.name === file.name && f.size === file.size)) {
          this.files.push({
            file: file,
            status: 'pending',
            text: '',
            preview: null
          });
        }
      }
    }

    if (this.files.length > 0) {
      this.settingsPanel.style.display = 'block';
      this.renderFileList();
      this.updateStats();
      this.convertBtn.disabled = false;
    }
  }

  renderFileList() {
    this.fileList.innerHTML = '';

    this.files.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'file-item';

      // Create preview
      if (!item.preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.preview = e.target.result;
          const img = div.querySelector('img');
          if (img) img.src = item.preview;
        };
        reader.readAsDataURL(item.file);
      }

      div.innerHTML = `
        <img src="${item.preview || ''}" alt="">
        <div class="info">
          <div class="name">${item.file.name}</div>
          <div class="size">${this.formatSize(item.file.size)}</div>
        </div>
        <span class="status ${item.status}">${this.getStatusText(item.status)}</span>
        <button class="remove-btn" data-index="${index}">×</button>
      `;

      div.querySelector('.remove-btn').addEventListener('click', () => {
        this.files.splice(index, 1);
        this.renderFileList();
        this.updateStats();
        if (this.files.length === 0) {
          this.settingsPanel.style.display = 'none';
          this.convertBtn.disabled = true;
        }
      });

      this.fileList.appendChild(div);
    });
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getStatusText(status) {
    switch (status) {
      case 'pending': return '等待';
      case 'processing': return '處理中';
      case 'done': return '完成';
      case 'error': return '錯誤';
      default: return status;
    }
  }

  updateStats() {
    const total = this.files.length;
    const processed = this.files.filter(f => f.status === 'done').length;
    const pending = this.files.filter(f => f.status === 'pending').length;

    this.totalCount.textContent = total;
    this.processedCount.textContent = processed;
    this.pendingCount.textContent = pending;

    this.batchStats.style.display = total > 0 ? 'flex' : 'none';
  }

  async initWorker(lang) {
    this.loadingOverlay.classList.remove('hidden');
    this.loadingText.textContent = '正在初始化 OCR 引擎...';
    this.loadingProgress.textContent = '';

    try {
      this.worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            this.loadingText.textContent = '正在載入 Tesseract 核心...';
          } else if (m.status === 'loading language traineddata') {
            this.loadingText.textContent = `正在下載 ${lang} 語言模型...`;
            if (m.progress) {
              this.loadingProgress.textContent = `${Math.round(m.progress * 100)}%`;
            }
          } else if (m.status === 'initializing api') {
            this.loadingText.textContent = '正在初始化 API...';
          }
        }
      });

      this.isWorkerReady = true;
      this.loadingOverlay.classList.add('hidden');
      return true;
    } catch (error) {
      console.error('Worker init error:', error);
      this.loadingOverlay.classList.add('hidden');
      this.showStatus('error', `OCR 引擎初始化失敗：${error.message}`);
      return false;
    }
  }

  async processAll() {
    if (this.files.length === 0) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.results = [];

    // Initialize worker
    if (!this.isWorkerReady || this.worker?.lang !== this.selectedLang) {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
        this.isWorkerReady = false;
      }
      const success = await this.initWorker(this.selectedLang);
      if (!success) {
        this.progressContainer.style.display = 'none';
        this.convertBtn.disabled = false;
        return;
      }
    }

    const total = this.files.length;

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.renderFileList();
      this.updateStats();

      this.updateProgress(((i + 0.5) / total) * 100, `處理中 ${i + 1}/${total}：${item.file.name}`);

      try {
        const result = await this.worker.recognize(item.file);
        item.text = result.data.text.trim();
        item.status = 'done';

        this.results.push({
          filename: item.file.name,
          text: item.text
        });
      } catch (error) {
        console.error('OCR error:', item.file.name, error);
        item.status = 'error';
        item.text = '';
      }

      this.renderFileList();
      this.updateStats();
    }

    this.updateProgress(100, '全部完成！');
    this.progressContainer.style.display = 'none';

    // Show results
    this.renderResults();
    this.resultPanel.style.display = 'block';
    this.downloadBtn.style.display = 'inline-flex';
    this.resetBtn.style.display = 'inline-flex';

    const successCount = this.files.filter(f => f.status === 'done').length;
    this.showStatus('success', `批量辨識完成！成功 ${successCount}/${total} 張`);
  }

  renderResults() {
    this.resultPreview.innerHTML = '';

    for (const result of this.results) {
      if (result.text) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <div class="filename">${result.filename}</div>
          <div class="text">${this.escapeHtml(result.text.substring(0, 500))}${result.text.length > 500 ? '...' : ''}</div>
        `;
        this.resultPreview.appendChild(div);
      }
    }

    if (this.resultPreview.children.length === 0) {
      this.resultPreview.innerHTML = '<p style="color: #888; text-align: center;">未辨識出任何文字</p>';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async download() {
    if (this.results.length === 0) return;

    this.showStatus('info', '正在準備下載...');

    if (this.outputFormat === 'txt') {
      // Single TXT file
      let content = '';
      for (const result of this.results) {
        content += `=== ${result.filename} ===\n\n`;
        content += result.text + '\n\n';
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      this.downloadBlob(blob, 'batch_ocr_result.txt');

    } else if (this.outputFormat === 'json') {
      // JSON file
      const json = JSON.stringify(this.results, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      this.downloadBlob(blob, 'batch_ocr_result.json');

    } else if (this.outputFormat === 'separate') {
      // Separate TXT files in ZIP
      const zip = new JSZip();

      for (const result of this.results) {
        const filename = result.filename.replace(/\.[^/.]+$/, '') + '_ocr.txt';
        zip.file(filename, result.text);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      this.downloadBlob(content, 'batch_ocr_results.zip');
    }

    this.showStatus('success', '檔案已下載');
  }

  downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  async reset() {
    this.files = [];
    this.results = [];

    this.fileInput.value = '';
    this.moreFileInput.value = '';
    this.fileList.innerHTML = '';
    this.resultPreview.innerHTML = '';

    this.settingsPanel.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.batchStats.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

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
  new BatchOCRTool();
});
