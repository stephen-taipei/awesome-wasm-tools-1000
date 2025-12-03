/**
 * IMG-049 背景模糊
 * 保留主體清晰，模糊背景（景深效果）
 */

class BackgroundBlurTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;
    this.blurMode = 'center';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.blurSlider = document.getElementById('blurSlider');
    this.blurValue = document.getElementById('blurValue');
    this.focusSlider = document.getElementById('focusSlider');
    this.focusValue = document.getElementById('focusValue');
    this.transitionSlider = document.getElementById('transitionSlider');
    this.transitionValue = document.getElementById('transitionValue');

    this.originalPreview = document.getElementById('originalPreview');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.originalInfo = document.getElementById('originalInfo');
    this.resultInfo = document.getElementById('resultInfo');

    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

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
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Slider events
    this.blurSlider.addEventListener('input', () => {
      this.blurValue.textContent = `${this.blurSlider.value}px`;
    });
    this.focusSlider.addEventListener('input', () => {
      this.focusValue.textContent = `${this.focusSlider.value}%`;
    });
    this.transitionSlider.addEventListener('input', () => {
      this.transitionValue.textContent = `${this.transitionSlider.value}%`;
    });

    // Mode options
    document.querySelectorAll('.mode-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.blurMode = el.dataset.mode;
      });
    });

    // Action buttons
    this.applyBtn.addEventListener('click', () => this.applyBlur());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalPreview.src = e.target.result;
        this.originalInfo.textContent = `${img.width} × ${img.height} | ${this.formatSize(file.size)}`;

        this.resultCanvas.width = img.width;
        this.resultCanvas.height = img.height;

        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.applyBtn.disabled = false;

        this.resultInfo.textContent = '';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async applyBlur() {
    this.progressContainer.style.display = 'block';
    this.applyBtn.disabled = true;
    this.updateProgress(10, '準備處理...');

    try {
      const blur = parseInt(this.blurSlider.value);
      const focus = parseInt(this.focusSlider.value) / 100;
      const transition = parseInt(this.transitionSlider.value) / 100;

      const img = this.originalImage;
      const width = img.width;
      const height = img.height;

      this.updateProgress(20, '生成模糊圖層...');

      // Create blurred version
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = width;
      blurCanvas.height = height;
      const blurCtx = blurCanvas.getContext('2d');

      blurCtx.filter = `blur(${blur}px)`;
      blurCtx.drawImage(img, 0, 0);
      blurCtx.filter = 'none';

      this.updateProgress(50, '建立遮罩...');

      // Create focus mask
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');

      this.createFocusMask(maskCtx, width, height, focus, transition);

      this.updateProgress(70, '合成圖層...');

      // Composite: draw blurred, then sharp with mask
      this.resultCtx.drawImage(blurCanvas, 0, 0);

      // Apply mask to original
      const sharpCanvas = document.createElement('canvas');
      sharpCanvas.width = width;
      sharpCanvas.height = height;
      const sharpCtx = sharpCanvas.getContext('2d');

      sharpCtx.drawImage(img, 0, 0);
      sharpCtx.globalCompositeOperation = 'destination-in';
      sharpCtx.drawImage(maskCanvas, 0, 0);

      // Draw masked sharp image on top
      this.resultCtx.drawImage(sharpCanvas, 0, 0);

      this.updateProgress(90, '生成輸出...');

      // Convert to blob
      this.resultBlob = await new Promise((resolve) => {
        this.resultCanvas.toBlob(resolve, 'image/png');
      });

      this.resultInfo.textContent = `${width} × ${height} | ${this.formatSize(this.resultBlob.size)}`;

      this.updateProgress(100, '完成！');
      this.progressContainer.style.display = 'none';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', '背景模糊效果已套用！');

    } catch (error) {
      console.error('Blur error:', error);
      this.showStatus('error', `處理失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.applyBtn.disabled = false;
  }

  createFocusMask(ctx, width, height, focus, transition) {
    const centerX = width / 2;
    const centerY = height / 2;

    if (this.blurMode === 'center') {
      // Elliptical gradient from center
      const radiusX = width * focus * 0.6;
      const radiusY = height * focus * 0.6;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, Math.max(radiusX, radiusY)
      );

      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1 - transition, 'white');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

    } else if (this.blurMode === 'radial') {
      // Radial vignette
      const radius = Math.max(width, height) * focus * 0.5;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * (1 - transition),
        centerX, centerY, radius
      );

      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

    } else if (this.blurMode === 'tilt') {
      // Tilt-shift effect (horizontal band)
      const bandHeight = height * focus;
      const bandTop = (height - bandHeight) / 2;
      const transitionSize = bandHeight * transition;

      const gradient = ctx.createLinearGradient(0, 0, 0, height);

      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(bandTop / height, 'transparent');
      gradient.addColorStop((bandTop + transitionSize) / height, 'white');
      gradient.addColorStop((bandTop + bandHeight - transitionSize) / height, 'white');
      gradient.addColorStop((bandTop + bandHeight) / height, 'transparent');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
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

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_blur.png`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;
    this.blurMode = 'center';

    this.fileInput.value = '';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.applyBtn.disabled = true;
    this.progressContainer.style.display = 'none';

    this.originalPreview.src = '';
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.originalInfo.textContent = '';
    this.resultInfo.textContent = '';

    this.blurSlider.value = 10;
    this.blurValue.textContent = '10px';
    this.focusSlider.value = 50;
    this.focusValue.textContent = '50%';
    this.transitionSlider.value = 30;
    this.transitionValue.textContent = '30%';

    document.querySelectorAll('.mode-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.mode === 'center');
    });

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
  new BackgroundBlurTool();
});
