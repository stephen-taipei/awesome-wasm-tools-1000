/**
 * IMG-102 Base64 轉圖片
 * 將 Base64 編碼還原為圖片檔案
 */

class Base64ToImage {
  constructor() {
    this.imageData = null;
    this.dataUrl = '';
    this.outputFormat = 'png';

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.pasteBtn = document.getElementById('pasteBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.sampleBtn = document.getElementById('sampleBtn');

    this.errorMessage = document.getElementById('errorMessage');
    this.resultSection = document.getElementById('resultSection');

    this.previewImage = document.getElementById('previewImage');
    this.dimensions = document.getElementById('dimensions');
    this.format = document.getElementById('format');
    this.base64Size = document.getElementById('base64Size');
    this.imageSize = document.getElementById('imageSize');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Input actions
    this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
    this.clearBtn.addEventListener('click', () => this.clearInput());
    this.sampleBtn.addEventListener('click', () => this.loadSample());

    // Auto-convert on paste
    this.inputText.addEventListener('paste', () => {
      setTimeout(() => this.convert(), 100);
    });

    // Format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.outputFormat = btn.dataset.format;
      });
    });

    // Actions
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.inputText.value = text;
      this.convert();
    } catch (error) {
      this.showStatus('error', '無法讀取剪貼簿');
    }
  }

  clearInput() {
    this.inputText.value = '';
    this.hideError();
    this.resultSection.classList.remove('active');
    this.downloadBtn.disabled = true;
  }

  loadSample() {
    // Simple 1x1 red pixel PNG as sample
    this.inputText.value = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQzwAEjDAGNzQAABZaA/1r+lERAAAAAElFTkSuQmCC';
    this.convert();
  }

  convert() {
    const input = this.inputText.value.trim();

    if (!input) {
      this.showError('請輸入 Base64 字串');
      return;
    }

    this.hideError();

    try {
      // Parse the input
      let dataUrl = input;
      let mimeType = 'image/png';

      if (input.startsWith('data:')) {
        // Already a data URL
        const match = input.match(/^data:([^;]+);base64,/);
        if (match) {
          mimeType = match[1];
        }
      } else {
        // Pure Base64, try to detect format from magic bytes
        const detected = this.detectFormat(input);
        mimeType = detected.mimeType;
        dataUrl = `data:${mimeType};base64,${input}`;
      }

      // Create image
      const img = new Image();
      img.onload = () => {
        this.imageData = {
          width: img.width,
          height: img.height,
          mimeType: mimeType,
          base64Length: input.length
        };
        this.dataUrl = dataUrl;

        this.previewImage.src = dataUrl;
        this.updateInfo();

        this.resultSection.classList.add('active');
        this.downloadBtn.disabled = false;

        this.showStatus('success', '轉換成功');
      };

      img.onerror = () => {
        this.showError('無效的 Base64 圖片編碼');
      };

      img.src = dataUrl;

    } catch (error) {
      this.showError('Base64 解析失敗：' + error.message);
    }
  }

  detectFormat(base64) {
    // Decode first few bytes to detect format
    try {
      const binaryString = atob(base64.substring(0, 50));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return { mimeType: 'image/png', format: 'PNG' };
      }

      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return { mimeType: 'image/jpeg', format: 'JPEG' };
      }

      // GIF: 47 49 46
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return { mimeType: 'image/gif', format: 'GIF' };
      }

      // WebP: 52 49 46 46 ... 57 45 42 50
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return { mimeType: 'image/webp', format: 'WebP' };
      }

      // BMP: 42 4D
      if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        return { mimeType: 'image/bmp', format: 'BMP' };
      }

    } catch (e) {
      // Decode error
    }

    // Default to PNG
    return { mimeType: 'image/png', format: 'Unknown' };
  }

  updateInfo() {
    this.dimensions.textContent = `${this.imageData.width} x ${this.imageData.height}`;

    const formatMap = {
      'image/png': 'PNG',
      'image/jpeg': 'JPEG',
      'image/webp': 'WebP',
      'image/gif': 'GIF',
      'image/bmp': 'BMP'
    };
    this.format.textContent = formatMap[this.imageData.mimeType] || 'Unknown';

    this.base64Size.textContent = this.formatSize(this.imageData.base64Length);

    // Estimate actual image size (Base64 is ~33% larger)
    const estimatedSize = Math.round(this.imageData.base64Length * 0.75);
    this.imageSize.textContent = `~${this.formatSize(estimatedSize)}`;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  downloadImage() {
    if (!this.dataUrl) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.imageData.width;
    canvas.height = this.imageData.height;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // Fill white background for JPEG
      if (this.outputFormat === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      let mimeType, extension;
      switch (this.outputFormat) {
        case 'png':
          mimeType = 'image/png';
          extension = 'png';
          break;
        case 'jpg':
          mimeType = 'image/jpeg';
          extension = 'jpg';
          break;
        case 'webp':
          mimeType = 'image/webp';
          extension = 'webp';
          break;
      }

      canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `image_${Date.now()}.${extension}`;
        link.click();
        URL.revokeObjectURL(link.href);

        this.showStatus('success', '圖片已下載');
      }, mimeType, 0.92);
    };
    img.src = this.dataUrl;
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('active');
    this.resultSection.classList.remove('active');
    this.downloadBtn.disabled = true;
  }

  hideError() {
    this.errorMessage.classList.remove('active');
  }

  reset() {
    this.inputText.value = '';
    this.imageData = null;
    this.dataUrl = '';
    this.outputFormat = 'png';

    this.hideError();
    this.resultSection.classList.remove('active');
    this.downloadBtn.disabled = true;

    this.previewImage.src = '';
    this.dimensions.textContent = '-';
    this.format.textContent = '-';
    this.base64Size.textContent = '-';
    this.imageSize.textContent = '-';

    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-format="png"]').classList.add('active');

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.style.display = 'none';
      }, 2000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new Base64ToImage();
});
