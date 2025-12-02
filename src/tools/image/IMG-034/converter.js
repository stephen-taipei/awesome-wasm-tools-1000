/**
 * IMG-034 圖片浮水印
 * 在圖片上疊加 Logo 或其他圖片作為浮水印
 */

class ImageWatermarkTool {
  constructor() {
    this.mainFile = null;
    this.watermarkFile = null;
    this.mainImage = null;
    this.watermarkImage = null;
    this.convertedBlob = null;

    this.scale = 30;
    this.opacity = 70;
    this.rotation = 0;
    this.position = 'center';
    this.offsetX = 0;
    this.offsetY = 0;
    this.blendMode = 'source-over';

    this.init();
  }

  init() {
    this.mainUploadArea = document.getElementById('mainUploadArea');
    this.watermarkUploadArea = document.getElementById('watermarkUploadArea');
    this.mainFileInput = document.getElementById('mainFileInput');
    this.watermarkFileInput = document.getElementById('watermarkFileInput');
    this.mainPreview = document.getElementById('mainPreview');
    this.watermarkPreview = document.getElementById('watermarkPreview');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    this.scaleSlider = document.getElementById('scaleSlider');
    this.scaleValue = document.getElementById('scaleValue');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');
    this.rotationSlider = document.getElementById('rotationSlider');
    this.rotationValue = document.getElementById('rotationValue');
    this.offsetXSlider = document.getElementById('offsetXSlider');
    this.offsetXValue = document.getElementById('offsetXValue');
    this.offsetYSlider = document.getElementById('offsetYSlider');
    this.offsetYValue = document.getElementById('offsetYValue');

    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
  }

  bindEvents() {
    // Main image upload
    this.mainUploadArea.addEventListener('click', () => this.mainFileInput.click());
    this.mainUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.mainUploadArea.style.borderColor = '#00d9ff';
    });
    this.mainUploadArea.addEventListener('dragleave', () => {
      this.mainUploadArea.style.borderColor = this.mainImage ? '#00d9ff' : '#3d3d5c';
    });
    this.mainUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) this.processMainFile(file);
    });
    this.mainFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processMainFile(file);
    });

    // Watermark image upload
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

    // Sliders
    this.scaleSlider.addEventListener('input', () => {
      this.scale = parseInt(this.scaleSlider.value);
      this.scaleValue.textContent = `${this.scale}%`;
      this.updatePreview();
    });

    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = `${this.opacity}%`;
      this.updatePreview();
    });

    this.rotationSlider.addEventListener('input', () => {
      this.rotation = parseInt(this.rotationSlider.value);
      this.rotationValue.textContent = `${this.rotation}°`;
      this.updatePreview();
    });

    this.offsetXSlider.addEventListener('input', () => {
      this.offsetX = parseInt(this.offsetXSlider.value);
      this.offsetXValue.textContent = `${this.offsetX}px`;
      this.updatePreview();
    });

    this.offsetYSlider.addEventListener('input', () => {
      this.offsetY = parseInt(this.offsetYSlider.value);
      this.offsetYValue.textContent = `${this.offsetY}px`;
      this.updatePreview();
    });

    // Position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.position = btn.dataset.pos;
        this.updatePreview();
      });
    });

    // Blend mode buttons
    document.querySelectorAll('.blend-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.blend-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.blendMode = btn.dataset.blend;
        this.updatePreview();
      });
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyWatermark());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processMainFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.mainFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.mainImage = img;
        this.mainPreview.src = e.target.result;
        this.mainPreview.style.display = 'block';
        this.mainUploadArea.classList.add('has-image');
        this.originalImageEl.src = e.target.result;

        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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

        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    if (this.mainImage && this.watermarkImage) {
      this.settingsPanel.style.display = 'block';
      this.comparePanel.style.display = 'block';
      this.convertBtn.disabled = false;
      this.updatePreview();
      this.showStatus('success', '圖片載入成功，請調整浮水印設定');
    }
  }

  updatePreview() {
    if (!this.mainImage || !this.watermarkImage) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(this.mainImage.naturalWidth, 600);
    const height = Math.round(width * (this.mainImage.naturalHeight / this.mainImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.mainImage, 0, 0, width, height);

    const scale = width / this.mainImage.naturalWidth;
    this.drawWatermark(ctx, width, height, scale);

    this.previewImage.src = canvas.toDataURL();
  }

  drawWatermark(ctx, canvasWidth, canvasHeight, baseScale = 1) {
    const wmWidth = this.watermarkImage.naturalWidth * (this.scale / 100) * baseScale;
    const wmHeight = this.watermarkImage.naturalHeight * (this.scale / 100) * baseScale;

    // Calculate position
    let x, y;
    const padding = 20 * baseScale;

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
        x = (canvasWidth - wmWidth) / 2;
        y = (canvasHeight - wmHeight) / 2;
    }

    // Apply offset
    x += this.offsetX * baseScale;
    y += this.offsetY * baseScale;

    ctx.save();

    // Set opacity and blend mode
    ctx.globalAlpha = this.opacity / 100;
    ctx.globalCompositeOperation = this.blendMode;

    // Apply rotation
    const centerX = x + wmWidth / 2;
    const centerY = y + wmHeight / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-centerX, -centerY);

    // Draw watermark
    ctx.drawImage(this.watermarkImage, x, y, wmWidth, wmHeight);

    ctx.restore();
  }

  async applyWatermark() {
    if (!this.mainImage || !this.watermarkImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用圖片浮水印...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.mainImage.naturalWidth;
      canvas.height = this.mainImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製主圖...');
      ctx.drawImage(this.mainImage, 0, 0);

      this.updateProgress(70, '添加浮水印...');
      this.drawWatermark(ctx, canvas.width, canvas.height, 1);

      this.updateProgress(90, '輸出圖片...');

      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        mimeType = this.mainFile.type;
        ext = this.mainFile.name.split('.').pop();
      } else {
        mimeType = format === 'png' ? 'image/png' :
                   format === 'webp' ? 'image/webp' : 'image/jpeg';
        ext = format;
      }

      const quality = mimeType === 'image/png' ? undefined : 0.92;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.convertedBlob = blob;
      this.outputExt = ext;

      this.updateProgress(100, '完成！');

      this.previewImage.src = URL.createObjectURL(blob);
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', '圖片浮水印添加完成！');

    } catch (error) {
      this.showStatus('error', `處理失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.mainFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_watermarked.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.mainFile = null;
    this.watermarkFile = null;
    this.mainImage = null;
    this.watermarkImage = null;
    this.convertedBlob = null;

    // Reset previews
    this.mainPreview.style.display = 'none';
    this.watermarkPreview.style.display = 'none';
    this.mainUploadArea.classList.remove('has-image');
    this.watermarkUploadArea.classList.remove('has-image');
    this.mainFileInput.value = '';
    this.watermarkFileInput.value = '';

    // Reset values
    this.scale = 30;
    this.scaleSlider.value = 30;
    this.scaleValue.textContent = '30%';
    this.opacity = 70;
    this.opacitySlider.value = 70;
    this.opacityValue.textContent = '70%';
    this.rotation = 0;
    this.rotationSlider.value = 0;
    this.rotationValue.textContent = '0°';
    this.position = 'center';
    document.querySelectorAll('.position-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === 'center');
    });
    this.offsetX = 0;
    this.offsetXSlider.value = 0;
    this.offsetXValue.textContent = '0px';
    this.offsetY = 0;
    this.offsetYSlider.value = 0;
    this.offsetYValue.textContent = '0px';
    this.blendMode = 'source-over';
    document.querySelectorAll('.blend-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.blend === 'source-over');
    });

    this.settingsPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
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
  new ImageWatermarkTool();
});
