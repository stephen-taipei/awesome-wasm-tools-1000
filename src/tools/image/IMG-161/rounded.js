/**
 * IMG-161 圖片圓角工具
 * Image Rounded Corners Tool
 */

class ImageRounded {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;

    this.settings = {
      shape: 'rounded',
      radius: 30,
      topLeft: 30,
      topRight: 30,
      bottomLeft: 30,
      bottomRight: 30,
      linkCorners: true,
      starPoints: 5,
      innerRadius: 50,
      bgColor: '#ffffff',
      transparentBg: true
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

    // Shape buttons
    this.shapeBtns = document.querySelectorAll('.shape-btn');

    // Settings sections
    this.roundedSettings = document.getElementById('roundedSettings');
    this.starSettings = document.getElementById('starSettings');

    // Rounded settings
    this.radiusSlider = document.getElementById('radius');
    this.radiusValue = document.getElementById('radiusValue');
    this.topLeftInput = document.getElementById('topLeft');
    this.topRightInput = document.getElementById('topRight');
    this.bottomLeftInput = document.getElementById('bottomLeft');
    this.bottomRightInput = document.getElementById('bottomRight');
    this.linkCornersCheckbox = document.getElementById('linkCorners');
    this.linkCornersLabel = document.querySelector('.link-corners');

    // Star settings
    this.starPointsSlider = document.getElementById('starPoints');
    this.pointsValue = document.getElementById('pointsValue');
    this.innerRadiusSlider = document.getElementById('innerRadius');
    this.innerRadiusValue = document.getElementById('innerRadiusValue');

    // Background settings
    this.bgColorPicker = document.getElementById('bgColor');
    this.bgColorValue = document.getElementById('bgColorValue');
    this.transparentBgCheckbox = document.getElementById('transparentBg');

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

    // Shape buttons
    this.shapeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setShape(btn.dataset.shape));
    });

    // Rounded settings
    this.radiusSlider.addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      this.radiusValue.textContent = `${this.settings.radius}px`;

      if (this.settings.linkCorners) {
        this.settings.topLeft = this.settings.radius;
        this.settings.topRight = this.settings.radius;
        this.settings.bottomLeft = this.settings.radius;
        this.settings.bottomRight = this.settings.radius;
        this.updateCornerInputs();
      }

      this.updatePreview();
    });

    [this.topLeftInput, this.topRightInput, this.bottomLeftInput, this.bottomRightInput].forEach(input => {
      input.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 0;
        const corner = e.target.id;

        if (this.settings.linkCorners) {
          this.settings.topLeft = value;
          this.settings.topRight = value;
          this.settings.bottomLeft = value;
          this.settings.bottomRight = value;
          this.settings.radius = value;
          this.radiusSlider.value = value;
          this.radiusValue.textContent = `${value}px`;
          this.updateCornerInputs();
        } else {
          this.settings[corner] = value;
        }

        this.updatePreview();
      });
    });

    this.linkCornersLabel.addEventListener('click', () => {
      this.settings.linkCorners = !this.settings.linkCorners;
      this.linkCornersCheckbox.checked = this.settings.linkCorners;
      this.linkCornersLabel.classList.toggle('active', this.settings.linkCorners);
    });

    // Star settings
    this.starPointsSlider.addEventListener('input', (e) => {
      this.settings.starPoints = parseInt(e.target.value);
      this.pointsValue.textContent = this.settings.starPoints;
      this.updatePreview();
    });

    this.innerRadiusSlider.addEventListener('input', (e) => {
      this.settings.innerRadius = parseInt(e.target.value);
      this.innerRadiusValue.textContent = `${this.settings.innerRadius}%`;
      this.updatePreview();
    });

    // Background settings
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

    this.transparentBgCheckbox.addEventListener('change', (e) => {
      this.settings.transparentBg = e.target.checked;
      this.updatePreview();
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyShape());
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

  setShape(shape) {
    this.settings.shape = shape;
    this.shapeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === shape);
    });

    // Show/hide relevant settings
    this.roundedSettings.style.display = shape === 'rounded' ? 'block' : 'none';
    this.starSettings.style.display = shape === 'star' ? 'block' : 'none';

    this.updatePreview();
  }

  updateCornerInputs() {
    this.topLeftInput.value = this.settings.topLeft;
    this.topRightInput.value = this.settings.topRight;
    this.bottomLeftInput.value = this.settings.bottomLeft;
    this.bottomRightInput.value = this.settings.bottomRight;
  }

  updatePreview() {
    if (!this.originalImage) return;

    const scale = Math.min(1, 600 / Math.max(this.originalImage.width, this.originalImage.height));
    const imgWidth = this.originalImage.width * scale;
    const imgHeight = this.originalImage.height * scale;

    this.drawShape(this.ctx, this.previewCanvas, imgWidth, imgHeight, scale);
  }

  drawShape(ctx, canvas, imgWidth, imgHeight, scale = 1) {
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background if not transparent
    if (!this.settings.transparentBg) {
      ctx.fillStyle = this.settings.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Create clipping path based on shape
    ctx.save();

    switch (this.settings.shape) {
      case 'rounded':
        this.drawRoundedRect(ctx, imgWidth, imgHeight, scale);
        break;
      case 'circle':
        this.drawCircle(ctx, imgWidth, imgHeight);
        break;
      case 'ellipse':
        this.drawEllipse(ctx, imgWidth, imgHeight);
        break;
      case 'squircle':
        this.drawSquircle(ctx, imgWidth, imgHeight);
        break;
      case 'hexagon':
        this.drawHexagon(ctx, imgWidth, imgHeight);
        break;
      case 'star':
        this.drawStar(ctx, imgWidth, imgHeight);
        break;
    }

    ctx.clip();
    ctx.drawImage(this.originalImage, 0, 0, imgWidth, imgHeight);
    ctx.restore();
  }

  drawRoundedRect(ctx, width, height, scale) {
    const tl = this.settings.topLeft * scale;
    const tr = this.settings.topRight * scale;
    const bl = this.settings.bottomLeft * scale;
    const br = this.settings.bottomRight * scale;

    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.lineTo(width - tr, 0);
    ctx.quadraticCurveTo(width, 0, width, tr);
    ctx.lineTo(width, height - br);
    ctx.quadraticCurveTo(width, height, width - br, height);
    ctx.lineTo(bl, height);
    ctx.quadraticCurveTo(0, height, 0, height - bl);
    ctx.lineTo(0, tl);
    ctx.quadraticCurveTo(0, 0, tl, 0);
    ctx.closePath();
  }

  drawCircle(ctx, width, height) {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
  }

  drawEllipse(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.closePath();
  }

  drawSquircle(ctx, width, height) {
    const n = 4; // Squircle exponent
    const steps = 100;
    const centerX = width / 2;
    const centerY = height / 2;
    const a = width / 2;
    const b = height / 2;

    ctx.beginPath();

    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const x = centerX + a * Math.sign(cosA) * Math.pow(Math.abs(cosA), 2 / n);
      const y = centerY + b * Math.sign(sinA) * Math.pow(Math.abs(sinA), 2 / n);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
  }

  drawHexagon(ctx, width, height) {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2;

    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
  }

  drawStar(ctx, width, height) {
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = size / 2;
    const innerRadius = outerRadius * (this.settings.innerRadius / 100);
    const points = this.settings.starPoints;

    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
  }

  applyShape() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    const fullCtx = fullCanvas.getContext('2d');

    this.drawShape(fullCtx, fullCanvas, this.originalImage.width, this.originalImage.height, 1);

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('形狀套用成功！', 'success');
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用形狀', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `rounded_${Date.now()}.png`;
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
      shape: 'rounded',
      radius: 30,
      topLeft: 30,
      topRight: 30,
      bottomLeft: 30,
      bottomRight: 30,
      linkCorners: true,
      starPoints: 5,
      innerRadius: 50,
      bgColor: '#ffffff',
      transparentBg: true
    };

    this.radiusSlider.value = 30;
    this.radiusValue.textContent = '30px';
    this.updateCornerInputs();
    this.linkCornersCheckbox.checked = true;
    this.linkCornersLabel.classList.add('active');
    this.starPointsSlider.value = 5;
    this.pointsValue.textContent = '5';
    this.innerRadiusSlider.value = 50;
    this.innerRadiusValue.textContent = '50%';
    this.bgColorPicker.value = '#ffffff';
    this.bgColorValue.value = '#ffffff';
    this.transparentBgCheckbox.checked = true;

    // Reset shape buttons
    this.setShape('rounded');

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
  new ImageRounded();
});
