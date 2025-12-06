/**
 * IMG-154 圖片截圖工具
 * Image Screenshot/Crop Tool
 */

class ImageScreenshot {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;
    this.scale = 1;
    this.aspectRatio = null;

    this.cropRect = {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    };

    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.cropStartX = 0;
    this.cropStartY = 0;
    this.cropStartWidth = 0;
    this.cropStartHeight = 0;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Editor
    this.editorSection = document.getElementById('editorSection');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.imageCanvas = document.getElementById('imageCanvas');
    this.ctx = this.imageCanvas.getContext('2d');

    // Crop controls
    this.cropXInput = document.getElementById('cropX');
    this.cropYInput = document.getElementById('cropY');
    this.cropWidthInput = document.getElementById('cropWidth');
    this.cropHeightInput = document.getElementById('cropHeight');
    this.ratioButtons = document.querySelectorAll('.ratio-btn');

    // Crop overlay
    this.cropOverlay = document.getElementById('cropOverlay');
    this.cropBox = document.getElementById('cropBox');
    this.cropInfo = document.getElementById('cropInfo');
    this.dimTop = document.getElementById('dimTop');
    this.dimBottom = document.getElementById('dimBottom');
    this.dimLeft = document.getElementById('dimLeft');
    this.dimRight = document.getElementById('dimRight');

    // Preview
    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');
    this.previewInfo = document.getElementById('previewInfo');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.cropBtn = document.getElementById('cropBtn');
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

    // Crop inputs
    this.cropXInput.addEventListener('change', () => this.updateCropFromInputs());
    this.cropYInput.addEventListener('change', () => this.updateCropFromInputs());
    this.cropWidthInput.addEventListener('change', () => this.updateCropFromInputs());
    this.cropHeightInput.addEventListener('change', () => this.updateCropFromInputs());

    // Ratio buttons
    this.ratioButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setAspectRatio(btn.dataset.ratio);
      });
    });

    // Crop box drag
    this.cropBox.addEventListener('mousedown', (e) => this.handleCropMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleCropMouseMove(e));
    document.addEventListener('mouseup', () => this.handleCropMouseUp());

    // Touch events
    this.cropBox.addEventListener('touchstart', (e) => this.handleCropTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleCropTouchMove(e));
    document.addEventListener('touchend', () => this.handleCropMouseUp());

    // Buttons
    this.cropBtn.addEventListener('click', () => this.cropImage());
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

        // Calculate scale to fit in container
        const maxWidth = 800;
        const maxHeight = 500;
        this.scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);

        // Set canvas size
        this.imageCanvas.width = img.width * this.scale;
        this.imageCanvas.height = img.height * this.scale;

        // Draw image
        this.ctx.drawImage(img, 0, 0, this.imageCanvas.width, this.imageCanvas.height);

        // Initialize crop rect to center 50%
        const cropSize = Math.min(this.imageCanvas.width, this.imageCanvas.height) * 0.5;
        this.cropRect = {
          x: (this.imageCanvas.width - cropSize) / 2,
          y: (this.imageCanvas.height - cropSize) / 2,
          width: cropSize,
          height: cropSize
        };

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.editorSection.classList.add('active');
        this.buttonGroup.style.display = 'flex';

        this.updateCropUI();
        this.showStatus('圖片載入成功！拖曳框線調整裁切區域', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setAspectRatio(ratio) {
    this.ratioButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === ratio);
    });

    if (ratio === 'free') {
      this.aspectRatio = null;
    } else {
      const [w, h] = ratio.split(':').map(Number);
      this.aspectRatio = w / h;

      // Adjust current crop to match ratio
      const newHeight = this.cropRect.width / this.aspectRatio;
      if (this.cropRect.y + newHeight <= this.imageCanvas.height) {
        this.cropRect.height = newHeight;
      } else {
        this.cropRect.height = this.imageCanvas.height - this.cropRect.y;
        this.cropRect.width = this.cropRect.height * this.aspectRatio;
      }

      this.constrainCrop();
      this.updateCropUI();
    }
  }

  handleCropMouseDown(e) {
    const handle = e.target.dataset?.handle;

    if (handle) {
      this.isResizing = true;
      this.resizeHandle = handle;
    } else {
      this.isDragging = true;
    }

    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.cropStartX = this.cropRect.x;
    this.cropStartY = this.cropRect.y;
    this.cropStartWidth = this.cropRect.width;
    this.cropStartHeight = this.cropRect.height;

    e.preventDefault();
  }

  handleCropTouchStart(e) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const handle = target?.dataset?.handle;

    if (handle) {
      this.isResizing = true;
      this.resizeHandle = handle;
    } else {
      this.isDragging = true;
    }

    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.cropStartX = this.cropRect.x;
    this.cropStartY = this.cropRect.y;
    this.cropStartWidth = this.cropRect.width;
    this.cropStartHeight = this.cropRect.height;

    e.preventDefault();
  }

  handleCropMouseMove(e) {
    if (!this.isDragging && !this.isResizing) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    const rect = this.canvasWrapper.getBoundingClientRect();
    const deltaX = (clientX - this.dragStartX);
    const deltaY = (clientY - this.dragStartY);

    if (this.isDragging) {
      this.cropRect.x = this.cropStartX + deltaX;
      this.cropRect.y = this.cropStartY + deltaY;
    } else if (this.isResizing) {
      this.handleResize(deltaX, deltaY);
    }

    this.constrainCrop();
    this.updateCropUI();
  }

  handleCropTouchMove(e) {
    if (!this.isDragging && !this.isResizing) return;
    this.handleCropMouseMove(e);
    e.preventDefault();
  }

  handleResize(deltaX, deltaY) {
    const handle = this.resizeHandle;
    let newX = this.cropStartX;
    let newY = this.cropStartY;
    let newWidth = this.cropStartWidth;
    let newHeight = this.cropStartHeight;

    // Horizontal resize
    if (handle.includes('e')) {
      newWidth = this.cropStartWidth + deltaX;
    } else if (handle.includes('w')) {
      newWidth = this.cropStartWidth - deltaX;
      newX = this.cropStartX + deltaX;
    }

    // Vertical resize
    if (handle.includes('s')) {
      newHeight = this.cropStartHeight + deltaY;
    } else if (handle.includes('n')) {
      newHeight = this.cropStartHeight - deltaY;
      newY = this.cropStartY + deltaY;
    }

    // Apply aspect ratio constraint
    if (this.aspectRatio) {
      if (handle.includes('e') || handle.includes('w')) {
        newHeight = newWidth / this.aspectRatio;
        if (handle.includes('n')) {
          newY = this.cropStartY + this.cropStartHeight - newHeight;
        }
      } else {
        newWidth = newHeight * this.aspectRatio;
        if (handle.includes('w')) {
          newX = this.cropStartX + this.cropStartWidth - newWidth;
        }
      }
    }

    // Ensure minimum size
    if (newWidth >= 20 && newHeight >= 20) {
      this.cropRect.x = newX;
      this.cropRect.y = newY;
      this.cropRect.width = newWidth;
      this.cropRect.height = newHeight;
    }
  }

  handleCropMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  constrainCrop() {
    // Ensure crop stays within canvas
    this.cropRect.x = Math.max(0, Math.min(this.cropRect.x, this.imageCanvas.width - this.cropRect.width));
    this.cropRect.y = Math.max(0, Math.min(this.cropRect.y, this.imageCanvas.height - this.cropRect.height));
    this.cropRect.width = Math.min(this.cropRect.width, this.imageCanvas.width - this.cropRect.x);
    this.cropRect.height = Math.min(this.cropRect.height, this.imageCanvas.height - this.cropRect.y);

    // Ensure minimum size
    this.cropRect.width = Math.max(20, this.cropRect.width);
    this.cropRect.height = Math.max(20, this.cropRect.height);
  }

  updateCropUI() {
    // Update crop box position
    this.cropBox.style.left = `${this.cropRect.x}px`;
    this.cropBox.style.top = `${this.cropRect.y}px`;
    this.cropBox.style.width = `${this.cropRect.width}px`;
    this.cropBox.style.height = `${this.cropRect.height}px`;

    // Update dim overlays
    this.dimTop.style.top = '0';
    this.dimTop.style.left = '0';
    this.dimTop.style.width = '100%';
    this.dimTop.style.height = `${this.cropRect.y}px`;

    this.dimBottom.style.top = `${this.cropRect.y + this.cropRect.height}px`;
    this.dimBottom.style.left = '0';
    this.dimBottom.style.width = '100%';
    this.dimBottom.style.height = `${this.imageCanvas.height - this.cropRect.y - this.cropRect.height}px`;

    this.dimLeft.style.top = `${this.cropRect.y}px`;
    this.dimLeft.style.left = '0';
    this.dimLeft.style.width = `${this.cropRect.x}px`;
    this.dimLeft.style.height = `${this.cropRect.height}px`;

    this.dimRight.style.top = `${this.cropRect.y}px`;
    this.dimRight.style.left = `${this.cropRect.x + this.cropRect.width}px`;
    this.dimRight.style.width = `${this.imageCanvas.width - this.cropRect.x - this.cropRect.width}px`;
    this.dimRight.style.height = `${this.cropRect.height}px`;

    // Update crop info
    const realWidth = Math.round(this.cropRect.width / this.scale);
    const realHeight = Math.round(this.cropRect.height / this.scale);
    this.cropInfo.textContent = `${realWidth} × ${realHeight}`;

    // Update input fields
    this.cropXInput.value = Math.round(this.cropRect.x / this.scale);
    this.cropYInput.value = Math.round(this.cropRect.y / this.scale);
    this.cropWidthInput.value = realWidth;
    this.cropHeightInput.value = realHeight;
  }

  updateCropFromInputs() {
    this.cropRect.x = parseInt(this.cropXInput.value) * this.scale || 0;
    this.cropRect.y = parseInt(this.cropYInput.value) * this.scale || 0;
    this.cropRect.width = parseInt(this.cropWidthInput.value) * this.scale || 100;
    this.cropRect.height = parseInt(this.cropHeightInput.value) * this.scale || 100;

    this.constrainCrop();
    this.updateCropUI();
  }

  cropImage() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Calculate actual crop coordinates on original image
    const x = this.cropRect.x / this.scale;
    const y = this.cropRect.y / this.scale;
    const width = this.cropRect.width / this.scale;
    const height = this.cropRect.height / this.scale;

    // Create cropped canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(
      this.originalImage,
      x, y, width, height,
      0, 0, width, height
    );

    // Show preview
    this.previewImage.src = croppedCanvas.toDataURL('image/png');
    this.previewInfo.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;

    this.showStatus('裁切完成！', 'success');
  }

  downloadImage() {
    if (!this.previewImage.src) {
      this.showStatus('請先執行裁切', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `cropped_${Date.now()}.png`;
    link.href = this.previewImage.src;
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.aspectRatio = null;
    this.cropRect = { x: 0, y: 0, width: 100, height: 100 };

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.editorSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset ratio buttons
    this.ratioButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratio === 'free');
    });

    // Clear canvas
    this.ctx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);

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
  new ImageScreenshot();
});
