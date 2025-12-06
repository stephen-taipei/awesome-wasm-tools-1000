/**
 * IMG-162 圖片陰影工具
 * Image Shadow Tool
 */

class ImageShadow {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;

    this.settings = {
      shadowColor: '#000000',
      blur: 20,
      spread: 0,
      offsetX: 10,
      offsetY: 10,
      opacity: 50,
      padding: 40,
      bgColor: '#ffffff'
    };

    this.presets = {
      soft: { shadowColor: '#000000', blur: 20, spread: 0, offsetX: 5, offsetY: 5, opacity: 30, padding: 40 },
      hard: { shadowColor: '#000000', blur: 0, spread: 0, offsetX: 8, offsetY: 8, opacity: 80, padding: 40 },
      float: { shadowColor: '#000000', blur: 40, spread: 0, offsetX: 0, offsetY: 25, opacity: 40, padding: 60 },
      deep: { shadowColor: '#000000', blur: 50, spread: 10, offsetX: 0, offsetY: 30, opacity: 60, padding: 80 },
      glow: { shadowColor: '#ffffff', blur: 30, spread: 10, offsetX: 0, offsetY: 0, opacity: 80, padding: 50 },
      neon: { shadowColor: '#a855f7', blur: 25, spread: 5, offsetX: 0, offsetY: 0, opacity: 90, padding: 50 },
      multi: { shadowColor: '#000000', blur: 15, spread: 0, offsetX: 5, offsetY: 5, opacity: 40, padding: 50 },
      retro: { shadowColor: '#ff6b6b', blur: 0, spread: 0, offsetX: 10, offsetY: 10, opacity: 100, padding: 40 }
    };

    this.currentPreset = 'soft';

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Editor
    this.editorSection = document.getElementById('editorSection');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.ctx = this.previewCanvas.getContext('2d');

    // Presets
    this.presetBtns = document.querySelectorAll('.preset-btn');

    // Settings
    this.shadowColorPicker = document.getElementById('shadowColor');
    this.shadowColorValue = document.getElementById('shadowColorValue');
    this.blurSlider = document.getElementById('blur');
    this.blurValue = document.getElementById('blurValue');
    this.spreadSlider = document.getElementById('spread');
    this.spreadValue = document.getElementById('spreadValue');
    this.offsetXSlider = document.getElementById('offsetX');
    this.offsetYSlider = document.getElementById('offsetY');
    this.offsetValue = document.getElementById('offsetValue');
    this.opacitySlider = document.getElementById('opacity');
    this.opacityValue = document.getElementById('opacityValue');
    this.paddingSlider = document.getElementById('padding');
    this.paddingValue = document.getElementById('paddingValue');
    this.bgColorPicker = document.getElementById('bgColor');
    this.bgColorValue = document.getElementById('bgColorValue');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Presets
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });

    // Settings
    this.shadowColorPicker.addEventListener('input', (e) => {
      this.settings.shadowColor = e.target.value;
      this.shadowColorValue.value = e.target.value;
      this.updatePreview();
    });

    this.shadowColorValue.addEventListener('change', (e) => {
      this.settings.shadowColor = e.target.value;
      this.shadowColorPicker.value = e.target.value;
      this.updatePreview();
    });

    this.blurSlider.addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      this.blurValue.textContent = `${this.settings.blur}px`;
      this.updatePreview();
    });

    this.spreadSlider.addEventListener('input', (e) => {
      this.settings.spread = parseInt(e.target.value);
      this.spreadValue.textContent = `${this.settings.spread}px`;
      this.updatePreview();
    });

    this.offsetXSlider.addEventListener('input', (e) => {
      this.settings.offsetX = parseInt(e.target.value);
      this.updateOffsetDisplay();
      this.updatePreview();
    });

    this.offsetYSlider.addEventListener('input', (e) => {
      this.settings.offsetY = parseInt(e.target.value);
      this.updateOffsetDisplay();
      this.updatePreview();
    });

    this.opacitySlider.addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      this.opacityValue.textContent = `${this.settings.opacity}%`;
      this.updatePreview();
    });

    this.paddingSlider.addEventListener('input', (e) => {
      this.settings.padding = parseInt(e.target.value);
      this.paddingValue.textContent = `${this.settings.padding}px`;
      this.updatePreview();
    });

    this.bgColorPicker.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorValue.value = e.target.value;
      this.updatePreview();
    });

    this.bgColorValue.addEventListener('change', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorPicker.value = e.target.value;
      this.updatePreview();
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyShadow());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.editorSection.classList.add('active');
        this.buttonGroup.style.display = 'flex';

        this.updatePreview();
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.currentPreset = presetName;

    this.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetName);
    });

    // Apply preset values (keep padding and bgColor)
    this.settings.shadowColor = preset.shadowColor;
    this.settings.blur = preset.blur;
    this.settings.spread = preset.spread;
    this.settings.offsetX = preset.offsetX;
    this.settings.offsetY = preset.offsetY;
    this.settings.opacity = preset.opacity;
    this.settings.padding = preset.padding;

    this.updateSliders();
    this.updatePreview();
  }

  updateSliders() {
    this.shadowColorPicker.value = this.settings.shadowColor;
    this.shadowColorValue.value = this.settings.shadowColor;
    this.blurSlider.value = this.settings.blur;
    this.blurValue.textContent = `${this.settings.blur}px`;
    this.spreadSlider.value = this.settings.spread;
    this.spreadValue.textContent = `${this.settings.spread}px`;
    this.offsetXSlider.value = this.settings.offsetX;
    this.offsetYSlider.value = this.settings.offsetY;
    this.updateOffsetDisplay();
    this.opacitySlider.value = this.settings.opacity;
    this.opacityValue.textContent = `${this.settings.opacity}%`;
    this.paddingSlider.value = this.settings.padding;
    this.paddingValue.textContent = `${this.settings.padding}px`;
  }

  updateOffsetDisplay() {
    this.offsetValue.textContent = `X: ${this.settings.offsetX}, Y: ${this.settings.offsetY}`;
  }

  updatePreview() {
    if (!this.originalImage) return;

    const scale = Math.min(1, 500 / Math.max(this.originalImage.width, this.originalImage.height));
    const imgWidth = this.originalImage.width * scale;
    const imgHeight = this.originalImage.height * scale;

    this.drawShadow(this.ctx, this.previewCanvas, imgWidth, imgHeight, scale);
  }

  drawShadow(ctx, canvas, imgWidth, imgHeight, scale = 1) {
    const padding = this.settings.padding * scale;
    const blur = this.settings.blur * scale;
    const spread = this.settings.spread * scale;
    const offsetX = this.settings.offsetX * scale;
    const offsetY = this.settings.offsetY * scale;

    // Calculate canvas size to fit shadow
    const extraSpace = Math.max(blur * 2, Math.abs(offsetX), Math.abs(offsetY)) + Math.abs(spread);
    const canvasWidth = imgWidth + padding * 2 + extraSpace * 2;
    const canvasHeight = imgHeight + padding * 2 + extraSpace * 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear and fill background
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate image position
    const imgX = (canvasWidth - imgWidth) / 2;
    const imgY = (canvasHeight - imgHeight) / 2;

    // Draw shadow based on preset type
    if (this.currentPreset === 'multi') {
      this.drawMultiShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale);
    } else if (this.currentPreset === 'neon') {
      this.drawNeonShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale);
    } else {
      this.drawBasicShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale);
    }

    // Draw image
    ctx.drawImage(this.originalImage, imgX, imgY, imgWidth, imgHeight);
  }

  drawBasicShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale) {
    const blur = this.settings.blur * scale;
    const spread = this.settings.spread * scale;
    const offsetX = this.settings.offsetX * scale;
    const offsetY = this.settings.offsetY * scale;
    const opacity = this.settings.opacity / 100;

    // Parse shadow color and apply opacity
    const shadowColor = this.hexToRgba(this.settings.shadowColor, opacity);

    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;

    // Draw a rectangle for shadow (with spread adjustment)
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(
      imgX - spread,
      imgY - spread,
      imgWidth + spread * 2,
      imgHeight + spread * 2
    );

    ctx.restore();

    // Clear the center for image
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
  }

  drawMultiShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale) {
    const layers = [
      { blur: 5, offset: 2, opacity: 0.1 },
      { blur: 15, offset: 5, opacity: 0.15 },
      { blur: 30, offset: 10, opacity: 0.2 },
      { blur: 50, offset: 20, opacity: 0.15 }
    ];

    layers.forEach(layer => {
      const blur = layer.blur * scale;
      const offset = layer.offset * scale;
      const shadowColor = this.hexToRgba(this.settings.shadowColor, layer.opacity);

      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = offset;
      ctx.shadowOffsetY = offset;

      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(imgX, imgY, imgWidth, imgHeight);

      ctx.restore();
    });

    // Clear the center for image
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
  }

  drawNeonShadow(ctx, imgX, imgY, imgWidth, imgHeight, scale) {
    const layers = [
      { blur: 5, spread: 0, opacity: 1 },
      { blur: 15, spread: 2, opacity: 0.8 },
      { blur: 30, spread: 5, opacity: 0.6 },
      { blur: 50, spread: 10, opacity: 0.3 }
    ];

    layers.forEach(layer => {
      const blur = layer.blur * scale;
      const spread = layer.spread * scale;
      const shadowColor = this.hexToRgba(this.settings.shadowColor, layer.opacity);

      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(
        imgX - spread,
        imgY - spread,
        imgWidth + spread * 2,
        imgHeight + spread * 2
      );

      ctx.restore();
    });

    // Clear the center for image
    ctx.fillStyle = this.settings.bgColor;
    ctx.fillRect(imgX, imgY, imgWidth, imgHeight);
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  applyShadow() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    const fullCtx = fullCanvas.getContext('2d');

    this.drawShadow(fullCtx, fullCanvas, this.originalImage.width, this.originalImage.height, 1);

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('陰影套用成功！', 'success');
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用陰影', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `shadow_${Date.now()}.png`;
    link.href = this.resultDataUrl;
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.resultDataUrl = null;

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.editorSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset settings
    this.settings = {
      shadowColor: '#000000',
      blur: 20,
      spread: 0,
      offsetX: 10,
      offsetY: 10,
      opacity: 50,
      padding: 40,
      bgColor: '#ffffff'
    };

    this.currentPreset = 'soft';
    this.updateSliders();
    this.bgColorPicker.value = '#ffffff';
    this.bgColorValue.value = '#ffffff';

    // Reset preset buttons
    this.applyPreset('soft');

    // Clear canvas
    this.ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageShadow();
});
