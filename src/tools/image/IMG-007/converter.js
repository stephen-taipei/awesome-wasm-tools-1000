/**
 * IMG-007: BMP Converter
 *
 * Converts BMP (Bitmap) images to other formats (PNG, JPG, WebP).
 * All processing is done locally in the browser using Canvas API.
 *
 * Technical Implementation:
 * 1. Load BMP image into an Image element (browser handles BMP decoding)
 * 2. Draw the image onto a Canvas element
 * 3. Use canvas.toBlob() to export in the selected format
 * 4. Handle different bit depths and transparency
 *
 * BMP Format Details:
 * - Supports 1, 4, 8, 16, 24, and 32-bit color depths
 * - 32-bit BMP can include alpha channel for transparency
 * - Uncompressed format, files are typically larger than compressed formats
 *
 * Performance Characteristics:
 * - Memory: ~3x original image size
 * - Processing time: <1 second for most images
 * - No WASM required - uses native browser Canvas API
 */

class BmpConverter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.quality = 0.92;
    this.outputFormat = 'jpg';
    this.imageInfo = null;

    this.init();
  }

  init() {
    // DOM Elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.qualityRow = document.getElementById('qualityRow');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadBtnText = document.getElementById('downloadBtnText');
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
    this.bitDepth = document.getElementById('bitDepth');

    this.bindEvents();
    this.updateQualityVisibility();
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

    // Output format selection
    this.outputFormatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.updateQualityVisibility();
      this.updateDownloadButtonText();
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

  updateQualityVisibility() {
    // PNG is lossless, no quality setting needed
    if (this.outputFormat === 'png') {
      this.qualityRow.style.display = 'none';
    } else {
      this.qualityRow.style.display = 'flex';
    }
  }

  updateDownloadButtonText() {
    const formatNames = {
      'png': 'PNG',
      'jpg': 'JPG',
      'webp': 'WebP'
    };
    this.downloadBtnText.textContent = `下載 ${formatNames[this.outputFormat]}`;
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    // Validate file type - accept BMP
    const isBmp = file.type === 'image/bmp' ||
                  file.type === 'image/x-bmp' ||
                  file.type === 'image/x-ms-bmp' ||
                  file.name.toLowerCase().endsWith('.bmp');

    if (!isBmp) {
      this.showStatus('error', window.t ? window.t('invalid_format') : '請選擇 BMP 格式的圖片');
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

      // Get image dimensions and analyze BMP
      const img = new Image();
      img.onload = () => {
        this.imageResolution.textContent = `${img.width} × ${img.height} px`;
        this.imageInfo = {
          width: img.width,
          height: img.height
        };

        // Estimate bit depth from file size
        const estimatedBitDepth = this.estimateBitDepth(file.size, img.width, img.height);
        this.bitDepth.textContent = estimatedBitDepth;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  estimateBitDepth(fileSize, width, height) {
    // BMP header is typically 54-138 bytes
    const headerSize = 54;
    const pixelDataSize = fileSize - headerSize;
    const pixelCount = width * height;

    if (pixelCount === 0) return '未知';

    const bitsPerPixel = (pixelDataSize * 8) / pixelCount;

    // Round to nearest standard bit depth
    if (bitsPerPixel <= 1.5) return '1 位元 (黑白)';
    if (bitsPerPixel <= 5) return '4 位元 (16 色)';
    if (bitsPerPixel <= 10) return '8 位元 (256 色)';
    if (bitsPerPixel <= 20) return '16 位元 (高彩)';
    if (bitsPerPixel <= 28) return '24 位元 (全彩)';
    return '32 位元 (含透明)';
  }

  async convert() {
    if (!this.originalFile) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇 BMP 圖片');
      return;
    }

    const startTime = performance.now();

    // Show progress
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;

    try {
      // Update progress
      this.updateProgress(20, '讀取 BMP 圖片...');

      // Load image
      const img = await this.loadImage(this.originalFile);
      this.updateProgress(40, '處理中...');

      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');

      // For JPG output, fill white background (no transparency support)
      if (this.outputFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw the image
      ctx.drawImage(img, 0, 0);
      this.updateProgress(60, `編碼 ${this.outputFormat.toUpperCase()}...`);

      // Convert to target format
      const mimeType = this.getMimeType(this.outputFormat);
      const quality = this.outputFormat === 'png' ? undefined : this.quality;

      this.convertedBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Conversion failed'));
          },
          mimeType,
          quality
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
      const sizeChange = ((1 - this.convertedBlob.size / this.originalFile.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.compressionRatio.textContent = sizeChange > 0
        ? `${sizeChange}% 減少`
        : `${Math.abs(sizeChange)}% 增加`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '轉換完成！');
      this.updateDownloadButtonText();

      // Show success and buttons
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗，請確認檔案為有效的 BMP 格式');
      this.convertBtn.disabled = false;
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'webp': 'image/webp'
    };
    return mimeTypes[format] || 'image/png';
  }

  getFileExtension(format) {
    return format === 'jpg' ? 'jpg' : format;
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load BMP image'));
      img.src = URL.createObjectURL(file);
    });
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.bmp$/i, '');
    const extension = this.getFileExtension(this.outputFormat);
    const filename = `${originalName}.${extension}`;

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
    this.imageInfo = null;

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

    // Reset settings
    this.outputFormatSelect.value = 'jpg';
    this.outputFormat = 'jpg';
    this.qualitySlider.value = 92;
    this.qualityValue.textContent = '92%';
    this.quality = 0.92;
    this.updateQualityVisibility();
    this.bitDepth.textContent = '-';
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
  window.converter = new BmpConverter();
});

export default BmpConverter;
