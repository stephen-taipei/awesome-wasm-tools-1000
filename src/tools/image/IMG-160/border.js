/**
 * IMG-160 圖片邊框工具
 * Image Border Tool
 */

class ImageBorder {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;

    this.settings = {
      style: 'solid',
      width: 20,
      color: '#ffffff',
      gradientStart: '#ff6b6b',
      gradientEnd: '#4ecdc4',
      padding: 0,
      cornerRadius: 0
    };

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

    // Style buttons
    this.styleBtns = document.querySelectorAll('.style-btn');

    // Settings
    this.borderWidthSlider = document.getElementById('borderWidth');
    this.borderWidthValue = document.getElementById('borderWidthValue');
    this.colorGroup = document.getElementById('colorGroup');
    this.borderColorPicker = document.getElementById('borderColor');
    this.borderColorValue = document.getElementById('borderColorValue');
    this.gradientGroup = document.getElementById('gradientGroup');
    this.gradientStartPicker = document.getElementById('gradientStart');
    this.gradientEndPicker = document.getElementById('gradientEnd');
    this.paddingSlider = document.getElementById('padding');
    this.paddingValue = document.getElementById('paddingValue');
    this.cornerGroup = document.getElementById('cornerGroup');
    this.cornerRadiusSlider = document.getElementById('cornerRadius');
    this.cornerRadiusValue = document.getElementById('cornerRadiusValue');

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

    // Style buttons
    this.styleBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setStyle(btn.dataset.style));
    });

    // Settings
    this.borderWidthSlider.addEventListener('input', (e) => {
      this.settings.width = parseInt(e.target.value);
      this.borderWidthValue.textContent = `${this.settings.width}px`;
      this.updatePreview();
    });

    this.borderColorPicker.addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      this.borderColorValue.value = e.target.value;
      this.updatePreview();
    });

    this.borderColorValue.addEventListener('change', (e) => {
      this.settings.color = e.target.value;
      this.borderColorPicker.value = e.target.value;
      this.updatePreview();
    });

    this.gradientStartPicker.addEventListener('input', (e) => {
      this.settings.gradientStart = e.target.value;
      this.updatePreview();
    });

    this.gradientEndPicker.addEventListener('input', (e) => {
      this.settings.gradientEnd = e.target.value;
      this.updatePreview();
    });

    this.paddingSlider.addEventListener('input', (e) => {
      this.settings.padding = parseInt(e.target.value);
      this.paddingValue.textContent = `${this.settings.padding}px`;
      this.updatePreview();
    });

    this.cornerRadiusSlider.addEventListener('input', (e) => {
      this.settings.cornerRadius = parseInt(e.target.value);
      this.cornerRadiusValue.textContent = `${this.settings.cornerRadius}px`;
      this.updatePreview();
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyBorder());
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

  setStyle(style) {
    this.settings.style = style;
    this.styleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });

    // Show/hide relevant settings
    this.colorGroup.style.display = style === 'gradient' ? 'none' : 'block';
    this.gradientGroup.style.display = style === 'gradient' ? 'block' : 'none';

    this.updatePreview();
  }

  updatePreview() {
    if (!this.originalImage) return;

    const scale = Math.min(1, 600 / Math.max(this.originalImage.width, this.originalImage.height));
    const imgWidth = this.originalImage.width * scale;
    const imgHeight = this.originalImage.height * scale;

    this.drawBorder(this.ctx, this.previewCanvas, imgWidth, imgHeight, scale);
  }

  drawBorder(ctx, canvas, imgWidth, imgHeight, scale = 1) {
    const borderWidth = this.settings.width * scale;
    const padding = this.settings.padding * scale;
    const cornerRadius = this.settings.cornerRadius * scale;
    const style = this.settings.style;

    let canvasWidth, canvasHeight;

    // Calculate canvas size based on style
    if (style === 'polaroid') {
      canvasWidth = imgWidth + borderWidth * 2;
      canvasHeight = imgHeight + borderWidth + borderWidth * 3;
    } else if (style === 'film') {
      canvasWidth = imgWidth + borderWidth * 2 + 40 * scale;
      canvasHeight = imgHeight + borderWidth * 2;
    } else {
      canvasWidth = imgWidth + (borderWidth + padding) * 2;
      canvasHeight = imgHeight + (borderWidth + padding) * 2;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw based on style
    switch (style) {
      case 'solid':
        this.drawSolidBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'double':
        this.drawDoubleBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'dashed':
        this.drawDashedBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'dotted':
        this.drawDottedBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'gradient':
        this.drawGradientBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'shadow':
        this.drawShadowBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius);
        break;
      case 'polaroid':
        this.drawPolaroidBorder(ctx, canvas, imgWidth, imgHeight, borderWidth);
        break;
      case 'film':
        this.drawFilmBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, scale);
        break;
      case 'stamp':
        this.drawStampBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding);
        break;
    }
  }

  drawSolidBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    // Fill border
    ctx.fillStyle = this.settings.color;
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    ctx.fill();

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.save();
    this.roundRect(ctx, x, y, imgWidth, imgHeight, Math.max(0, cornerRadius - borderWidth));
    ctx.clip();
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
    ctx.restore();
  }

  drawDoubleBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    const outerGap = borderWidth * 0.3;
    const innerBorder = borderWidth * 0.3;

    // Outer border
    ctx.fillStyle = this.settings.color;
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    ctx.fill();

    // Gap
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, innerBorder, innerBorder, canvas.width - innerBorder * 2, canvas.height - innerBorder * 2, cornerRadius - innerBorder);
    ctx.fill();

    // Inner border
    ctx.fillStyle = this.settings.color;
    this.roundRect(ctx, innerBorder + outerGap, innerBorder + outerGap, canvas.width - (innerBorder + outerGap) * 2, canvas.height - (innerBorder + outerGap) * 2, cornerRadius - innerBorder - outerGap);
    ctx.fill();

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
  }

  drawDashedBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    // Background
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    ctx.fill();

    // Dashed border
    ctx.strokeStyle = this.settings.color;
    ctx.lineWidth = borderWidth * 0.5;
    ctx.setLineDash([borderWidth, borderWidth * 0.5]);
    this.roundRect(ctx, borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth, cornerRadius);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
  }

  drawDottedBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    // Background
    ctx.fillStyle = '#1a1a2e';
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    ctx.fill();

    // Dotted border
    const dotSize = borderWidth * 0.3;
    const spacing = borderWidth * 0.6;
    ctx.fillStyle = this.settings.color;

    // Top and bottom
    for (let x = spacing; x < canvas.width - spacing; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, borderWidth / 2, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, canvas.height - borderWidth / 2, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left and right
    for (let y = spacing; y < canvas.height - spacing; y += spacing) {
      ctx.beginPath();
      ctx.arc(borderWidth / 2, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(canvas.width - borderWidth / 2, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
  }

  drawGradientBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    // Gradient border
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, this.settings.gradientStart);
    gradient.addColorStop(1, this.settings.gradientEnd);
    ctx.fillStyle = gradient;
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, cornerRadius);
    ctx.fill();

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.save();
    this.roundRect(ctx, x, y, imgWidth, imgHeight, Math.max(0, cornerRadius - borderWidth));
    ctx.clip();
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
    ctx.restore();
  }

  drawShadowBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding, cornerRadius) {
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = borderWidth;
    ctx.shadowOffsetX = borderWidth * 0.3;
    ctx.shadowOffsetY = borderWidth * 0.3;

    // Border background
    ctx.fillStyle = this.settings.color;
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    this.roundRect(ctx, x - padding, y - padding, imgWidth + padding * 2, imgHeight + padding * 2, cornerRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Draw image
    ctx.save();
    this.roundRect(ctx, x, y, imgWidth, imgHeight, Math.max(0, cornerRadius - padding));
    ctx.clip();
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
    ctx.restore();
  }

  drawPolaroidBorder(ctx, canvas, imgWidth, imgHeight, borderWidth) {
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Slight shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Draw image
    ctx.drawImage(this.originalImage, borderWidth, borderWidth, imgWidth, imgHeight);

    ctx.shadowColor = 'transparent';
  }

  drawFilmBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, scale) {
    // Black background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Film holes
    const holeWidth = 15 * scale;
    const holeHeight = 10 * scale;
    const holeSpacing = 25 * scale;
    const holeMargin = 10 * scale;

    ctx.fillStyle = '#333';
    for (let y = holeSpacing / 2; y < canvas.height; y += holeSpacing) {
      // Left holes
      this.roundRect(ctx, holeMargin, y - holeHeight / 2, holeWidth, holeHeight, 2);
      ctx.fill();
      // Right holes
      this.roundRect(ctx, canvas.width - holeMargin - holeWidth, y - holeHeight / 2, holeWidth, holeHeight, 2);
      ctx.fill();
    }

    // Draw image
    const x = borderWidth + 20 * scale;
    const y = borderWidth;
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
  }

  drawStampBorder(ctx, canvas, imgWidth, imgHeight, borderWidth, padding) {
    // White background
    ctx.fillStyle = this.settings.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stamp perforations
    const holeRadius = borderWidth * 0.25;
    const spacing = borderWidth * 0.8;

    ctx.fillStyle = '#1a1a2e';
    ctx.globalCompositeOperation = 'destination-out';

    // Top and bottom
    for (let x = spacing / 2; x < canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, 0, holeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, canvas.height, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left and right
    for (let y = spacing / 2; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.arc(0, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(canvas.width, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    // Draw image
    const x = borderWidth + padding;
    const y = borderWidth + padding;
    ctx.drawImage(this.originalImage, x, y, imgWidth, imgHeight);
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  applyBorder() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    const fullCtx = fullCanvas.getContext('2d');

    this.drawBorder(fullCtx, fullCanvas, this.originalImage.width, this.originalImage.height, 1);

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('邊框套用成功！', 'success');
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用邊框', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `bordered_${Date.now()}.png`;
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
      style: 'solid',
      width: 20,
      color: '#ffffff',
      gradientStart: '#ff6b6b',
      gradientEnd: '#4ecdc4',
      padding: 0,
      cornerRadius: 0
    };

    this.borderWidthSlider.value = 20;
    this.borderWidthValue.textContent = '20px';
    this.borderColorPicker.value = '#ffffff';
    this.borderColorValue.value = '#ffffff';
    this.gradientStartPicker.value = '#ff6b6b';
    this.gradientEndPicker.value = '#4ecdc4';
    this.paddingSlider.value = 0;
    this.paddingValue.textContent = '0px';
    this.cornerRadiusSlider.value = 0;
    this.cornerRadiusValue.textContent = '0px';

    // Reset style buttons
    this.setStyle('solid');

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
  new ImageBorder();
});
