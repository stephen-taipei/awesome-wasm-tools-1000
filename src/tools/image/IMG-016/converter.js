/**
 * IMG-016 圖片縮放
 * 調整圖片尺寸，支援等比例與自訂尺寸
 */

class ImageResizer {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.aspectRatio = 1;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Settings
    this.resizeModeSelect = document.getElementById('resizeMode');
    this.percentageSettings = document.getElementById('percentageSettings');
    this.dimensionSettings = document.getElementById('dimensionSettings');
    this.percentageSlider = document.getElementById('percentageSlider');
    this.percentageValue = document.getElementById('percentageValue');
    this.widthInput = document.getElementById('widthInput');
    this.heightInput = document.getElementById('heightInput');
    this.lockAspectCheckbox = document.getElementById('lockAspect');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.presetButtons = document.querySelectorAll('.preset-btn');

    // Info displays
    this.originalSizeSpan = document.getElementById('originalSize');
    this.convertedSizeSpan = document.getElementById('convertedSize');
    this.originalDimensionsSpan = document.getElementById('originalDimensions');
    this.convertedDimensionsSpan = document.getElementById('convertedDimensions');
    this.processTimeSpan = document.getElementById('processTime');
    this.originalDimensionsInfoSpan = document.getElementById('originalDimensionsInfo');
    this.newDimensionsInfoSpan = document.getElementById('newDimensionsInfo');
    this.scaleRatioSpan = document.getElementById('scaleRatio');

    this.bindEvents();
    this.updateModeUI();
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

    // Mode change
    this.resizeModeSelect.addEventListener('change', () => this.updateModeUI());

    // Percentage slider
    this.percentageSlider.addEventListener('input', () => {
      this.percentageValue.textContent = `${this.percentageSlider.value}%`;
    });

    // Dimension inputs with aspect ratio lock
    this.widthInput.addEventListener('input', () => {
      if (this.lockAspectCheckbox.checked && this.originalImage) {
        const width = parseInt(this.widthInput.value) || 0;
        this.heightInput.value = Math.round(width / this.aspectRatio);
      }
    });
    this.heightInput.addEventListener('input', () => {
      if (this.lockAspectCheckbox.checked && this.originalImage) {
        const height = parseInt(this.heightInput.value) || 0;
        this.widthInput.value = Math.round(height * this.aspectRatio);
      }
    });

    // Preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.widthInput.value = btn.dataset.width;
        this.heightInput.value = btn.dataset.height;
        if (this.resizeModeSelect.value !== 'dimensions') {
          this.resizeModeSelect.value = 'dimensions';
          this.updateModeUI();
        }
      });
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.resize());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateModeUI() {
    const mode = this.resizeModeSelect.value;

    if (mode === 'percentage') {
      this.percentageSettings.style.display = 'flex';
      this.dimensionSettings.style.display = 'none';
    } else {
      this.percentageSettings.style.display = 'none';
      this.dimensionSettings.style.display = 'block';
    }

    // Show/hide height input based on mode
    const heightRow = this.heightInput.closest('.setting-row');
    if (mode === 'width') {
      heightRow.style.display = 'none';
    } else if (mode === 'height') {
      this.widthInput.closest('.setting-row').style.display = 'none';
      heightRow.style.display = 'flex';
    } else {
      this.widthInput.closest('.setting-row').style.display = 'flex';
      heightRow.style.display = 'flex';
    }
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
        this.originalWidth = img.naturalWidth;
        this.originalHeight = img.naturalHeight;
        this.aspectRatio = this.originalWidth / this.originalHeight;

        document.getElementById('originalImage').src = e.target.result;
        this.originalDimensionsSpan.textContent = `${this.originalWidth} × ${this.originalHeight} px`;

        // Set default dimensions
        this.widthInput.value = this.originalWidth;
        this.heightInput.value = this.originalHeight;

        this.previewArea.style.display = 'flex';
        this.convertBtn.disabled = false;
        this.showStatus('success', '圖片載入成功，請設定縮放參數後點擊縮放');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getTargetDimensions() {
    const mode = this.resizeModeSelect.value;
    let newWidth, newHeight;

    switch (mode) {
      case 'percentage':
        const scale = parseInt(this.percentageSlider.value) / 100;
        newWidth = Math.round(this.originalWidth * scale);
        newHeight = Math.round(this.originalHeight * scale);
        break;

      case 'dimensions':
        newWidth = parseInt(this.widthInput.value) || this.originalWidth;
        newHeight = parseInt(this.heightInput.value) || this.originalHeight;
        break;

      case 'width':
        newWidth = parseInt(this.widthInput.value) || this.originalWidth;
        newHeight = Math.round(newWidth / this.aspectRatio);
        break;

      case 'height':
        newHeight = parseInt(this.heightInput.value) || this.originalHeight;
        newWidth = Math.round(newHeight * this.aspectRatio);
        break;

      default:
        newWidth = this.originalWidth;
        newHeight = this.originalHeight;
    }

    // Clamp dimensions
    newWidth = Math.max(1, Math.min(8192, newWidth));
    newHeight = Math.max(1, Math.min(8192, newHeight));

    return { width: newWidth, height: newHeight };
  }

  async resize() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在縮放圖片...');

    try {
      const { width, height } = this.getTargetDimensions();

      this.updateProgress(30, '建立畫布...');

      // Create canvas with high quality
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Use high quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0, width, height);

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

      this.updateProgress(100, '縮放完成！');

      // Update UI
      document.getElementById('convertedImage').src = URL.createObjectURL(blob);
      this.convertedSizeSpan.textContent = this.formatFileSize(blob.size);
      this.convertedDimensionsSpan.textContent = `${width} × ${height} px`;

      // Performance info
      const scaleX = (width / this.originalWidth * 100).toFixed(1);
      const scaleY = (height / this.originalHeight * 100).toFixed(1);

      this.processTimeSpan.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.originalDimensionsInfoSpan.textContent = `${this.originalWidth} × ${this.originalHeight} px`;
      this.newDimensionsInfoSpan.textContent = `${width} × ${height} px`;
      this.scaleRatioSpan.textContent = `${scaleX}% × ${scaleY}%`;
      this.performanceInfo.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `縮放完成！新尺寸：${width} × ${height} px`);

    } catch (error) {
      this.showStatus('error', `縮放失敗：${error.message}`);
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
    const { width, height } = this.getTargetDimensions();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_${width}x${height}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.fileInput.value = '';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.originalSizeSpan.textContent = '-';
    this.convertedSizeSpan.textContent = '-';
    this.originalDimensionsSpan.textContent = '-';
    this.convertedDimensionsSpan.textContent = '-';
    this.percentageSlider.value = 100;
    this.percentageValue.textContent = '100%';
    this.widthInput.value = 800;
    this.heightInput.value = 600;
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
  new ImageResizer();
});
