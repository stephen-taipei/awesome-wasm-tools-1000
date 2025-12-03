/**
 * IMG-091 圖片資訊顯示
 * 顯示圖片詳細資訊（尺寸、格式、檔案大小等）
 */

class ImageInfoTool {
  constructor() {
    this.currentFile = null;
    this.currentImage = null;
    this.imageData = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.resultSection = document.getElementById('resultSection');
    this.previewImage = document.getElementById('previewImage');

    // Info elements
    this.fileName = document.getElementById('fileName');
    this.fileFormat = document.getElementById('fileFormat');
    this.fileSize = document.getElementById('fileSize');
    this.lastModified = document.getElementById('lastModified');
    this.imgWidth = document.getElementById('imgWidth');
    this.imgHeight = document.getElementById('imgHeight');
    this.aspectRatio = document.getElementById('aspectRatio');
    this.totalPixels = document.getElementById('totalPixels');
    this.colorDepth = document.getElementById('colorDepth');
    this.hasAlpha = document.getElementById('hasAlpha');
    this.colorCount = document.getElementById('colorCount');

    this.copyBtn = document.getElementById('copyBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
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
      if (file) this.analyzeImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.analyzeImage(file);
    });

    // Buttons
    this.copyBtn.addEventListener('click', () => this.copyInfo());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  analyzeImage(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('error', '請選擇圖片檔案');
      return;
    }

    this.currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.previewImage.src = e.target.result;
        this.uploadArea.style.display = 'none';
        this.resultSection.classList.add('active');
        this.copyBtn.disabled = false;

        this.displayInfo(file, img);
        this.analyzeColors(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  displayInfo(file, img) {
    // File info
    this.fileName.textContent = file.name;
    this.fileFormat.textContent = this.getFormatName(file.type);
    this.fileSize.textContent = this.formatFileSize(file.size);
    this.lastModified.textContent = this.formatDate(file.lastModified);

    // Dimension info
    this.imgWidth.textContent = img.width + ' px';
    this.imgHeight.textContent = img.height + ' px';
    this.aspectRatio.textContent = this.calculateAspectRatio(img.width, img.height);
    this.totalPixels.textContent = this.formatNumber(img.width * img.height) + ' px';

    // Color depth (estimated based on format)
    const colorDepth = this.estimateColorDepth(file.type);
    this.colorDepth.textContent = colorDepth;
  }

  analyzeColors(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use smaller size for analysis
    const maxSize = 200;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check for transparency
    let hasTransparency = false;
    const colorSet = new Set();

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 255) {
        hasTransparency = true;
      }

      // Sample colors (quantize to reduce count)
      const r = Math.floor(data[i] / 16) * 16;
      const g = Math.floor(data[i + 1] / 16) * 16;
      const b = Math.floor(data[i + 2] / 16) * 16;
      colorSet.add(`${r},${g},${b}`);
    }

    this.hasAlpha.textContent = hasTransparency ? '是 (含透明通道)' : '否';

    // Estimate actual color count
    const estimatedColors = colorSet.size * 16; // Rough estimate
    if (estimatedColors > 10000) {
      this.colorCount.textContent = '> 10,000 (全彩)';
    } else if (estimatedColors > 1000) {
      this.colorCount.textContent = '約 ' + this.formatNumber(estimatedColors);
    } else {
      this.colorCount.textContent = '約 ' + colorSet.size + ' (有限色)';
    }

    this.showStatus('success', '圖片資訊分析完成');
  }

  getFormatName(mimeType) {
    const formats = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/bmp': 'BMP',
      'image/tiff': 'TIFF',
      'image/svg+xml': 'SVG',
      'image/x-icon': 'ICO',
      'image/heic': 'HEIC',
      'image/heif': 'HEIF',
      'image/avif': 'AVIF'
    };
    return formats[mimeType] || mimeType.split('/')[1].toUpperCase();
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(num) {
    return num.toLocaleString('zh-TW');
  }

  calculateAspectRatio(width, height) {
    const gcd = this.gcd(width, height);
    const ratioW = width / gcd;
    const ratioH = height / gcd;

    // Common ratios
    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) < 0.01) return '16:9 (寬螢幕)';
    if (Math.abs(ratio - 4 / 3) < 0.01) return '4:3 (標準)';
    if (Math.abs(ratio - 1) < 0.01) return '1:1 (正方形)';
    if (Math.abs(ratio - 3 / 2) < 0.01) return '3:2 (相機)';
    if (Math.abs(ratio - 9 / 16) < 0.01) return '9:16 (直式)';

    if (ratioW < 100 && ratioH < 100) {
      return `${ratioW}:${ratioH}`;
    }
    return ratio.toFixed(2) + ':1';
  }

  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  estimateColorDepth(mimeType) {
    const depths = {
      'image/jpeg': '24-bit (RGB)',
      'image/png': '24-bit / 32-bit (RGBA)',
      'image/gif': '8-bit (256色)',
      'image/webp': '24-bit / 32-bit',
      'image/bmp': '24-bit (RGB)',
      'image/tiff': '24-bit / 48-bit'
    };
    return depths[mimeType] || '24-bit';
  }

  copyInfo() {
    if (!this.currentFile || !this.currentImage) return;

    const info = `圖片資訊
========
檔案名稱: ${this.currentFile.name}
檔案格式: ${this.getFormatName(this.currentFile.type)}
檔案大小: ${this.formatFileSize(this.currentFile.size)}
尺寸: ${this.currentImage.width} × ${this.currentImage.height} px
長寬比: ${this.aspectRatio.textContent}
總像素: ${this.formatNumber(this.currentImage.width * this.currentImage.height)}
色彩深度: ${this.colorDepth.textContent}
透明通道: ${this.hasAlpha.textContent}`;

    navigator.clipboard.writeText(info).then(() => {
      this.showStatus('success', '資訊已複製到剪貼簿');
    }).catch(() => {
      this.showStatus('error', '複製失敗');
    });
  }

  reset() {
    this.currentFile = null;
    this.currentImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.resultSection.classList.remove('active');
    this.copyBtn.disabled = true;

    this.previewImage.src = '';
    this.fileName.textContent = '-';
    this.fileFormat.textContent = '-';
    this.fileSize.textContent = '-';
    this.lastModified.textContent = '-';
    this.imgWidth.textContent = '-';
    this.imgHeight.textContent = '-';
    this.aspectRatio.textContent = '-';
    this.totalPixels.textContent = '-';
    this.colorDepth.textContent = '-';
    this.hasAlpha.textContent = '-';
    this.colorCount.textContent = '-';

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageInfoTool();
});
