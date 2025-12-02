/**
 * IMG-019 圖片翻轉
 * 水平或垂直翻轉圖片，製作鏡像效果
 */

class ImageFlipper {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.flipPanel = document.getElementById('flipPanel');
    this.flipPreviewArea = document.getElementById('flipPreviewArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Preview elements
    this.previewImage = document.getElementById('previewImage');
    this.flipStatus = document.getElementById('flipStatus');
    this.flipBadges = document.getElementById('flipBadges');

    // Flip buttons
    this.flipHorizontalBtn = document.getElementById('flipHorizontal');
    this.flipVerticalBtn = document.getElementById('flipVertical');
    this.flipBothBtn = document.getElementById('flipBoth');
    this.outputFormatSelect = document.getElementById('outputFormat');

    // Info displays
    this.originalSizeSpan = document.getElementById('originalSize');
    this.convertedSizeSpan = document.getElementById('convertedSize');
    this.flipDirectionInfoSpan = document.getElementById('flipDirectionInfo');
    this.dimensionsInfoSpan = document.getElementById('dimensionsInfo');
    this.processTimeSpan = document.getElementById('processTime');

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

    // Flip buttons
    this.flipHorizontalBtn.addEventListener('click', () => {
      this.flipHorizontal = !this.flipHorizontal;
      this.flipHorizontalBtn.classList.toggle('active', this.flipHorizontal);
      this.flipBothBtn.classList.remove('active');
      this.updateFlipStatus();
      this.updatePreview();
    });

    this.flipVerticalBtn.addEventListener('click', () => {
      this.flipVertical = !this.flipVertical;
      this.flipVerticalBtn.classList.toggle('active', this.flipVertical);
      this.flipBothBtn.classList.remove('active');
      this.updateFlipStatus();
      this.updatePreview();
    });

    this.flipBothBtn.addEventListener('click', () => {
      this.flipHorizontal = true;
      this.flipVertical = true;
      this.flipHorizontalBtn.classList.add('active');
      this.flipVerticalBtn.classList.add('active');
      this.flipBothBtn.classList.add('active');
      this.updateFlipStatus();
      this.updatePreview();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.flip());
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
    this.originalSizeSpan.textContent = this.formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.previewImage.src = e.target.result;
        document.getElementById('originalImage').src = e.target.result;
        this.flipPanel.style.display = 'block';
        this.flipPreviewArea.style.display = 'block';
        this.convertBtn.disabled = false;

        // Reset flip state
        this.flipHorizontal = false;
        this.flipVertical = false;
        this.flipHorizontalBtn.classList.remove('active');
        this.flipVerticalBtn.classList.remove('active');
        this.flipBothBtn.classList.remove('active');
        this.updateFlipStatus();
        this.updatePreview();

        this.showStatus('success', '圖片載入成功，請選擇翻轉方向');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateFlipStatus() {
    if (!this.flipHorizontal && !this.flipVertical) {
      this.flipStatus.style.display = 'none';
      return;
    }

    this.flipStatus.style.display = 'block';
    let badges = '';
    if (this.flipHorizontal) {
      badges += '<span class="badge">水平翻轉</span>';
    }
    if (this.flipVertical) {
      badges += '<span class="badge">垂直翻轉</span>';
    }
    this.flipBadges.innerHTML = badges;
  }

  updatePreview() {
    if (!this.previewImage) return;

    let transform = '';
    if (this.flipHorizontal) transform += 'scaleX(-1) ';
    if (this.flipVertical) transform += 'scaleY(-1) ';
    this.previewImage.style.transform = transform.trim() || 'none';
  }

  async flip() {
    if (!this.originalImage) return;

    if (!this.flipHorizontal && !this.flipVertical) {
      this.showStatus('error', '請至少選擇一個翻轉方向');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在翻轉圖片...');

    try {
      this.updateProgress(30, '建立畫布...');

      const width = this.originalImage.naturalWidth;
      const height = this.originalImage.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '翻轉圖片...');

      // Apply flip transformations
      ctx.translate(
        this.flipHorizontal ? width : 0,
        this.flipVertical ? height : 0
      );
      ctx.scale(
        this.flipHorizontal ? -1 : 1,
        this.flipVertical ? -1 : 1
      );
      ctx.drawImage(this.originalImage, 0, 0);

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
      const endTime = performance.now();

      this.updateProgress(100, '翻轉完成！');

      // Update UI
      document.getElementById('convertedImage').src = URL.createObjectURL(blob);
      this.convertedSizeSpan.textContent = this.formatFileSize(blob.size);
      this.previewArea.style.display = 'flex';

      // Performance info
      let direction = [];
      if (this.flipHorizontal) direction.push('水平');
      if (this.flipVertical) direction.push('垂直');
      this.flipDirectionInfoSpan.textContent = direction.join(' + ');
      this.dimensionsInfoSpan.textContent = `${width} × ${height} px`;
      this.processTimeSpan.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.performanceInfo.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `翻轉完成！方向：${direction.join(' + ')}`);

    } catch (error) {
      this.showStatus('error', `翻轉失敗：${error.message}`);
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
    let suffix = '';
    if (this.flipHorizontal && this.flipVertical) {
      suffix = '_flip_both';
    } else if (this.flipHorizontal) {
      suffix = '_flip_h';
    } else if (this.flipVertical) {
      suffix = '_flip_v';
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}${suffix}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.fileInput.value = '';
    this.flipPanel.style.display = 'none';
    this.flipPreviewArea.style.display = 'none';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.flipHorizontalBtn.classList.remove('active');
    this.flipVerticalBtn.classList.remove('active');
    this.flipBothBtn.classList.remove('active');
    this.flipStatus.style.display = 'none';
    this.previewImage.style.transform = 'none';
    this.originalSizeSpan.textContent = '-';
    this.convertedSizeSpan.textContent = '-';
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
  new ImageFlipper();
});
