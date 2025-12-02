/**
 * IMG-005: AVIF Converter
 *
 * Bidirectional AVIF conversion:
 * - PNG/JPG/WebP → AVIF (next-gen compression)
 * - AVIF → PNG/JPG (for compatibility)
 *
 * Uses native browser Canvas API for AVIF support (Chrome 85+, Firefox 93+).
 * Falls back to displaying unsupported message for older browsers.
 *
 * AVIF advantages:
 * - 50% smaller than JPEG at same quality
 * - 20% smaller than WebP
 * - Supports HDR, transparency, and animations
 *
 * Performance Characteristics:
 * - Memory: ~6x original image size (AVIF encoding is memory intensive)
 * - Processing time: 3-8 seconds per image (AVIF encoding is slower)
 */

import { ImageConverterBase } from '/src/utils/ImageConverterBase.js';

class AvifConverter extends ImageConverterBase {
  constructor() {
    super({
      inputFormats: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
      outputFormat: 'image/avif',
      outputExtension: 'avif',
      defaultQuality: 0.80,
      showQuality: true,
      fillBackground: null
    });

    this.direction = 'to-avif';
    this.outputType = 'png';
    this.avifSupported = false;

    this.checkAvifSupport();
    this.initAvifControls();
  }

  async checkAvifSupport() {
    // Check if browser supports AVIF encoding
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    try {
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/avif', 0.8);
      });
      this.avifSupported = blob && blob.type === 'image/avif';
    } catch (e) {
      this.avifSupported = false;
    }

    // Update UI based on support
    if (!this.avifSupported) {
      this.showStatus('warning',
        window.t ? window.t('avif_not_supported') :
        '您的瀏覽器不支援 AVIF 編碼，請使用 Chrome 85+ 或 Firefox 93+'
      );
    }

    // Update browser badges
    this.updateBrowserBadges();
  }

  updateBrowserBadges() {
    const ua = navigator.userAgent;
    const isChrome = ua.includes('Chrome');
    const isFirefox = ua.includes('Firefox');
    const isSafari = ua.includes('Safari') && !isChrome;
    const isEdge = ua.includes('Edg');

    // Highlight current browser
    if (isChrome) {
      document.getElementById('chromeSupport')?.classList.add('supported');
    }
    if (isFirefox) {
      document.getElementById('firefoxSupport')?.classList.add('supported');
    }
    if (isSafari) {
      document.getElementById('safariSupport')?.classList.toggle('supported', this.avifSupported);
    }
    if (isEdge) {
      document.getElementById('edgeSupport')?.classList.add('supported');
    }
  }

  initAvifControls() {
    window.setDirection = (dir) => this.setDirection(dir);

    this.outputFormatSelect = document.getElementById('outputFormat');
    this.outputFormatSelect?.addEventListener('change', (e) => {
      this.outputType = e.target.value;
      this.updateQualityVisibility();
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
    const qualityRow = document.getElementById('qualityRow');
    const outputFormatRow = document.getElementById('outputFormatRow');
    const avifInfo = document.getElementById('avifInfo');

    if (direction === 'to-avif') {
      fileInput.accept = 'image/png,image/jpeg,image/webp';
      uploadTitle.textContent = window.t ? window.t('upload_title_avif_in') : '拖放 PNG/JPG/WebP 圖片到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_avif_in') : '支援格式：PNG, JPG, WebP';
      qualityRow.style.display = 'flex';
      outputFormatRow.style.display = 'none';
      avifInfo.textContent = window.t ? window.t('avif_quality_info') : 'AVIF 在較低品質設定下仍能保持良好畫質，建議使用 60-80%';

      this.config.inputFormats = ['image/png', 'image/jpeg', 'image/webp'];
      this.config.outputFormat = 'image/avif';
      this.config.outputExtension = 'avif';
      this.config.showQuality = true;
    } else {
      fileInput.accept = 'image/avif';
      uploadTitle.textContent = window.t ? window.t('upload_title_avif_out') : '拖放 AVIF 圖片到此處';
      uploadFormats.textContent = window.t ? window.t('upload_formats_avif_out') : '支援格式：AVIF';
      outputFormatRow.style.display = 'flex';
      avifInfo.textContent = window.t ? window.t('avif_out_info') : '轉換為通用格式以獲得更好的相容性';

      this.config.inputFormats = ['image/avif'];
      this.updateOutputConfig();
    }

    this.updateDownloadText();
    this.reset();
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

  updateQualityVisibility() {
    const qualityRow = document.getElementById('qualityRow');
    if (this.direction === 'from-avif') {
      qualityRow.style.display = this.outputType === 'jpg' ? 'flex' : 'none';
    }
  }

  updateDownloadText() {
    const downloadText = document.getElementById('downloadText');
    if (!downloadText) return;

    if (this.direction === 'to-avif') {
      downloadText.textContent = window.t ? window.t('download_avif') : '下載 AVIF';
    } else {
      downloadText.textContent = this.outputType === 'png'
        ? (window.t ? window.t('download_png') : '下載 PNG')
        : (window.t ? window.t('download') : '下載 JPG');
    }
  }

  validateFile(file) {
    if (this.direction === 'to-avif') {
      return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    } else {
      return file.type === 'image/avif';
    }
  }

  async convert() {
    // Check AVIF support for encoding
    if (this.direction === 'to-avif' && !this.avifSupported) {
      this.showStatus('error',
        window.t ? window.t('avif_encode_not_supported') :
        '您的瀏覽器不支援 AVIF 編碼，請使用 Chrome 85+ 或 Firefox 93+'
      );
      return;
    }

    if (this.direction === 'from-avif') {
      this.updateOutputConfig();
    }

    await super.convert();
  }
}

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new AvifConverter();
});

export default AvifConverter;
