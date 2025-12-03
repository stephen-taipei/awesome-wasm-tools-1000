/**
 * IMG-075 色彩替換
 * 將圖片中特定顏色替換為另一顏色
 */

class ColorReplaceTool {
  constructor() {
    this.sourceImage = null;
    this.sourceColor = '#ff0000';
    this.targetColor = '#00ff00';
    this.tolerance = 30;
    this.softness = 20;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.sourceColorInput = document.getElementById('sourceColorInput');
    this.targetColorInput = document.getElementById('targetColorInput');
    this.sourceColorSwatch = document.getElementById('sourceColorSwatch');
    this.targetColorSwatch = document.getElementById('targetColorSwatch');
    this.sourceColorHex = document.getElementById('sourceColorHex');
    this.targetColorHex = document.getElementById('targetColorHex');

    this.toleranceSlider = document.getElementById('toleranceSlider');
    this.toleranceValue = document.getElementById('toleranceValue');
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

    // Canvas click for color picking
    this.resultCanvas.addEventListener('click', (e) => {
      this.pickColor(e);
    });

    // Color inputs
    this.sourceColorInput.addEventListener('input', () => {
      this.sourceColor = this.sourceColorInput.value;
      this.updateColorDisplay();
      this.processImage();
    });

    this.targetColorInput.addEventListener('input', () => {
      this.targetColor = this.targetColorInput.value;
      this.updateColorDisplay();
      this.processImage();
    });

    // Sliders
    this.toleranceSlider.addEventListener('input', () => {
      this.tolerance = parseInt(this.toleranceSlider.value);
      this.toleranceValue.textContent = this.tolerance;
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
    this.sourceColorSwatch.style.background = this.sourceColor;
    this.targetColorSwatch.style.background = this.targetColor;
    this.sourceColorHex.textContent = this.sourceColor;
    this.targetColorHex.textContent = this.targetColor;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // Convert RGB to HSL
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

  // Calculate color distance in HSL space
  colorDistance(r1, g1, b1, r2, g2, b2) {
    const hsl1 = this.rgbToHsl(r1, g1, b1);
    const hsl2 = this.rgbToHsl(r2, g2, b2);

    // Hue distance (circular)
    let hDiff = Math.abs(hsl1.h - hsl2.h);
    if (hDiff > 180) hDiff = 360 - hDiff;
    hDiff /= 180; // Normalize to 0-1

    // Saturation and lightness distance
    const sDiff = Math.abs(hsl1.s - hsl2.s) / 100;
    const lDiff = Math.abs(hsl1.l - hsl2.l) / 100;

    // Weighted distance
    return Math.sqrt(hDiff * hDiff * 2 + sDiff * sDiff + lDiff * lDiff) * 100;
  }

  pickColor(e) {
    if (!this.sourceImage) return;

    const rect = this.resultCanvas.getBoundingClientRect();
    const scaleX = this.resultCanvas.width / rect.width;
    const scaleY = this.resultCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Get original image data
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.sourceImage.width;
    tempCanvas.height = this.sourceImage.height;
    tempCtx.drawImage(this.sourceImage, 0, 0);

    const pixel = tempCtx.getImageData(x, y, 1, 1).data;
    this.sourceColor = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
    this.sourceColorInput.value = this.sourceColor;
    this.updateColorDisplay();
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
    const srcRgb = this.hexToRgb(this.sourceColor);
    const tgtRgb = this.hexToRgb(this.targetColor);

    // Process each pixel
    let replacedCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate distance from source color
      const distance = this.colorDistance(r, g, b, srcRgb.r, srcRgb.g, srcRgb.b);

      if (distance <= this.tolerance) {
        // Calculate blend factor based on softness
        let blend = 1;
        if (this.softness > 0) {
          const softRange = this.tolerance * (this.softness / 100);
          if (distance > this.tolerance - softRange) {
            blend = 1 - (distance - (this.tolerance - softRange)) / softRange;
          }
        }

        // Blend between original and target color
        data[i] = Math.round(r + (tgtRgb.r - r) * blend);
        data[i + 1] = Math.round(g + (tgtRgb.g - g) * blend);
        data[i + 2] = Math.round(b + (tgtRgb.b - b) * blend);

        if (blend > 0.5) replacedCount++;
      }
    }

    this.resultCtx.putImageData(imageData, 0, 0);

    const percentage = ((replacedCount / (width * height)) * 100).toFixed(1);
    this.previewInfo.textContent = `${width} × ${height} px | 替換像素: ${percentage}% | 容差: ${this.tolerance}`;
    this.showStatus('success', '色彩替換完成');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `color_replace_${Date.now()}.png`;
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

    this.sourceColor = '#ff0000';
    this.targetColor = '#00ff00';
    this.tolerance = 30;
    this.softness = 20;

    this.sourceColorInput.value = '#ff0000';
    this.targetColorInput.value = '#00ff00';
    this.toleranceSlider.value = 30;
    this.softnessSlider.value = 20;
    this.toleranceValue.textContent = '30';
    this.softnessValue.textContent = '20%';
    this.updateColorDisplay();

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
  new ColorReplaceTool();
});
