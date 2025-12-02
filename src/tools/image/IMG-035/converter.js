/**
 * IMG-035 批量浮水印
 * 批量為多張圖片添加相同浮水印
 */

class BatchWatermarkTool {
  constructor() {
    this.watermarkFile = null;
    this.watermarkImage = null;
    this.files = [];
    this.processedBlobs = [];

    this.scale = 20;
    this.opacity = 60;
    this.position = 'bottom-right';

    this.init();
  }

  init() {
    this.watermarkUploadArea = document.getElementById('watermarkUploadArea');
    this.watermarkFileInput = document.getElementById('watermarkFileInput');
    this.watermarkPreview = document.getElementById('watermarkPreview');

    this.batchUploadArea = document.getElementById('batchUploadArea');
    this.batchFileInput = document.getElementById('batchFileInput');
    this.fileList = document.getElementById('fileList');

    this.settingsPanel = document.getElementById('settingsPanel');
    this.batchPanel = document.getElementById('batchPanel');
    this.batchStats = document.getElementById('batchStats');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.scaleSlider = document.getElementById('scaleSlider');
    this.scaleValue = document.getElementById('scaleValue');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');

    this.totalCount = document.getElementById('totalCount');
    this.processedCount = document.getElementById('processedCount');
    this.pendingCount = document.getElementById('pendingCount');

    this.bindEvents();
  }

  bindEvents() {
    // Watermark upload
    this.watermarkUploadArea.addEventListener('click', () => this.watermarkFileInput.click());
    this.watermarkUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.watermarkUploadArea.style.borderColor = '#00d9ff';
    });
    this.watermarkUploadArea.addEventListener('dragleave', () => {
      this.watermarkUploadArea.style.borderColor = this.watermarkImage ? '#00d9ff' : '#3d3d5c';
    });
    this.watermarkUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) this.processWatermarkFile(file);
    });
    this.watermarkFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processWatermarkFile(file);
    });

    // Batch upload
    this.batchUploadArea.addEventListener('click', () => this.batchFileInput.click());
    this.batchUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.batchUploadArea.classList.add('drag-over');
    });
    this.batchUploadArea.addEventListener('dragleave', () => {
      this.batchUploadArea.classList.remove('drag-over');
    });
    this.batchUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.batchUploadArea.classList.remove('drag-over');
      this.addFiles(e.dataTransfer.files);
    });
    this.batchFileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Sliders
    this.scaleSlider.addEventListener('input', () => {
      this.scale = parseInt(this.scaleSlider.value);
      this.scaleValue.textContent = `${this.scale}%`;
    });

    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = `${this.opacity}%`;
    });

    // Position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.position = btn.dataset.pos;
      });
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.processAll());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processWatermarkFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.watermarkFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.watermarkImage = img;
        this.watermarkPreview.src = e.target.result;
        this.watermarkPreview.style.display = 'block';
        this.watermarkUploadArea.classList.add('has-image');

        this.settingsPanel.style.display = 'block';
        this.batchPanel.style.display = 'block';
        this.showStatus('success', '浮水印圖片已載入，請設定並上傳要處理的圖片');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
            preview: null
          });
        }
      }
    }

    this.renderFileList();
    this.updateStats();
    this.checkReady();
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
        this.checkReady();
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

  checkReady() {
    this.convertBtn.disabled = !(this.watermarkImage && this.files.length > 0);
  }

  async processAll() {
    if (!this.watermarkImage || this.files.length === 0) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.processedBlobs = [];

    const total = this.files.length;

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.renderFileList();
      this.updateStats();

      this.updateProgress(((i + 0.5) / total) * 100, `處理中 ${i + 1}/${total}：${item.file.name}`);

      try {
        const blob = await this.processImage(item.file);
        this.processedBlobs.push({
          name: item.file.name.replace(/\.[^/.]+$/, '') + '_watermarked.png',
          blob: blob
        });
        item.status = 'done';
      } catch (error) {
        console.error('Error processing:', item.file.name, error);
        item.status = 'error';
      }

      this.renderFileList();
      this.updateStats();
    }

    this.updateProgress(100, '全部完成！');
    this.progressContainer.style.display = 'none';

    this.downloadBtn.style.display = 'inline-flex';
    this.resetBtn.style.display = 'inline-flex';
    this.showStatus('success', `已完成 ${this.processedBlobs.length} 張圖片的浮水印處理`);
  }

  processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // Draw main image
            ctx.drawImage(img, 0, 0);

            // Draw watermark
            this.drawWatermark(ctx, canvas.width, canvas.height);

            canvas.toBlob(resolve, 'image/png');
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  drawWatermark(ctx, canvasWidth, canvasHeight) {
    const wmWidth = this.watermarkImage.naturalWidth * (this.scale / 100);
    const wmHeight = this.watermarkImage.naturalHeight * (this.scale / 100);

    let x, y;
    const padding = 20;

    switch (this.position) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-center':
        x = (canvasWidth - wmWidth) / 2;
        y = padding;
        break;
      case 'top-right':
        x = canvasWidth - wmWidth - padding;
        y = padding;
        break;
      case 'center-left':
        x = padding;
        y = (canvasHeight - wmHeight) / 2;
        break;
      case 'center':
        x = (canvasWidth - wmWidth) / 2;
        y = (canvasHeight - wmHeight) / 2;
        break;
      case 'center-right':
        x = canvasWidth - wmWidth - padding;
        y = (canvasHeight - wmHeight) / 2;
        break;
      case 'bottom-left':
        x = padding;
        y = canvasHeight - wmHeight - padding;
        break;
      case 'bottom-center':
        x = (canvasWidth - wmWidth) / 2;
        y = canvasHeight - wmHeight - padding;
        break;
      case 'bottom-right':
        x = canvasWidth - wmWidth - padding;
        y = canvasHeight - wmHeight - padding;
        break;
      default:
        x = canvasWidth - wmWidth - padding;
        y = canvasHeight - wmHeight - padding;
    }

    ctx.save();
    ctx.globalAlpha = this.opacity / 100;
    ctx.drawImage(this.watermarkImage, x, y, wmWidth, wmHeight);
    ctx.restore();
  }

  async downloadZip() {
    if (this.processedBlobs.length === 0) return;

    this.showStatus('info', '正在打包 ZIP...');

    const zip = new JSZip();

    for (const item of this.processedBlobs) {
      zip.file(item.name, item.blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'watermarked_images.zip';
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'ZIP 檔案已下載');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  reset() {
    this.watermarkFile = null;
    this.watermarkImage = null;
    this.files = [];
    this.processedBlobs = [];

    this.watermarkPreview.style.display = 'none';
    this.watermarkUploadArea.classList.remove('has-image');
    this.watermarkFileInput.value = '';
    this.batchFileInput.value = '';

    this.scale = 20;
    this.scaleSlider.value = 20;
    this.scaleValue.textContent = '20%';
    this.opacity = 60;
    this.opacitySlider.value = 60;
    this.opacityValue.textContent = '60%';
    this.position = 'bottom-right';
    document.querySelectorAll('.position-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === 'bottom-right');
    });

    this.fileList.innerHTML = '';
    this.settingsPanel.style.display = 'none';
    this.batchPanel.style.display = 'none';
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
  new BatchWatermarkTool();
});
