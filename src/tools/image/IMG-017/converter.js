/**
 * IMG-017 圖片裁切
 * 裁切圖片指定區域，支援自由裁切與比例裁切
 */

class ImageCropper {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.displayScale = 1;

    // Crop box state
    this.cropBox = { x: 0, y: 0, width: 100, height: 100 };
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.dragStart = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.cropArea = document.getElementById('cropArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Crop elements
    this.cropContainer = document.getElementById('cropContainer');
    this.cropImage = document.getElementById('cropImage');
    this.cropBoxEl = document.getElementById('cropBox');
    this.cropInfo = document.getElementById('cropInfo');

    // Settings
    this.aspectRatioSelect = document.getElementById('aspectRatio');
    this.outputFormatSelect = document.getElementById('outputFormat');

    // Info displays
    this.convertedSizeSpan = document.getElementById('convertedSize');
    this.convertedDimensionsSpan = document.getElementById('convertedDimensions');
    this.originalDimensionsInfoSpan = document.getElementById('originalDimensionsInfo');
    this.cropDimensionsInfoSpan = document.getElementById('cropDimensionsInfo');
    this.cropRegionInfoSpan = document.getElementById('cropRegionInfo');

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

    // Aspect ratio change
    this.aspectRatioSelect.addEventListener('change', () => this.updateCropBoxAspect());

    // Crop box interactions
    this.cropBoxEl.addEventListener('mousedown', (e) => this.onCropMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onCropMouseMove(e));
    document.addEventListener('mouseup', () => this.onCropMouseUp());

    // Touch support
    this.cropBoxEl.addEventListener('touchstart', (e) => this.onCropTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onCropTouchMove(e));
    document.addEventListener('touchend', () => this.onCropMouseUp());

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.crop());
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
        this.imageWidth = img.naturalWidth;
        this.imageHeight = img.naturalHeight;

        // Set crop image
        this.cropImage.src = e.target.result;
        this.cropImage.onload = () => {
          // Calculate display scale
          const containerWidth = this.cropContainer.clientWidth || 600;
          this.displayScale = Math.min(1, containerWidth / this.imageWidth);

          // Initialize crop box
          this.initCropBox();
          this.cropArea.style.display = 'block';
          this.convertBtn.disabled = false;
          this.showStatus('success', '圖片載入成功，請拖曳選取裁切區域');
        };
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initCropBox() {
    // Default: center crop at 50% of image
    const size = Math.min(this.imageWidth, this.imageHeight) * 0.5;
    this.cropBox = {
      x: (this.imageWidth - size) / 2,
      y: (this.imageHeight - size) / 2,
      width: size,
      height: size
    };
    this.updateCropBoxAspect();
    this.updateCropBoxUI();
  }

  updateCropBoxAspect() {
    const ratio = this.aspectRatioSelect.value;
    if (ratio === 'free') return;

    const [w, h] = ratio.split(':').map(Number);
    const aspectRatio = w / h;

    // Adjust crop box to match aspect ratio
    const currentArea = this.cropBox.width * this.cropBox.height;
    const newWidth = Math.sqrt(currentArea * aspectRatio);
    const newHeight = newWidth / aspectRatio;

    // Keep centered
    const centerX = this.cropBox.x + this.cropBox.width / 2;
    const centerY = this.cropBox.y + this.cropBox.height / 2;

    this.cropBox.width = Math.min(newWidth, this.imageWidth);
    this.cropBox.height = Math.min(newHeight, this.imageHeight);
    this.cropBox.x = Math.max(0, Math.min(centerX - this.cropBox.width / 2, this.imageWidth - this.cropBox.width));
    this.cropBox.y = Math.max(0, Math.min(centerY - this.cropBox.height / 2, this.imageHeight - this.cropBox.height));

    this.updateCropBoxUI();
  }

  updateCropBoxUI() {
    const scale = this.displayScale;
    this.cropBoxEl.style.left = `${this.cropBox.x * scale}px`;
    this.cropBoxEl.style.top = `${this.cropBox.y * scale}px`;
    this.cropBoxEl.style.width = `${this.cropBox.width * scale}px`;
    this.cropBoxEl.style.height = `${this.cropBox.height * scale}px`;

    // Update info
    this.cropInfo.textContent = `${Math.round(this.cropBox.width)} × ${Math.round(this.cropBox.height)}`;
  }

  onCropMouseDown(e) {
    e.preventDefault();
    const handle = e.target.dataset.handle;

    if (handle) {
      this.isResizing = true;
      this.resizeHandle = handle;
    } else {
      this.isDragging = true;
    }

    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      cropX: this.cropBox.x,
      cropY: this.cropBox.y,
      cropW: this.cropBox.width,
      cropH: this.cropBox.height
    };
  }

  onCropTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.onCropMouseDown({
        preventDefault: () => e.preventDefault(),
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: e.target
      });
    }
  }

  onCropMouseMove(e) {
    if (!this.isDragging && !this.isResizing) return;

    const dx = (e.clientX - this.dragStart.x) / this.displayScale;
    const dy = (e.clientY - this.dragStart.y) / this.displayScale;

    if (this.isDragging) {
      // Move crop box
      let newX = this.dragStart.cropX + dx;
      let newY = this.dragStart.cropY + dy;

      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, this.imageWidth - this.cropBox.width));
      newY = Math.max(0, Math.min(newY, this.imageHeight - this.cropBox.height));

      this.cropBox.x = newX;
      this.cropBox.y = newY;
    } else if (this.isResizing) {
      this.handleResize(dx, dy);
    }

    this.updateCropBoxUI();
  }

  onCropTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.onCropMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }

  handleResize(dx, dy) {
    const ratio = this.aspectRatioSelect.value;
    const locked = ratio !== 'free';
    let aspectRatio = locked ? parseFloat(ratio.split(':')[0]) / parseFloat(ratio.split(':')[1]) : null;

    let newX = this.dragStart.cropX;
    let newY = this.dragStart.cropY;
    let newW = this.dragStart.cropW;
    let newH = this.dragStart.cropH;

    switch (this.resizeHandle) {
      case 'se':
        newW = Math.max(20, this.dragStart.cropW + dx);
        newH = locked ? newW / aspectRatio : Math.max(20, this.dragStart.cropH + dy);
        break;
      case 'sw':
        newW = Math.max(20, this.dragStart.cropW - dx);
        newH = locked ? newW / aspectRatio : Math.max(20, this.dragStart.cropH + dy);
        newX = this.dragStart.cropX + this.dragStart.cropW - newW;
        break;
      case 'ne':
        newW = Math.max(20, this.dragStart.cropW + dx);
        newH = locked ? newW / aspectRatio : Math.max(20, this.dragStart.cropH - dy);
        newY = this.dragStart.cropY + this.dragStart.cropH - newH;
        break;
      case 'nw':
        newW = Math.max(20, this.dragStart.cropW - dx);
        newH = locked ? newW / aspectRatio : Math.max(20, this.dragStart.cropH - dy);
        newX = this.dragStart.cropX + this.dragStart.cropW - newW;
        newY = this.dragStart.cropY + this.dragStart.cropH - newH;
        break;
    }

    // Constrain to image bounds
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    newW = Math.min(newW, this.imageWidth - newX);
    newH = Math.min(newH, this.imageHeight - newY);

    this.cropBox.x = newX;
    this.cropBox.y = newY;
    this.cropBox.width = newW;
    this.cropBox.height = newH;
  }

  onCropMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  async crop() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在裁切圖片...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(this.cropBox.width);
      canvas.height = Math.round(this.cropBox.height);
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '裁切圖片...');

      ctx.drawImage(
        this.originalImage,
        Math.round(this.cropBox.x),
        Math.round(this.cropBox.y),
        Math.round(this.cropBox.width),
        Math.round(this.cropBox.height),
        0,
        0,
        canvas.width,
        canvas.height
      );

      this.updateProgress(70, '輸出圖片...');

      // Get output format
      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        mimeType = this.originalFile.type;
        ext = this.originalFile.name.split('.').pop();
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

      this.updateProgress(100, '裁切完成！');

      // Update UI
      document.getElementById('convertedImage').src = URL.createObjectURL(blob);
      this.convertedSizeSpan.textContent = this.formatFileSize(blob.size);
      this.convertedDimensionsSpan.textContent = `${canvas.width} × ${canvas.height} px`;
      this.previewArea.style.display = 'flex';

      // Performance info
      this.originalDimensionsInfoSpan.textContent = `${this.imageWidth} × ${this.imageHeight} px`;
      this.cropDimensionsInfoSpan.textContent = `${canvas.width} × ${canvas.height} px`;
      this.cropRegionInfoSpan.textContent = `(${Math.round(this.cropBox.x)}, ${Math.round(this.cropBox.y)}) - (${Math.round(this.cropBox.x + this.cropBox.width)}, ${Math.round(this.cropBox.y + this.cropBox.height)})`;
      this.performanceInfo.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `裁切完成！新尺寸：${canvas.width} × ${canvas.height} px`);

    } catch (error) {
      this.showStatus('error', `裁切失敗：${error.message}`);
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

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_cropped.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.fileInput.value = '';
    this.cropArea.style.display = 'none';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.convertedSizeSpan.textContent = '-';
    this.convertedDimensionsSpan.textContent = '-';
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
  new ImageCropper();
});
