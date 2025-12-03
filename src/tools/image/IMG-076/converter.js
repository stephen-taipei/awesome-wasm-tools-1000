/**
 * IMG-076 選擇性色彩
 * 保留特定顏色，其餘轉為黑白
 */

class SelectiveColorTool {
  constructor() {
    this.sourceImage = null;
    this.selectedColor = '#ff0000';
    this.hueTolerance = 20;
    this.satTolerance = 50;
    this.softness = 30;

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

    this.colorInput = document.getElementById('colorInput');
    this.selectedColorSwatch = document.getElementById('selectedColorSwatch');
    this.selectedColorHex = document.getElementById('selectedColorHex');

    this.hueToleranceSlider = document.getElementById('hueToleranceSlider');
    this.hueToleranceValue = document.getElementById('hueToleranceValue');
    this.satToleranceSlider = document.getElementById('satToleranceSlider');
    this.satToleranceValue = document.getElementById('satToleranceValue');
    this.softnessSlider = document.getElementById('softnessSlider');
    this.softnessValue = document.getElementById('softnessValue');

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

    // Original canvas click for color picking
    this.originalCanvas.addEventListener('click', (e) => {
      this.pickColor(e);
    });

    // Color input
    this.colorInput.addEventListener('input', () => {
      this.selectedColor = this.colorInput.value;
      this.updateColorDisplay();
      this.updatePresets();
      this.processImage();
    });

    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        this.selectedColor = preset.dataset.color;
        this.colorInput.value = this.selectedColor;
        this.updateColorDisplay();
        this.updatePresets();
        this.processImage();
      });
    });

    // Sliders
    this.hueToleranceSlider.addEventListener('input', () => {
      this.hueTolerance = parseInt(this.hueToleranceSlider.value);
      this.hueToleranceValue.textContent = `${this.hueTolerance}°`;
      this.processImage();
    });

    this.satToleranceSlider.addEventListener('input', () => {
      this.satTolerance = parseInt(this.satToleranceSlider.value);
      this.satToleranceValue.textContent = `${this.satTolerance}%`;
      this.processImage();
    });

    this.softnessSlider.addEventListener('input', () => {
      this.softness = parseInt(this.softnessSlider.value);
      this.softnessValue.textContent = `${this.softness}%`;
      this.processImage();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateColorDisplay() {
    this.selectedColorSwatch.style.background = this.selectedColor;
    this.selectedColorHex.textContent = this.selectedColor;
  }

  updatePresets() {
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.classList.toggle('active', preset.dataset.color === this.selectedColor);
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  pickColor(e) {
    if (!this.sourceImage) return;

    const rect = this.originalCanvas.getBoundingClientRect();
    const scaleX = this.originalCanvas.width / rect.width;
    const scaleY = this.originalCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = this.originalCtx.getImageData(x, y, 1, 1).data;
    this.selectedColor = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
    this.colorInput.value = this.selectedColor;
    this.updateColorDisplay();
    this.updatePresets();
    this.processImage();
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

    // Get source image data
    const srcData = this.originalCtx.getImageData(0, 0, width, height);
    const data = srcData.data;

    // Get target color HSL
    const targetRgb = this.hexToRgb(this.selectedColor);
    const targetHsl = this.rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);

    let coloredPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert pixel to HSL
      const pixelHsl = this.rgbToHsl(r, g, b);

      // Calculate hue difference (circular)
      let hueDiff = Math.abs(pixelHsl.h - targetHsl.h);
      if (hueDiff > 180) hueDiff = 360 - hueDiff;

      // Calculate saturation difference
      const satDiff = Math.abs(pixelHsl.s - targetHsl.s);

      // Check if pixel matches the selected color
      const hueMatch = hueDiff <= this.hueTolerance;
      const satMatch = satDiff <= this.satTolerance;
      const isSaturated = pixelHsl.s >= 10; // Ignore very desaturated pixels

      if (hueMatch && satMatch && isSaturated) {
        // Calculate blend factor for softness
        let blend = 1;
        if (this.softness > 0) {
          const hueBlend = 1 - (hueDiff / this.hueTolerance);
          const satBlend = 1 - (satDiff / this.satTolerance);
          blend = Math.min(hueBlend, satBlend);
          blend = Math.pow(blend, 1 - this.softness / 100);
        }

        // Calculate grayscale value
        const gray = r * 0.299 + g * 0.587 + b * 0.114;

        // Blend between grayscale and original color
        data[i] = Math.round(gray + (r - gray) * blend);
        data[i + 1] = Math.round(gray + (g - gray) * blend);
        data[i + 2] = Math.round(gray + (b - gray) * blend);

        if (blend > 0.5) coloredPixels++;
      } else {
        // Convert to grayscale
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    this.resultCtx.putImageData(srcData, 0, 0);

    const percentage = ((coloredPixels / (width * height)) * 100).toFixed(1);
    this.previewInfo.textContent = `${width} × ${height} px | 保留像素: ${percentage}% | 色相容差: ${this.hueTolerance}°`;
    this.showStatus('success', '選擇性色彩效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `selective_color_${Date.now()}.png`;
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

    this.selectedColor = '#ff0000';
    this.hueTolerance = 20;
    this.satTolerance = 50;
    this.softness = 30;

    this.colorInput.value = '#ff0000';
    this.hueToleranceSlider.value = 20;
    this.satToleranceSlider.value = 50;
    this.softnessSlider.value = 30;
    this.hueToleranceValue.textContent = '20°';
    this.satToleranceValue.textContent = '50%';
    this.softnessValue.textContent = '30%';
    this.updateColorDisplay();
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
  new SelectiveColorTool();
});
