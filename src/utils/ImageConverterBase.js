/**
 * ImageConverter Base Module
 *
 * Shared functionality for image format conversion tools.
 * Provides common methods for file handling, preview, progress, and download.
 */

export class ImageConverterBase {
  constructor(config) {
    this.config = {
      inputFormats: config.inputFormats || ['image/*'],
      outputFormat: config.outputFormat || 'image/png',
      outputExtension: config.outputExtension || 'png',
      defaultQuality: config.defaultQuality || 0.92,
      showQuality: config.showQuality !== false,
      fillBackground: config.fillBackground || null, // null = transparent, '#FFFFFF' = white
      ...config
    };

    this.originalFile = null;
    this.convertedBlob = null;
    this.quality = this.config.defaultQuality;

    this.init();
  }

  init() {
    // DOM Elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.originalImage = document.getElementById('originalImage');
    this.convertedImage = document.getElementById('convertedImage');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.compressionRatio = document.getElementById('compressionRatio');
    this.imageResolution = document.getElementById('imageResolution');

    // Hide quality slider if not needed
    if (!this.config.showQuality && this.qualitySlider) {
      this.qualitySlider.closest('.setting-row')?.style.setProperty('display', 'none');
    }

    this.bindEvents();
  }

  bindEvents() {
    // File upload events
    this.uploadArea?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop events
    this.uploadArea?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea?.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    // Quality slider
    this.qualitySlider?.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      if (this.qualityValue) {
        this.qualityValue.textContent = `${e.target.value}%`;
      }
    });

    // Action buttons
    this.convertBtn?.addEventListener('click', () => this.convert());
    this.downloadBtn?.addEventListener('click', () => this.download());
    this.resetBtn?.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  validateFile(file) {
    const validTypes = this.config.inputFormats;
    const isValid = validTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });
    return isValid;
  }

  processFile(file) {
    if (!this.validateFile(file)) {
      this.showStatus('error', window.t ? window.t('invalid_format') : '不支援的檔案格式');
      return;
    }

    this.originalFile = file;
    this.showPreview(file);
    if (this.convertBtn) this.convertBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.originalImage) this.originalImage.src = e.target.result;
      if (this.originalSize) this.originalSize.textContent = this.formatFileSize(file.size);
      if (this.previewArea) this.previewArea.style.display = 'grid';

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        if (this.imageResolution) {
          this.imageResolution.textContent = `${img.width} × ${img.height} px`;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async convert() {
    if (!this.originalFile) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇圖片');
      return;
    }

    const startTime = performance.now();

    // Show progress
    this.progressContainer?.classList.add('active');
    if (this.progressFill) this.progressFill.style.width = '0%';
    if (this.convertBtn) this.convertBtn.disabled = true;

    try {
      this.updateProgress(20, window.t ? window.t('converting') : '讀取圖片...');

      // Load image
      const img = await this.loadImage(this.originalFile);
      this.updateProgress(40, '處理中...');

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');

      // Fill background if specified
      if (this.config.fillBackground) {
        ctx.fillStyle = this.config.fillBackground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw the image
      ctx.drawImage(img, 0, 0);
      this.updateProgress(60, '編碼中...');

      // Convert to target format
      this.convertedBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Conversion failed'));
          },
          this.config.outputFormat,
          this.config.showQuality ? this.quality : undefined
        );
      });

      this.updateProgress(90, '完成中...');

      // Show converted preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      if (this.convertedImage) this.convertedImage.src = convertedUrl;
      if (this.convertedSize) this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);

      // Calculate performance metrics
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const sizeChange = ((this.convertedBlob.size / this.originalFile.size - 1) * 100).toFixed(1);

      if (this.processTime) this.processTime.textContent = `${processingTime} 秒`;
      if (this.compressionRatio) {
        this.compressionRatio.textContent = sizeChange < 0
          ? `${Math.abs(sizeChange)}% ${window.t ? window.t('reduction') : '減少'}`
          : `${sizeChange}% 增加`;
      }
      if (this.performanceInfo) this.performanceInfo.style.display = 'block';

      this.updateProgress(100, window.t ? window.t('convert_success') : '轉換完成！');

      // Show success and buttons
      setTimeout(() => {
        this.progressContainer?.classList.remove('active');
        this.showStatus('success', window.t ? window.t('convert_success') : '轉換完成！');
        if (this.downloadBtn) this.downloadBtn.style.display = 'inline-flex';
        if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
        if (this.convertBtn) this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer?.classList.remove('active');
      this.showStatus('error', window.t ? window.t('convert_error') : '轉換失敗，請重試');
      if (this.convertBtn) this.convertBtn.disabled = false;
    }
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  updateProgress(percent, text) {
    if (this.progressFill) this.progressFill.style.width = `${percent}%`;
    if (text && this.progressText) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^.]+$/, '');
    const filename = `${originalName}.${this.config.outputExtension}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  reset() {
    if (this.fileInput) this.fileInput.value = '';
    this.originalFile = null;
    this.convertedBlob = null;

    if (this.originalImage) this.originalImage.src = '';
    if (this.convertedImage) this.convertedImage.src = '';
    if (this.originalSize) this.originalSize.textContent = '-';
    if (this.convertedSize) this.convertedSize.textContent = '-';
    if (this.previewArea) this.previewArea.style.display = 'none';
    if (this.downloadBtn) this.downloadBtn.style.display = 'none';
    if (this.resetBtn) this.resetBtn.style.display = 'none';
    if (this.performanceInfo) this.performanceInfo.style.display = 'none';
    if (this.convertBtn) this.convertBtn.disabled = true;
    this.progressContainer?.classList.remove('active');
    this.statusMessage?.classList.remove('active');

    // Reset quality
    if (this.qualitySlider) {
      this.qualitySlider.value = this.config.defaultQuality * 100;
      if (this.qualityValue) {
        this.qualityValue.textContent = `${this.config.defaultQuality * 100}%`;
      }
    }
    this.quality = this.config.defaultQuality;
  }

  showStatus(type, message) {
    if (!this.statusMessage) return;
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage?.classList.remove('active');
      }, 3000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default ImageConverterBase;
