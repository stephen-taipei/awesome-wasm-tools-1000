/**
 * IMG-001: PNG to JPG Converter
 *
 * Uses Canvas API to convert PNG images to JPG format with adjustable quality.
 * All processing is done locally in the browser - no server upload required.
 *
 * Technical Implementation:
 * 1. Load PNG image into an Image element
 * 2. Draw the image onto a Canvas element
 * 3. Use canvas.toBlob() to export as JPEG with specified quality
 * 4. Handle transparency by filling with white background
 *
 * Performance Characteristics:
 * - Memory: ~3x original image size
 * - Processing time: <1 second for most images
 * - Supports images up to 50MB (browser memory dependent)
 */

class PngToJpgConverter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.quality = 0.92;

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

    this.bindEvents();
  }

  bindEvents() {
    // File upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop events
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    // Quality slider
    this.qualitySlider.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      this.qualityValue.textContent = `${e.target.value}%`;
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    // Validate file type
    if (!file.type.match('image/png')) {
      this.showStatus('error', window.t ? window.t('invalid_format') : '請選擇 PNG 格式的圖片');
      return;
    }

    this.originalFile = file;
    this.showPreview(file);
    this.convertBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImage.src = e.target.result;
      this.originalSize.textContent = this.formatFileSize(file.size);
      this.previewArea.style.display = 'grid';

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        this.imageResolution.textContent = `${img.width} × ${img.height} px`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async convert() {
    if (!this.originalFile) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇 PNG 圖片');
      return;
    }

    const startTime = performance.now();

    // Show progress
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;

    try {
      // Simulate progress for UX
      this.updateProgress(20, window.t ? window.t('converting') : '讀取圖片...');

      // Load image
      const img = await this.loadImage(this.originalFile);
      this.updateProgress(40, '處理中...');

      // Create canvas and draw image with white background (for transparency)
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');

      // Fill white background (PNG transparency -> white)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0);
      this.updateProgress(60, '編碼 JPG...');

      // Convert to JPEG blob
      this.convertedBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Conversion failed'));
          },
          'image/jpeg',
          this.quality
        );
      });

      this.updateProgress(90, '完成中...');

      // Show converted preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      this.convertedImage.src = convertedUrl;
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);

      // Calculate performance metrics
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.convertedBlob.size / this.originalFile.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.compressionRatio.textContent = compressionPercent > 0
        ? `${compressionPercent}% ${window.t ? window.t('reduction') : '減少'}`
        : `${Math.abs(compressionPercent)}% 增加`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, window.t ? window.t('convert_success') : '轉換完成！');

      // Show success and buttons
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', window.t ? window.t('convert_success') : '轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', window.t ? window.t('convert_error') : '轉換失敗，請重試');
      this.convertBtn.disabled = false;
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
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.png$/i, '');
    const filename = `${originalName}.jpg`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  reset() {
    // Clear file input
    this.fileInput.value = '';
    this.originalFile = null;
    this.convertedBlob = null;

    // Reset UI
    this.originalImage.src = '';
    this.convertedImage.src = '';
    this.originalSize.textContent = '-';
    this.convertedSize.textContent = '-';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    // Reset quality
    this.qualitySlider.value = 92;
    this.qualityValue.textContent = '92%';
    this.quality = 0.92;
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

    // Auto hide success messages
    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.classList.remove('active');
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

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new PngToJpgConverter();
});

export default PngToJpgConverter;
