/**
 * IMG-004: HEIC/HEIF Converter
 *
 * Converts iPhone HEIC/HEIF photos to JPG/PNG format.
 * Uses heic2any library which includes libheif WASM for decoding.
 *
 * Technical Implementation:
 * 1. Load heic2any library (includes WASM decoder)
 * 2. Decode HEIC/HEIF to blob
 * 3. Convert to target format (JPG/PNG)
 *
 * Performance Characteristics:
 * - Memory: ~5x original image size
 * - Processing time: 2-5 seconds per image
 * - First load: ~3MB WASM module download
 */

// HEIC decoder using heic2any (includes libheif WASM)
// CDN: https://unpkg.com/heic2any

class HeicConverter {
  constructor() {
    this.originalFiles = [];
    this.convertedBlobs = [];
    this.outputFormat = 'image/jpeg';
    this.outputExtension = 'jpg';
    this.quality = 0.92;
    this.heic2any = null;
    this.isLoading = false;

    this.init();
  }

  async init() {
    // DOM Elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.qualityRow = document.getElementById('qualityRow');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadText = document.getElementById('downloadText');
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
    this.batchInfo = document.getElementById('batchInfo');
    this.fileCount = document.getElementById('fileCount');

    this.bindEvents();
  }

  bindEvents() {
    // File upload events
    this.uploadArea?.addEventListener('click', () => this.fileInput?.click());
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
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
      const files = Array.from(e.dataTransfer.files);
      this.processFiles(files);
    });

    // Format selection
    document.querySelectorAll('.format-radio').forEach(radio => {
      radio.addEventListener('click', () => {
        document.querySelectorAll('.format-radio').forEach(r => r.classList.remove('active'));
        radio.classList.add('active');
        const format = radio.dataset.format;
        this.setOutputFormat(format);
      });
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

  setOutputFormat(format) {
    if (format === 'png') {
      this.outputFormat = 'image/png';
      this.outputExtension = 'png';
      this.qualityRow.style.display = 'none';
    } else {
      this.outputFormat = 'image/jpeg';
      this.outputExtension = 'jpg';
      this.qualityRow.style.display = 'flex';
    }
    this.updateDownloadText();
  }

  updateDownloadText() {
    if (!this.downloadText) return;
    const ext = this.outputExtension.toUpperCase();
    const count = this.convertedBlobs.length;
    if (count > 1) {
      this.downloadText.textContent = `下載全部 ${ext} (${count} 個)`;
    } else {
      this.downloadText.textContent = `下載 ${ext}`;
    }
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    // Filter HEIC/HEIF files
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase();
      return ext.endsWith('.heic') || ext.endsWith('.heif') ||
             file.type === 'image/heic' || file.type === 'image/heif';
    });

    if (validFiles.length === 0) {
      this.showStatus('error', window.t ? window.t('invalid_format_heic') : '請選擇 HEIC/HEIF 格式的圖片');
      return;
    }

    this.originalFiles = validFiles;

    // Show batch info
    if (this.batchInfo) {
      this.batchInfo.style.display = 'flex';
      this.fileCount.textContent = validFiles.length;
    }

    // Show preview of first file
    this.showPreview(validFiles[0]);

    if (this.convertBtn) this.convertBtn.disabled = false;
    this.showStatus('info', `已載入 ${validFiles.length} 個檔案`);
  }

  showPreview(file) {
    // HEIC can't be displayed directly, show placeholder
    if (this.originalImage) {
      this.originalImage.src = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect fill="#1e293b" width="200" height="200"/>
          <text x="100" y="90" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif">HEIC/HEIF</text>
          <text x="100" y="115" text-anchor="middle" fill="#6366f1" font-size="12" font-family="sans-serif">${file.name}</text>
          <text x="100" y="140" text-anchor="middle" fill="#64748b" font-size="11" font-family="sans-serif">${this.formatFileSize(file.size)}</text>
        </svg>
      `);
    }
    if (this.originalSize) this.originalSize.textContent = this.formatFileSize(file.size);
    if (this.previewArea) this.previewArea.style.display = 'grid';
  }

  async loadHeic2Any() {
    if (this.heic2any) return this.heic2any;
    if (this.isLoading) {
      // Wait for loading to complete
      while (this.isLoading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return this.heic2any;
    }

    this.isLoading = true;
    this.updateProgress(10, '載入 HEIC 解碼器...');

    try {
      // Dynamic import heic2any from CDN
      const script = document.createElement('script');
      script.src = '/vendor/misc/heic2any.min.js';

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      this.heic2any = window.heic2any;
      this.isLoading = false;
      return this.heic2any;
    } catch (error) {
      this.isLoading = false;
      throw new Error('無法載入 HEIC 解碼器');
    }
  }

  async convert() {
    if (this.originalFiles.length === 0) {
      this.showStatus('error', window.t ? window.t('no_file') : '請先選擇 HEIC/HEIF 圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer?.classList.add('active');
    if (this.progressFill) this.progressFill.style.width = '0%';
    if (this.convertBtn) this.convertBtn.disabled = true;

    try {
      // Load heic2any library
      const heic2any = await this.loadHeic2Any();

      this.convertedBlobs = [];
      const totalFiles = this.originalFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = this.originalFiles[i];
        const progress = 20 + (i / totalFiles) * 70;
        this.updateProgress(progress, `轉換中 (${i + 1}/${totalFiles})...`);

        // Convert HEIC to target format
        const blob = await heic2any({
          blob: file,
          toType: this.outputFormat,
          quality: this.outputFormat === 'image/jpeg' ? this.quality : undefined
        });

        // heic2any may return array for multi-image HEIC
        const resultBlob = Array.isArray(blob) ? blob[0] : blob;
        this.convertedBlobs.push({
          blob: resultBlob,
          name: file.name.replace(/\.(heic|heif)$/i, `.${this.outputExtension}`)
        });
      }

      this.updateProgress(95, '完成中...');

      // Show preview of first converted image
      if (this.convertedBlobs.length > 0) {
        const firstBlob = this.convertedBlobs[0].blob;
        const convertedUrl = URL.createObjectURL(firstBlob);
        if (this.convertedImage) this.convertedImage.src = convertedUrl;
        if (this.convertedSize) this.convertedSize.textContent = this.formatFileSize(firstBlob.size);

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          if (this.imageResolution) {
            this.imageResolution.textContent = `${img.width} × ${img.height} px`;
          }
        };
        img.src = convertedUrl;
      }

      // Calculate stats
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const totalOriginalSize = this.originalFiles.reduce((sum, f) => sum + f.size, 0);
      const totalConvertedSize = this.convertedBlobs.reduce((sum, b) => sum + b.blob.size, 0);
      const sizeChange = ((totalConvertedSize / totalOriginalSize - 1) * 100).toFixed(1);

      if (this.processTime) this.processTime.textContent = `${processingTime} 秒`;
      if (this.compressionRatio) {
        this.compressionRatio.textContent = sizeChange < 0
          ? `${Math.abs(sizeChange)}% ${window.t ? window.t('reduction') : '減少'}`
          : `${sizeChange}% 增加`;
      }
      if (this.performanceInfo) this.performanceInfo.style.display = 'block';

      this.updateProgress(100, window.t ? window.t('convert_success') : '轉換完成！');
      this.updateDownloadText();

      setTimeout(() => {
        this.progressContainer?.classList.remove('active');
        this.showStatus('success', `成功轉換 ${this.convertedBlobs.length} 個檔案！`);
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

  download() {
    if (this.convertedBlobs.length === 0) return;

    if (this.convertedBlobs.length === 1) {
      // Single file download
      const { blob, name } = this.convertedBlobs[0];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      // Multiple files - download one by one (or could use JSZip for batch)
      this.convertedBlobs.forEach(({ blob, name }, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = name;
          link.click();
          URL.revokeObjectURL(link.href);
        }, index * 500); // Stagger downloads
      });
    }
  }

  reset() {
    if (this.fileInput) this.fileInput.value = '';
    this.originalFiles = [];
    this.convertedBlobs = [];

    if (this.originalImage) this.originalImage.src = '';
    if (this.convertedImage) this.convertedImage.src = '';
    if (this.originalSize) this.originalSize.textContent = '-';
    if (this.convertedSize) this.convertedSize.textContent = '-';
    if (this.previewArea) this.previewArea.style.display = 'none';
    if (this.downloadBtn) this.downloadBtn.style.display = 'none';
    if (this.resetBtn) this.resetBtn.style.display = 'none';
    if (this.performanceInfo) this.performanceInfo.style.display = 'none';
    if (this.convertBtn) this.convertBtn.disabled = true;
    if (this.batchInfo) this.batchInfo.style.display = 'none';
    this.progressContainer?.classList.remove('active');
    this.statusMessage?.classList.remove('active');

    // Reset quality
    if (this.qualitySlider) {
      this.qualitySlider.value = 92;
      if (this.qualityValue) this.qualityValue.textContent = '92%';
    }
    this.quality = 0.92;
  }

  updateProgress(percent, text) {
    if (this.progressFill) this.progressFill.style.width = `${percent}%`;
    if (text && this.progressText) this.progressText.textContent = text;
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

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new HeicConverter();
});

export default HeicConverter;
