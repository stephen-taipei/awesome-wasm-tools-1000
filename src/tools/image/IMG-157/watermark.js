/**
 * IMG-157 圖片浮水印工具
 * Image Watermark Tool
 */

class ImageWatermark {
  constructor() {
    this.originalImage = null;
    this.watermarkImage = null;
    this.canvas = null;
    this.ctx = null;

    this.settings = {
      type: 'text',
      text: '© My Watermark',
      fontSize: 32,
      textColor: '#ffffff',
      imageSize: 20,
      position: 'middle-center',
      opacity: 50,
      rotation: 0,
      tileMode: 'single'
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.watermarkInput = document.getElementById('watermarkInput');

    // Editor
    this.editorSection = document.getElementById('editorSection');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.ctx = this.previewCanvas.getContext('2d');

    // Type tabs
    this.typeTabs = document.querySelectorAll('.type-tab');
    this.textSettings = document.getElementById('textSettings');
    this.imageSettings = document.getElementById('imageSettings');

    // Text settings
    this.watermarkTextInput = document.getElementById('watermarkText');
    this.fontSizeInput = document.getElementById('fontSize');
    this.fontSizeValue = document.getElementById('fontSizeValue');
    this.textColorPicker = document.getElementById('textColor');
    this.textColorValue = document.getElementById('textColorValue');

    // Image settings
    this.watermarkUpload = document.getElementById('watermarkUpload');
    this.imageSizeInput = document.getElementById('imageSize');
    this.imageSizeValue = document.getElementById('imageSizeValue');

    // Common settings
    this.positionBtns = document.querySelectorAll('.position-btn');
    this.opacityInput = document.getElementById('opacity');
    this.opacityValue = document.getElementById('opacityValue');
    this.rotationInput = document.getElementById('rotation');
    this.rotationValue = document.getElementById('rotationValue');
    this.tileModeSelect = document.getElementById('tileMode');

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

    // Type tabs
    this.typeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.setType(tab.dataset.type));
    });

    // Text settings
    this.watermarkTextInput.addEventListener('input', (e) => {
      this.settings.text = e.target.value;
      this.updatePreview();
    });

    this.fontSizeInput.addEventListener('input', (e) => {
      this.settings.fontSize = parseInt(e.target.value);
      this.fontSizeValue.textContent = `${this.settings.fontSize}px`;
      this.updatePreview();
    });

    this.textColorPicker.addEventListener('input', (e) => {
      this.settings.textColor = e.target.value;
      this.textColorValue.value = e.target.value;
      this.updatePreview();
    });

    this.textColorValue.addEventListener('change', (e) => {
      this.settings.textColor = e.target.value;
      this.textColorPicker.value = e.target.value;
      this.updatePreview();
    });

    // Image settings
    this.watermarkUpload.addEventListener('click', () => this.watermarkInput.click());
    this.watermarkInput.addEventListener('change', (e) => this.handleWatermarkSelect(e));

    this.imageSizeInput.addEventListener('input', (e) => {
      this.settings.imageSize = parseInt(e.target.value);
      this.imageSizeValue.textContent = `${this.settings.imageSize}%`;
      this.updatePreview();
    });

    // Position buttons
    this.positionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.positionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.position = btn.dataset.pos;
        this.updatePreview();
      });
    });

    // Common settings
    this.opacityInput.addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      this.opacityValue.textContent = `${this.settings.opacity}%`;
      this.updatePreview();
    });

    this.rotationInput.addEventListener('input', (e) => {
      this.settings.rotation = parseInt(e.target.value);
      this.rotationValue.textContent = `${this.settings.rotation}°`;
      this.updatePreview();
    });

    this.tileModeSelect.addEventListener('change', (e) => {
      this.settings.tileMode = e.target.value;
      this.updatePreview();
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyWatermark());
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

  handleWatermarkSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadWatermarkImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // Set canvas size
        const maxWidth = 800;
        const maxHeight = 600;
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);

        this.previewCanvas.width = img.width * scale;
        this.previewCanvas.height = img.height * scale;

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

  loadWatermarkImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.watermarkImage = img;
        this.watermarkUpload.classList.add('has-image');
        this.watermarkUpload.innerHTML = `<img src="${e.target.result}" alt="浮水印">`;
        this.updatePreview();
        this.showStatus('浮水印圖片載入成功！', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setType(type) {
    this.settings.type = type;
    this.typeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    this.textSettings.style.display = type === 'text' ? 'block' : 'none';
    this.imageSettings.style.display = type === 'image' ? 'block' : 'none';
    this.updatePreview();
  }

  updatePreview() {
    if (!this.originalImage) return;

    // Draw original image
    this.ctx.drawImage(this.originalImage, 0, 0, this.previewCanvas.width, this.previewCanvas.height);

    // Apply watermark
    this.drawWatermark(this.ctx, this.previewCanvas.width, this.previewCanvas.height);
  }

  drawWatermark(ctx, canvasWidth, canvasHeight) {
    ctx.save();
    ctx.globalAlpha = this.settings.opacity / 100;

    if (this.settings.tileMode === 'single') {
      this.drawSingleWatermark(ctx, canvasWidth, canvasHeight);
    } else if (this.settings.tileMode === 'tile') {
      this.drawTiledWatermark(ctx, canvasWidth, canvasHeight);
    } else if (this.settings.tileMode === 'diagonal') {
      this.drawDiagonalWatermark(ctx, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }

  getWatermarkDimensions(canvasWidth, canvasHeight) {
    if (this.settings.type === 'text') {
      const fontSize = this.settings.fontSize * (canvasWidth / 800);
      this.ctx.font = `${fontSize}px Arial, sans-serif`;
      const metrics = this.ctx.measureText(this.settings.text);
      return {
        width: metrics.width,
        height: fontSize,
        fontSize: fontSize
      };
    } else if (this.watermarkImage) {
      const sizeRatio = this.settings.imageSize / 100;
      const width = canvasWidth * sizeRatio;
      const height = (this.watermarkImage.height / this.watermarkImage.width) * width;
      return { width, height };
    }
    return { width: 0, height: 0 };
  }

  getPosition(canvasWidth, canvasHeight, wmWidth, wmHeight) {
    const padding = 20;
    const positions = {
      'top-left': { x: padding, y: padding },
      'top-center': { x: (canvasWidth - wmWidth) / 2, y: padding },
      'top-right': { x: canvasWidth - wmWidth - padding, y: padding },
      'middle-left': { x: padding, y: (canvasHeight - wmHeight) / 2 },
      'middle-center': { x: (canvasWidth - wmWidth) / 2, y: (canvasHeight - wmHeight) / 2 },
      'middle-right': { x: canvasWidth - wmWidth - padding, y: (canvasHeight - wmHeight) / 2 },
      'bottom-left': { x: padding, y: canvasHeight - wmHeight - padding },
      'bottom-center': { x: (canvasWidth - wmWidth) / 2, y: canvasHeight - wmHeight - padding },
      'bottom-right': { x: canvasWidth - wmWidth - padding, y: canvasHeight - wmHeight - padding }
    };
    return positions[this.settings.position] || positions['middle-center'];
  }

  drawSingleWatermark(ctx, canvasWidth, canvasHeight) {
    const dims = this.getWatermarkDimensions(canvasWidth, canvasHeight);
    const pos = this.getPosition(canvasWidth, canvasHeight, dims.width, dims.height);

    ctx.save();
    ctx.translate(pos.x + dims.width / 2, pos.y + dims.height / 2);
    ctx.rotate((this.settings.rotation * Math.PI) / 180);
    ctx.translate(-dims.width / 2, -dims.height / 2);

    if (this.settings.type === 'text') {
      ctx.font = `${dims.fontSize}px Arial, sans-serif`;
      ctx.fillStyle = this.settings.textColor;
      ctx.textBaseline = 'top';
      ctx.fillText(this.settings.text, 0, 0);
    } else if (this.watermarkImage) {
      ctx.drawImage(this.watermarkImage, 0, 0, dims.width, dims.height);
    }

    ctx.restore();
  }

  drawTiledWatermark(ctx, canvasWidth, canvasHeight) {
    const dims = this.getWatermarkDimensions(canvasWidth, canvasHeight);
    const spacingX = dims.width + 50;
    const spacingY = dims.height + 50;

    for (let y = 0; y < canvasHeight + dims.height; y += spacingY) {
      for (let x = 0; x < canvasWidth + dims.width; x += spacingX) {
        ctx.save();
        ctx.translate(x + dims.width / 2, y + dims.height / 2);
        ctx.rotate((this.settings.rotation * Math.PI) / 180);
        ctx.translate(-dims.width / 2, -dims.height / 2);

        if (this.settings.type === 'text') {
          ctx.font = `${dims.fontSize}px Arial, sans-serif`;
          ctx.fillStyle = this.settings.textColor;
          ctx.textBaseline = 'top';
          ctx.fillText(this.settings.text, 0, 0);
        } else if (this.watermarkImage) {
          ctx.drawImage(this.watermarkImage, 0, 0, dims.width, dims.height);
        }

        ctx.restore();
      }
    }
  }

  drawDiagonalWatermark(ctx, canvasWidth, canvasHeight) {
    const dims = this.getWatermarkDimensions(canvasWidth, canvasHeight);
    const spacing = Math.max(dims.width, dims.height) + 80;
    const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);

    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate(-Math.PI / 4);

    for (let y = -diagonal / 2; y < diagonal / 2; y += spacing) {
      for (let x = -diagonal / 2; x < diagonal / 2; x += spacing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((this.settings.rotation * Math.PI) / 180);

        if (this.settings.type === 'text') {
          ctx.font = `${dims.fontSize}px Arial, sans-serif`;
          ctx.fillStyle = this.settings.textColor;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(this.settings.text, 0, 0);
        } else if (this.watermarkImage) {
          ctx.drawImage(this.watermarkImage, -dims.width / 2, -dims.height / 2, dims.width, dims.height);
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }

  applyWatermark() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    if (this.settings.type === 'image' && !this.watermarkImage) {
      this.showStatus('請選擇浮水印圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = this.originalImage.width;
    fullCanvas.height = this.originalImage.height;
    const fullCtx = fullCanvas.getContext('2d');

    // Draw original image at full resolution
    fullCtx.drawImage(this.originalImage, 0, 0);

    // Apply watermark at full resolution
    this.drawWatermark(fullCtx, fullCanvas.width, fullCanvas.height);

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('浮水印套用成功！', 'success');
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用浮水印', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `watermarked_${Date.now()}.png`;
    link.href = this.resultDataUrl;
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.watermarkImage = null;
    this.resultDataUrl = null;

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.editorSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.watermarkInput.value = '';

    // Reset watermark upload
    this.watermarkUpload.classList.remove('has-image');
    this.watermarkUpload.innerHTML = '<div>點擊選擇圖片</div>';

    // Reset settings
    this.settings = {
      type: 'text',
      text: '© My Watermark',
      fontSize: 32,
      textColor: '#ffffff',
      imageSize: 20,
      position: 'middle-center',
      opacity: 50,
      rotation: 0,
      tileMode: 'single'
    };

    this.watermarkTextInput.value = this.settings.text;
    this.fontSizeInput.value = this.settings.fontSize;
    this.fontSizeValue.textContent = `${this.settings.fontSize}px`;
    this.textColorPicker.value = this.settings.textColor;
    this.textColorValue.value = this.settings.textColor;
    this.imageSizeInput.value = this.settings.imageSize;
    this.imageSizeValue.textContent = `${this.settings.imageSize}%`;
    this.opacityInput.value = this.settings.opacity;
    this.opacityValue.textContent = `${this.settings.opacity}%`;
    this.rotationInput.value = this.settings.rotation;
    this.rotationValue.textContent = `${this.settings.rotation}°`;
    this.tileModeSelect.value = this.settings.tileMode;

    // Reset type tabs
    this.setType('text');

    // Reset position buttons
    this.positionBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === 'middle-center');
    });

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
  new ImageWatermark();
});
