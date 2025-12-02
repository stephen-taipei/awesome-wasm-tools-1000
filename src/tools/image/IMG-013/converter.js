/**
 * IMG-013: Lossy Image Compression
 *
 * Significantly reduces file size by adjusting quality.
 * Supports JPG and WebP output with quality preview.
 *
 * Technical Implementation:
 * 1. Load image and render to canvas
 * 2. Apply quality setting during export
 * 3. Show real-time preview of compression result
 *
 * Features:
 * - Quality slider (1-100%)
 * - Preset quality options
 * - JPG and WebP output formats
 * - Real-time file size estimation
 *
 * Performance: 1-3 seconds, saves 60-90% typically
 */

class LossyCompressor {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.quality = 0.80;
    this.outputFormat = 'jpg';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
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
    this.originalSizeInfo = document.getElementById('originalSizeInfo');
    this.compressedSizeInfo = document.getElementById('compressedSizeInfo');
    this.savedSpace = document.getElementById('savedSpace');
    this.compressionRatio = document.getElementById('compressionRatio');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

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

    this.outputFormatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
    });

    this.qualitySlider.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      this.qualityValue.textContent = `${e.target.value}%`;
      this.updatePresetButtons(parseInt(e.target.value));
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quality = parseInt(e.target.dataset.quality);
        this.quality = quality / 100;
        this.qualitySlider.value = quality;
        this.qualityValue.textContent = `${quality}%`;
        this.updatePresetButtons(quality);
      });
    });

    this.convertBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresetButtons(quality) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const btnQuality = parseInt(btn.dataset.quality);
      btn.classList.toggle('active', btnQuality === quality);
    });
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    if (!file.type.match('image/(png|jpeg|webp)')) {
      this.showStatus('error', '請選擇 PNG、JPG 或 WebP 格式的圖片');
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
    };
    reader.readAsDataURL(file);
  }

  async compress() {
    if (!this.originalFile) {
      this.showStatus('error', '請先選擇圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;

    try {
      this.updateProgress(20, '讀取圖片...');

      const img = await this.loadImage(this.originalFile);

      this.updateProgress(40, '處理中...');

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Fill white background for JPG (no transparency)
      if (this.outputFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      this.updateProgress(60, `壓縮為 ${this.outputFormat.toUpperCase()}...`);

      const mimeType = this.outputFormat === 'jpg' ? 'image/jpeg' : 'image/webp';
      this.convertedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, this.quality);
      });

      this.updateProgress(90, '完成中...');

      // Show preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      this.convertedImage.src = convertedUrl;
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);

      // Calculate stats
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const savedBytes = this.originalFile.size - this.convertedBlob.size;
      const savedPercent = ((savedBytes / this.originalFile.size) * 100).toFixed(1);
      const ratio = (this.originalFile.size / this.convertedBlob.size).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSizeInfo.textContent = this.formatFileSize(this.originalFile.size);
      this.compressedSizeInfo.textContent = this.formatFileSize(this.convertedBlob.size);
      this.savedSpace.textContent = savedBytes > 0
        ? `${this.formatFileSize(savedBytes)} (${savedPercent}%)`
        : '無節省';
      this.compressionRatio.textContent = `${ratio}:1`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '有損壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
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

    const originalName = this.originalFile.name.replace(/\.[^.]+$/, '');
    const extension = this.outputFormat;
    const qualityStr = Math.round(this.quality * 100);
    const filename = `${originalName}_q${qualityStr}.${extension}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.originalFile = null;
    this.convertedBlob = null;

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

    this.outputFormatSelect.value = 'jpg';
    this.outputFormat = 'jpg';
    this.qualitySlider.value = 80;
    this.qualityValue.textContent = '80%';
    this.quality = 0.80;
    this.updatePresetButtons(80);
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

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

document.addEventListener('DOMContentLoaded', () => {
  window.converter = new LossyCompressor();
});

export default LossyCompressor;
