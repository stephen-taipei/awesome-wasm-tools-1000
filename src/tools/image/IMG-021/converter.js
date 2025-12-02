/**
 * IMG-021 社群媒體尺寸裁切
 * 一鍵裁切為各社群平台最佳尺寸
 */

class SocialMediaCropper {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedPlatform = null;
    this.selectedSize = null;
    this.cropPosition = { x: 0, y: 0 };
    this.displayScale = 1;

    // Platform size presets
    this.platforms = {
      facebook: {
        name: 'Facebook',
        sizes: [
          { name: '貼文圖片', width: 1200, height: 630 },
          { name: '封面照片', width: 820, height: 312 },
          { name: '個人頭像', width: 180, height: 180 },
          { name: '活動封面', width: 1920, height: 1080 },
          { name: '限時動態', width: 1080, height: 1920 }
        ]
      },
      instagram: {
        name: 'Instagram',
        sizes: [
          { name: '方形貼文', width: 1080, height: 1080 },
          { name: '直式貼文', width: 1080, height: 1350 },
          { name: '橫式貼文', width: 1080, height: 566 },
          { name: '限時動態', width: 1080, height: 1920 },
          { name: 'Reels', width: 1080, height: 1920 }
        ]
      },
      twitter: {
        name: 'Twitter/X',
        sizes: [
          { name: '貼文圖片', width: 1200, height: 675 },
          { name: '封面照片', width: 1500, height: 500 },
          { name: '個人頭像', width: 400, height: 400 },
          { name: '卡片圖片', width: 800, height: 418 }
        ]
      },
      linkedin: {
        name: 'LinkedIn',
        sizes: [
          { name: '貼文圖片', width: 1200, height: 627 },
          { name: '封面照片', width: 1584, height: 396 },
          { name: '個人頭像', width: 400, height: 400 },
          { name: '公司標誌', width: 300, height: 300 }
        ]
      },
      youtube: {
        name: 'YouTube',
        sizes: [
          { name: '縮圖', width: 1280, height: 720 },
          { name: '頻道封面', width: 2560, height: 1440 },
          { name: '頻道頭像', width: 800, height: 800 }
        ]
      },
      tiktok: {
        name: 'TikTok',
        sizes: [
          { name: '影片封面', width: 1080, height: 1920 },
          { name: '個人頭像', width: 200, height: 200 }
        ]
      }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.platformPanel = document.getElementById('platformPanel');
    this.sizeOptionsPanel = document.getElementById('sizeOptionsPanel');
    this.sizeOptions = document.getElementById('sizeOptions');
    this.platformTitle = document.getElementById('platformTitle');
    this.cropPanel = document.getElementById('cropPanel');
    this.previewArea = document.getElementById('previewArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.platformCards = document.querySelectorAll('.platform-card');
    this.previewImage = document.getElementById('previewImage');
    this.cropFrame = document.getElementById('cropFrame');
    this.cropPreview = document.getElementById('cropPreview');
    this.targetSizeSpan = document.getElementById('targetSize');

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

    // Platform selection
    this.platformCards.forEach(card => {
      card.addEventListener('click', () => {
        this.platformCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPlatform = card.dataset.platform;
        this.showSizeOptions();
      });
    });

    // Crop frame dragging
    this.cropFrame.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.endDrag());

    // Touch support
    this.cropFrame.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) this.drag(e.touches[0]);
    });
    document.addEventListener('touchend', () => this.endDrag());

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
        this.previewImage.src = e.target.result;
        this.platformPanel.style.display = 'block';
        this.showStatus('success', '圖片載入成功，請選擇社群平台');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showSizeOptions() {
    const platform = this.platforms[this.selectedPlatform];
    this.platformTitle.textContent = `${platform.name} 尺寸選項`;

    this.sizeOptions.innerHTML = platform.sizes.map((size, index) => `
      <button class="size-option" data-index="${index}">
        ${size.name} (${size.width}×${size.height})
      </button>
    `).join('');

    this.sizeOptions.querySelectorAll('.size-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sizeOptions.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const index = parseInt(btn.dataset.index);
        this.selectedSize = platform.sizes[index];
        this.showCropPanel();
      });
    });

    this.sizeOptionsPanel.style.display = 'block';
  }

  showCropPanel() {
    this.targetSizeSpan.textContent = `${this.selectedSize.width} × ${this.selectedSize.height} px`;

    // Calculate display scale
    const containerWidth = this.cropPreview.clientWidth || 600;
    const containerHeight = 400;

    const imageWidth = this.originalImage.naturalWidth;
    const imageHeight = this.originalImage.naturalHeight;

    this.displayScale = Math.min(
      containerWidth / imageWidth,
      containerHeight / imageHeight,
      1
    );

    // Calculate crop frame size
    const targetRatio = this.selectedSize.width / this.selectedSize.height;
    const imageRatio = imageWidth / imageHeight;

    let cropWidth, cropHeight;
    if (imageRatio > targetRatio) {
      cropHeight = imageHeight;
      cropWidth = cropHeight * targetRatio;
    } else {
      cropWidth = imageWidth;
      cropHeight = cropWidth / targetRatio;
    }

    this.cropWidth = cropWidth;
    this.cropHeight = cropHeight;
    this.cropPosition = {
      x: (imageWidth - cropWidth) / 2,
      y: (imageHeight - cropHeight) / 2
    };

    this.updateCropFrame();
    this.cropPanel.style.display = 'block';
    this.convertBtn.disabled = false;
  }

  updateCropFrame() {
    const scale = this.displayScale;
    this.cropFrame.style.width = `${this.cropWidth * scale}px`;
    this.cropFrame.style.height = `${this.cropHeight * scale}px`;
    this.cropFrame.style.left = `${this.cropPosition.x * scale}px`;
    this.cropFrame.style.top = `${this.cropPosition.y * scale}px`;
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
    newX = Math.max(0, Math.min(newX, this.originalImage.naturalWidth - this.cropWidth));
    newY = Math.max(0, Math.min(newY, this.originalImage.naturalHeight - this.cropHeight));

    this.cropPosition.x = newX;
    this.cropPosition.y = newY;
    this.updateCropFrame();
  }

  endDrag() {
    this.isDragging = false;
  }

  async crop() {
    if (!this.originalImage || !this.selectedSize) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在裁切圖片...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.selectedSize.width;
      canvas.height = this.selectedSize.height;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '裁切圖片...');

      // Draw cropped and scaled image
      ctx.drawImage(
        this.originalImage,
        this.cropPosition.x,
        this.cropPosition.y,
        this.cropWidth,
        this.cropHeight,
        0,
        0,
        this.selectedSize.width,
        this.selectedSize.height
      );

      this.updateProgress(70, '輸出圖片...');

      const mimeType = this.originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const ext = mimeType === 'image/png' ? 'png' : 'jpg';
      const quality = mimeType === 'image/png' ? undefined : 0.92;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.convertedBlob = blob;
      this.outputExt = ext;

      this.updateProgress(100, '裁切完成！');

      // Update UI
      document.getElementById('convertedImage').src = URL.createObjectURL(blob);
      document.getElementById('convertedSize').textContent = this.formatFileSize(blob.size);
      document.getElementById('convertedDimensions').textContent =
        `${this.selectedSize.width} × ${this.selectedSize.height} px`;
      this.previewArea.style.display = 'flex';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `裁切完成！尺寸：${this.selectedSize.width} × ${this.selectedSize.height}`);

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
    const platform = this.platforms[this.selectedPlatform].name;
    const sizeName = this.selectedSize.name.replace(/\s+/g, '_');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_${platform}_${sizeName}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedPlatform = null;
    this.selectedSize = null;
    this.fileInput.value = '';
    this.platformPanel.style.display = 'none';
    this.sizeOptionsPanel.style.display = 'none';
    this.cropPanel.style.display = 'none';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.platformCards.forEach(c => c.classList.remove('selected'));
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
  new SocialMediaCropper();
});
