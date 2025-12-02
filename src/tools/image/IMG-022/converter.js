/**
 * IMG-022 頭像裁切器
 * 圓形/方形頭像裁切，支援邊框與陰影效果
 */

class AvatarCropper {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.shape = 'circle';
    this.cropSize = 200;
    this.cropPosition = { x: 0, y: 0 };
    this.displayScale = 1;
    this.isDragging = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.shapePanel = document.getElementById('shapePanel');
    this.cropPanel = document.getElementById('cropPanel');
    this.stylePanel = document.getElementById('stylePanel');
    this.resultPanel = document.getElementById('resultPanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.previewImage = document.getElementById('previewImage');
    this.avatarPreview = document.getElementById('avatarPreview');
    this.cropArea = document.getElementById('cropArea');
    this.resultImage = document.getElementById('resultImage');
    this.resultInfo = document.getElementById('resultInfo');

    this.shapeButtons = document.querySelectorAll('.shape-btn');
    this.outputSizeSelect = document.getElementById('outputSize');
    this.borderWidthSlider = document.getElementById('borderWidth');
    this.borderWidthValue = document.getElementById('borderWidthValue');
    this.borderColorInput = document.getElementById('borderColor');
    this.enableShadowCheckbox = document.getElementById('enableShadow');

    this.bindEvents();
  }

  bindEvents() {
    // File upload
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

    // Shape selection
    this.shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.shapeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shape = btn.dataset.shape;
        this.updateCropArea();
      });
    });

    // Border width slider
    this.borderWidthSlider.addEventListener('input', () => {
      this.borderWidthValue.textContent = `${this.borderWidthSlider.value} px`;
    });

    // Crop area dragging
    this.cropArea.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.endDrag());

    // Touch support
    this.cropArea.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) this.drag(e.touches[0]);
    });
    document.addEventListener('touchend', () => this.endDrag());

    // Scroll to resize
    this.avatarPreview.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.resizeCrop(e.deltaY < 0 ? 10 : -10);
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.createAvatar());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.previewImage.src = e.target.result;

        // Calculate initial crop size and position
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        this.cropSize = minDim * 0.6;
        this.cropPosition = {
          x: (img.naturalWidth - this.cropSize) / 2,
          y: (img.naturalHeight - this.cropSize) / 2
        };

        // Calculate display scale
        const containerWidth = this.avatarPreview.clientWidth || 400;
        const containerHeight = 350;
        this.displayScale = Math.min(
          containerWidth / img.naturalWidth,
          containerHeight / img.naturalHeight,
          1
        );

        this.updateCropArea();
        this.shapePanel.style.display = 'block';
        this.cropPanel.style.display = 'block';
        this.stylePanel.style.display = 'block';
        this.convertBtn.disabled = false;
        this.showStatus('success', '圖片載入成功，請調整裁切範圍');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateCropArea() {
    const scale = this.displayScale;
    const size = this.cropSize * scale;

    this.cropArea.style.width = `${size}px`;
    this.cropArea.style.height = `${size}px`;
    this.cropArea.style.left = `${this.cropPosition.x * scale}px`;
    this.cropArea.style.top = `${this.cropPosition.y * scale}px`;

    // Update shape
    this.cropArea.className = this.shape === 'circle' ? 'crop-circle' : 'crop-square';
    if (this.shape === 'rounded') {
      this.cropArea.style.borderRadius = '20%';
    } else if (this.shape === 'circle') {
      this.cropArea.style.borderRadius = '50%';
    } else {
      this.cropArea.style.borderRadius = '0';
    }
  }

  startDrag(e) {
    this.isDragging = true;
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropX: this.cropPosition.x,
      cropY: this.cropPosition.y
    };
  }

  drag(e) {
    if (!this.isDragging) return;

    const dx = (e.clientX - this.dragStart.x) / this.displayScale;
    const dy = (e.clientY - this.dragStart.y) / this.displayScale;

    let newX = this.dragStart.cropX + dx;
    let newY = this.dragStart.cropY + dy;

    // Constrain to image bounds
    newX = Math.max(0, Math.min(newX, this.originalImage.naturalWidth - this.cropSize));
    newY = Math.max(0, Math.min(newY, this.originalImage.naturalHeight - this.cropSize));

    this.cropPosition.x = newX;
    this.cropPosition.y = newY;
    this.updateCropArea();
  }

  endDrag() {
    this.isDragging = false;
  }

  resizeCrop(delta) {
    const minSize = 50;
    const maxSize = Math.min(this.originalImage.naturalWidth, this.originalImage.naturalHeight);

    let newSize = this.cropSize + delta / this.displayScale;
    newSize = Math.max(minSize, Math.min(newSize, maxSize));

    // Adjust position to keep centered
    const diff = newSize - this.cropSize;
    this.cropPosition.x = Math.max(0, this.cropPosition.x - diff / 2);
    this.cropPosition.y = Math.max(0, this.cropPosition.y - diff / 2);

    // Constrain position
    this.cropPosition.x = Math.min(this.cropPosition.x, this.originalImage.naturalWidth - newSize);
    this.cropPosition.y = Math.min(this.cropPosition.y, this.originalImage.naturalHeight - newSize);

    this.cropSize = newSize;
    this.updateCropArea();
  }

  async createAvatar() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在製作頭像...');

    try {
      const outputSize = parseInt(this.outputSizeSelect.value);
      const borderWidth = parseInt(this.borderWidthSlider.value);
      const borderColor = this.borderColorInput.value;
      const enableShadow = this.enableShadowCheckbox.checked;

      this.updateProgress(30, '建立畫布...');

      const totalSize = outputSize + borderWidth * 2 + (enableShadow ? 20 : 0);
      const canvas = document.createElement('canvas');
      canvas.width = totalSize;
      canvas.height = totalSize;
      const ctx = canvas.getContext('2d');

      const centerX = totalSize / 2;
      const centerY = totalSize / 2;
      const radius = outputSize / 2;

      this.updateProgress(50, '繪製頭像...');

      // Draw shadow
      if (enableShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
      }

      // Create clipping path
      ctx.beginPath();
      if (this.shape === 'circle') {
        ctx.arc(centerX, centerY, radius + borderWidth, 0, Math.PI * 2);
      } else if (this.shape === 'rounded') {
        this.roundRect(ctx, centerX - radius - borderWidth, centerY - radius - borderWidth,
          (radius + borderWidth) * 2, (radius + borderWidth) * 2, radius * 0.2);
      } else {
        ctx.rect(centerX - radius - borderWidth, centerY - radius - borderWidth,
          (radius + borderWidth) * 2, (radius + borderWidth) * 2);
      }

      // Draw border
      if (borderWidth > 0) {
        ctx.fillStyle = borderColor;
        ctx.fill();
      }

      // Reset shadow for image
      ctx.shadowColor = 'transparent';

      // Clip for image
      ctx.beginPath();
      if (this.shape === 'circle') {
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else if (this.shape === 'rounded') {
        this.roundRect(ctx, centerX - radius, centerY - radius, radius * 2, radius * 2, radius * 0.2);
      } else {
        ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      }
      ctx.clip();

      this.updateProgress(70, '裁切圖片...');

      // Draw image
      ctx.drawImage(
        this.originalImage,
        this.cropPosition.x,
        this.cropPosition.y,
        this.cropSize,
        this.cropSize,
        centerX - radius,
        centerY - radius,
        radius * 2,
        radius * 2
      );

      this.updateProgress(90, '輸出圖片...');

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      this.convertedBlob = blob;

      this.updateProgress(100, '完成！');

      // Update UI
      this.resultImage.src = URL.createObjectURL(blob);
      this.resultInfo.textContent = `${outputSize} × ${outputSize} px | ${this.formatFileSize(blob.size)}`;
      this.resultPanel.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `頭像製作完成！尺寸：${outputSize} × ${outputSize} px`);

    } catch (error) {
      this.showStatus('error', `製作失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const size = this.outputSizeSelect.value;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_avatar_${size}x${size}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.fileInput.value = '';
    this.shapePanel.style.display = 'none';
    this.cropPanel.style.display = 'none';
    this.stylePanel.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.borderWidthSlider.value = 0;
    this.borderWidthValue.textContent = '0 px';
    this.enableShadowCheckbox.checked = false;
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AvatarCropper();
});
