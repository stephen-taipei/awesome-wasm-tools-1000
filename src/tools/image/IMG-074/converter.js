/**
 * IMG-074 雙色調效果
 * 將圖片轉為雙色調（Duotone）風格
 */

class DuotoneTool {
  constructor() {
    this.sourceImage = null;
    this.darkColor = '#1a1a2e';
    this.lightColor = '#667eea';
    this.contrast = 100;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.darkColorInput = document.getElementById('darkColorInput');
    this.lightColorInput = document.getElementById('lightColorInput');
    this.colorGradient = document.getElementById('colorGradient');
    this.contrastSlider = document.getElementById('contrastSlider');
    this.contrastValue = document.getElementById('contrastValue');

    this.downloadBtn = document.getElementById('downloadBtn');
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
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Color inputs
    this.darkColorInput.addEventListener('input', () => {
      this.darkColor = this.darkColorInput.value;
      this.updateGradientPreview();
      this.updatePresets();
      this.processImage();
    });

    this.lightColorInput.addEventListener('input', () => {
      this.lightColor = this.lightColorInput.value;
      this.updateGradientPreview();
      this.updatePresets();
      this.processImage();
    });

    // Contrast slider
    this.contrastSlider.addEventListener('input', () => {
      this.contrast = parseInt(this.contrastSlider.value);
      this.contrastValue.textContent = `${this.contrast}%`;
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.darkColor = btn.dataset.dark;
        this.lightColor = btn.dataset.light;
        this.darkColorInput.value = this.darkColor;
        this.lightColorInput.value = this.lightColor;
        this.updateGradientPreview();
        this.updatePresets();
        this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateGradientPreview() {
    this.colorGradient.style.setProperty('--dark-color', this.darkColor);
    this.colorGradient.style.setProperty('--light-color', this.lightColor);
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const matches = btn.dataset.dark === this.darkColor && btn.dataset.light === this.lightColor;
      btn.classList.toggle('active', matches);
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.uploadArea.style.display = 'none';
        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.downloadBtn.disabled = false;

        // Draw original
        this.originalCanvas.width = img.width;
        this.originalCanvas.height = img.height;
        this.originalCtx.drawImage(img, 0, 0);

        // Process
        this.processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Draw original image
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Get image data
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Parse colors
    const darkRgb = this.hexToRgb(this.darkColor);
    const lightRgb = this.hexToRgb(this.lightColor);

    // Calculate contrast factor
    const contrastFactor = this.contrast / 100;

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale using luminosity method
      let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

      // Apply contrast
      gray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255;
      gray = Math.max(0, Math.min(255, gray));

      // Normalize to 0-1
      const t = gray / 255;

      // Interpolate between dark and light colors
      data[i] = Math.round(darkRgb.r + (lightRgb.r - darkRgb.r) * t);
      data[i + 1] = Math.round(darkRgb.g + (lightRgb.g - darkRgb.g) * t);
      data[i + 2] = Math.round(darkRgb.b + (lightRgb.b - darkRgb.b) * t);
      // Keep alpha channel
    }

    this.resultCtx.putImageData(imageData, 0, 0);

    this.previewInfo.textContent = `${width} × ${height} px | 對比度: ${this.contrast}%`;
    this.showStatus('success', '雙色調效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `duotone_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.darkColor = '#1a1a2e';
    this.lightColor = '#667eea';
    this.contrast = 100;

    this.darkColorInput.value = '#1a1a2e';
    this.lightColorInput.value = '#667eea';
    this.contrastSlider.value = 100;
    this.contrastValue.textContent = '100%';
    this.updateGradientPreview();
    this.updatePresets();

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.previewInfo.textContent = '';

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
  new DuotoneTool();
});
