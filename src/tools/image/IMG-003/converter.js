/**
 * IMG-003: WebP Converter
 *
 * Bidirectional WebP conversion:
 * - PNG/JPG → WebP (with lossy/lossless options)
 * - WebP → PNG/JPG
 *
 * Uses native Canvas API for WebP support (available in modern browsers).
 * For browsers without native WebP support, a WASM fallback could be added.
 *
 * Performance Characteristics:
 * - Memory: ~4x original image size
 * - Processing time: 1-3 seconds for most images
 * - WebP typically achieves 25-35% smaller file size than JPEG at same quality
 */

import { ImageConverterBase } from '/src/utils/ImageConverterBase.js';

class WebPConverter extends ImageConverterBase {
  constructor() {
    super({
      inputFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      outputFormat: 'image/webp',
      outputExtension: 'webp',
      defaultQuality: 0.85,
      showQuality: true,
      fillBackground: null
    });

    this.direction = 'to-webp'; // 'to-webp' or 'from-webp'
    this.compression = 'lossy'; // 'lossy' or 'lossless'
    this.outputType = 'png'; // for from-webp mode: 'png' or 'jpg'

    this.initWebPControls();
  }

  initWebPControls() {
    // Direction buttons are handled by global functions
    window.setDirection = (dir) => this.setDirection(dir);
    window.setCompression = (type) => this.setCompression(type);

    // Output format selector
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.outputFormatSelect?.addEventListener('change', (e) => {
      this.outputType = e.target.value;
      this.invalidateResult();
      this.updateDownloadText();
    });
  }

  setDirection(direction) {
    this.direction = direction;

    // Update UI
    document.querySelectorAll('.format-option').forEach(el => {
      el.classList.toggle('active', el.dataset.direction === direction);
    });

    const fileInput = document.getElementById('fileInput');
    const uploadTitle = document.getElementById('uploadTitle');
    const uploadFormats = document.getElementById('uploadFormats');
    const compressionRow = document.getElementById('compressionRow');
    const qualityRow = document.getElementById('qualityRow');
    const outputFormatRow = document.getElementById('outputFormatRow');
    const compressionInfo = document.getElementById('compressionInfo');

    if (direction === 'to-webp') {
      // PNG/JPG → WebP
      fileInput.accept = 'image/png,image/jpeg,image/jpg';
      uploadTitle.textContent = window.t ? window.t('upload_title_webp_in') : '拖放 PNG/JPG 圖片到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_webp_in') : '支援格式：PNG, JPG, JPEG';
      compressionRow.style.display = 'flex';
      qualityRow.style.display = this.compression === 'lossy' ? 'flex' : 'none';
      outputFormatRow.style.display = 'none';
      compressionInfo.textContent = window.t ? window.t('webp_lossy_info') : '有損壓縮可大幅減少檔案大小，適合網頁使用';

      this.config.inputFormats = ['image/png', 'image/jpeg', 'image/jpg'];
      this.config.outputFormat = 'image/webp';
      this.config.outputExtension = 'webp';
      this.config.fillBackground = null;
      this.config.showQuality = true;
    } else {
      // WebP → PNG/JPG
      fileInput.accept = 'image/webp';
      uploadTitle.textContent = window.t ? window.t('upload_title_webp_out') : '拖放 WebP 圖片到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_webp_out') : '支援格式：WebP';
      compressionRow.style.display = 'none';
      qualityRow.style.display = this.outputType === 'jpg' ? 'flex' : 'none';
      outputFormatRow.style.display = 'flex';
      compressionInfo.textContent = window.t ? window.t('webp_out_info') : '轉換為通用格式以獲得更好的相容性';

      this.config.inputFormats = ['image/webp'];
      this.updateOutputConfig();
    }

    this.updateDownloadText();
    this.reset();
  }

  setCompression(type) {
    this.compression = type;
    this.invalidateResult();

    document.getElementById('lossyBtn')?.classList.toggle('active', type === 'lossy');
    document.getElementById('losslessBtn')?.classList.toggle('active', type === 'lossless');

    const qualityRow = document.getElementById('qualityRow');
    const compressionInfo = document.getElementById('compressionInfo');

    if (type === 'lossy') {
      qualityRow.style.display = 'flex';
      compressionInfo.textContent = window.t ? window.t('webp_lossy_info') : '有損壓縮可大幅減少檔案大小，適合網頁使用';
      this.config.showQuality = true;
    } else {
      qualityRow.style.display = 'none';
      compressionInfo.textContent = window.t ? window.t('webp_lossless_info') : '無損壓縮保持原始畫質，檔案較大';
      this.config.showQuality = false;
    }
  }

  updateOutputConfig() {
    if (this.outputType === 'png') {
      this.config.outputFormat = 'image/png';
      this.config.outputExtension = 'png';
      this.config.showQuality = false;
      this.config.fillBackground = null;
      document.getElementById('qualityRow').style.display = 'none';
    } else {
      this.config.outputFormat = 'image/jpeg';
      this.config.outputExtension = 'jpg';
      this.config.showQuality = true;
      this.config.fillBackground = '#FFFFFF';
      document.getElementById('qualityRow').style.display = 'flex';
    }
  }

  updateDownloadText() {
    const downloadText = document.getElementById('downloadText');
    if (!downloadText) return;

    if (this.direction === 'to-webp') {
      downloadText.textContent = window.t ? window.t('download_webp') : '下載 WebP';
    } else {
      downloadText.textContent = this.outputType === 'png'
        ? (window.t ? window.t('download_png') : '下載 PNG')
        : (window.t ? window.t('download') : '下載 JPG');
    }
  }

  validateFile(file) {
    if (this.direction === 'to-webp') {
      return file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg';
    } else {
      return file.type === 'image/webp';
    }
  }

  async convert() {
    if (this.direction === 'from-webp') {
      this.updateOutputConfig();
    }

    // For lossless WebP, we need special handling
    if (this.direction === 'to-webp' && this.compression === 'lossless') {
      await this.convertLossless();
    } else {
      await super.convert();
    }
  }

  async convertLossless() {
    this.invalidateResult();
    this.showStatus('error', 'Canvas does not guarantee lossless WebP. Use PNG or lossy WebP. / 此編碼器不保證 WebP 無損輸出。');
  }

}

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new WebPConverter();
});

export default WebPConverter;
