/**
 * IMG-048 更換背景
 * 將去背後的圖片放置到新背景上
 */

class BackgroundReplaceTool {
  constructor() {
    this.foregroundFile = null;
    this.foregroundImage = null;
    this.backgroundFile = null;
    this.backgroundImage = null;
    this.resultBlob = null;
    this.fitMode = 'contain';

    this.init();
  }

  init() {
    this.foregroundUpload = document.getElementById('foregroundUpload');
    this.foregroundInput = document.getElementById('foregroundInput');
    this.foregroundPreview = document.getElementById('foregroundPreview');
    this.foregroundImg = document.getElementById('foregroundImage');
    this.foregroundInfo = document.getElementById('foregroundInfo');

    this.backgroundUpload = document.getElementById('backgroundUpload');
    this.backgroundInput = document.getElementById('backgroundInput');
    this.backgroundPreview = document.getElementById('backgroundPreview');
    this.backgroundImg = document.getElementById('backgroundImage');
    this.backgroundInfo = document.getElementById('backgroundInfo');

    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.scaleSlider = document.getElementById('scaleSlider');
    this.scaleValue = document.getElementById('scaleValue');
    this.posXSlider = document.getElementById('posXSlider');
    this.posXValue = document.getElementById('posXValue');
    this.posYSlider = document.getElementById('posYSlider');
    this.posYValue = document.getElementById('posYValue');

    this.compositeCanvas = document.getElementById('compositeCanvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d');
    this.compositeInfo = document.getElementById('compositeInfo');

    this.compositeBtn = document.getElementById('compositeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Foreground upload
    this.foregroundUpload.addEventListener('click', () => this.foregroundInput.click());
    this.foregroundUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.foregroundUpload.classList.add('drag-over');
    });
    this.foregroundUpload.addEventListener('dragleave', () => {
      this.foregroundUpload.classList.remove('drag-over');
    });
    this.foregroundUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.foregroundUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadForeground(file);
    });
    this.foregroundInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadForeground(file);
    });

    // Background upload
    this.backgroundUpload.addEventListener('click', () => this.backgroundInput.click());
    this.backgroundUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.backgroundUpload.classList.add('drag-over');
    });
    this.backgroundUpload.addEventListener('dragleave', () => {
      this.backgroundUpload.classList.remove('drag-over');
    });
    this.backgroundUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.backgroundUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadBackground(file);
    });
    this.backgroundInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadBackground(file);
    });

    // Slider events
    this.scaleSlider.addEventListener('input', () => {
      this.scaleValue.textContent = `${this.scaleSlider.value}%`;
      this.updatePreview();
    });
    this.posXSlider.addEventListener('input', () => {
      this.posXValue.textContent = `${this.posXSlider.value}%`;
      this.updatePreview();
    });
    this.posYSlider.addEventListener('input', () => {
      this.posYValue.textContent = `${this.posYSlider.value}%`;
      this.updatePreview();
    });

    // Fit options
    document.querySelectorAll('.fit-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.fit-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.fitMode = el.dataset.fit;
        this.updatePreview();
      });
    });

    // Action buttons
    this.compositeBtn.addEventListener('click', () => this.composite());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadForeground(file) {
    if (!file.type.match(/^image\/(png|webp)$/)) {
      this.showStatus('error', '前景圖片必須是 PNG 或 WebP 格式（透明背景）');
      return;
    }

    this.foregroundFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.foregroundImage = img;
        this.foregroundImg.src = e.target.result;
        this.foregroundPreview.style.display = 'block';
        this.foregroundUpload.classList.add('loaded');
        this.foregroundInfo.textContent = `${img.width} × ${img.height}`;

        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadBackground(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    this.backgroundFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        this.backgroundImg.src = e.target.result;
        this.backgroundPreview.style.display = 'block';
        this.backgroundUpload.classList.add('loaded');
        this.backgroundInfo.textContent = `${img.width} × ${img.height}`;

        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    if (this.foregroundImage && this.backgroundImage) {
      this.optionsPanel.style.display = 'block';
      this.previewSection.style.display = 'block';
      this.compositeBtn.disabled = false;
      this.updatePreview();
    }
  }

  updatePreview() {
    if (!this.foregroundImage || !this.backgroundImage) return;

    const bg = this.backgroundImage;
    const fg = this.foregroundImage;

    // Set canvas size to background size
    this.compositeCanvas.width = bg.width;
    this.compositeCanvas.height = bg.height;

    // Draw background
    this.drawBackground();

    // Calculate foreground position and size
    const scale = parseInt(this.scaleSlider.value) / 100;
    const posX = parseInt(this.posXSlider.value) / 100;
    const posY = parseInt(this.posYSlider.value) / 100;

    let fgWidth, fgHeight;

    if (this.fitMode === 'contain') {
      // Fit foreground within background
      const ratio = Math.min(bg.width / fg.width, bg.height / fg.height);
      fgWidth = fg.width * ratio * scale;
      fgHeight = fg.height * ratio * scale;
    } else if (this.fitMode === 'cover') {
      // Cover the background
      const ratio = Math.max(bg.width / fg.width, bg.height / fg.height);
      fgWidth = fg.width * ratio * scale;
      fgHeight = fg.height * ratio * scale;
    } else {
      // Stretch
      fgWidth = bg.width * scale;
      fgHeight = bg.height * scale;
    }

    // Calculate position
    const x = (bg.width - fgWidth) * posX;
    const y = (bg.height - fgHeight) * posY;

    // Draw foreground
    this.compositeCtx.drawImage(fg, x, y, fgWidth, fgHeight);

    this.compositeInfo.textContent = `${bg.width} × ${bg.height}`;
  }

  drawBackground() {
    const bg = this.backgroundImage;
    this.compositeCtx.drawImage(bg, 0, 0, bg.width, bg.height);
  }

  async composite() {
    this.progressContainer.style.display = 'block';
    this.compositeBtn.disabled = true;
    this.updateProgress(30, '合成圖片...');

    try {
      // Already drawn in preview, just export
      this.updateProgress(60, '生成輸出...');

      const format = document.querySelector('input[name="format"]:checked').value;
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = format === 'png' ? 1 : 0.92;

      this.resultBlob = await new Promise((resolve) => {
        this.compositeCanvas.toBlob(resolve, mimeType, quality);
      });

      this.updateProgress(100, '完成！');

      this.compositeInfo.textContent = `${this.compositeCanvas.width} × ${this.compositeCanvas.height} | ${this.formatSize(this.resultBlob.size)}`;

      this.progressContainer.style.display = 'none';
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', '圖片合成完成！');

    } catch (error) {
      console.error('Composite error:', error);
      this.showStatus('error', `合成失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.compositeBtn.disabled = false;
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

  download() {
    if (!this.resultBlob) return;

    const format = document.querySelector('input[name="format"]:checked').value;
    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';
    const baseName = this.foregroundFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${baseName}_composite.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.foregroundFile = null;
    this.foregroundImage = null;
    this.backgroundFile = null;
    this.backgroundImage = null;
    this.resultBlob = null;
    this.fitMode = 'contain';

    this.foregroundInput.value = '';
    this.backgroundInput.value = '';

    this.foregroundPreview.style.display = 'none';
    this.backgroundPreview.style.display = 'none';
    this.foregroundUpload.classList.remove('loaded');
    this.backgroundUpload.classList.remove('loaded');

    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.compositeBtn.disabled = true;
    this.progressContainer.style.display = 'none';

    // Reset sliders
    this.scaleSlider.value = 100;
    this.scaleValue.textContent = '100%';
    this.posXSlider.value = 50;
    this.posXValue.textContent = '50%';
    this.posYSlider.value = 50;
    this.posYValue.textContent = '50%';

    // Reset fit mode
    document.querySelectorAll('.fit-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.fit === 'contain');
    });

    // Reset format
    document.getElementById('formatPng').checked = true;

    this.compositeCtx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
    this.compositeInfo.textContent = '';

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
  new BackgroundReplaceTool();
});
