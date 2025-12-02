/**
 * IMG-028 飽和度/色相調整
 * 調整圖片色彩飽和度與色相偏移
 */

class HueSaturationTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.hue = 0;
    this.saturation = 0;
    this.vibrance = 0;
    this.lightness = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.adjustPanel = document.getElementById('adjustPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    this.hueSlider = document.getElementById('hueSlider');
    this.hueValue = document.getElementById('hueValue');
    this.saturationSlider = document.getElementById('saturationSlider');
    this.saturationValue = document.getElementById('saturationValue');
    this.vibranceSlider = document.getElementById('vibranceSlider');
    this.vibranceValue = document.getElementById('vibranceValue');
    this.lightnessSlider = document.getElementById('lightnessSlider');
    this.lightnessValue = document.getElementById('lightnessValue');

    this.resetValuesBtn = document.getElementById('resetValuesBtn');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
  }

  bindEvents() {
    // File upload
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
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Sliders
    this.hueSlider.addEventListener('input', () => {
      this.hue = parseInt(this.hueSlider.value);
      this.hueValue.textContent = `${this.hue}°`;
      this.updatePreview();
    });

    this.saturationSlider.addEventListener('input', () => {
      this.saturation = parseInt(this.saturationSlider.value);
      this.saturationValue.textContent = this.saturation;
      this.updatePreview();
    });

    this.vibranceSlider.addEventListener('input', () => {
      this.vibrance = parseInt(this.vibranceSlider.value);
      this.vibranceValue.textContent = this.vibrance;
      this.updatePreview();
    });

    this.lightnessSlider.addEventListener('input', () => {
      this.lightness = parseInt(this.lightnessSlider.value);
      this.lightnessValue.textContent = this.lightness;
      this.updatePreview();
    });

    // Reset button
    this.resetValuesBtn.addEventListener('click', () => this.resetValues());

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyAdjustments());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;

        this.adjustPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請調整 HSL 參數');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  resetValues() {
    this.hue = 0;
    this.saturation = 0;
    this.vibrance = 0;
    this.lightness = 0;

    this.hueSlider.value = 0;
    this.hueValue.textContent = '0°';
    this.saturationSlider.value = 0;
    this.saturationValue.textContent = '0';
    this.vibranceSlider.value = 0;
    this.vibranceValue.textContent = '0';
    this.lightnessSlider.value = 0;
    this.lightnessValue.textContent = '0';

    this.updatePreview();
  }

  updatePreview() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 600);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    this.applyHSL(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyHSL(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Convert to HSL
      let [h, s, l] = this.rgbToHsl(r, g, b);

      // Apply hue shift
      h = (h + this.hue / 360 + 1) % 1;

      // Apply saturation
      const satFactor = 1 + this.saturation / 100;
      s = Math.max(0, Math.min(1, s * satFactor));

      // Apply vibrance (smart saturation)
      if (this.vibrance !== 0) {
        const vibFactor = this.vibrance / 100;
        // Vibrance affects low-saturation colors more
        const satBoost = (1 - s) * vibFactor;
        s = Math.max(0, Math.min(1, s + satBoost * 0.5));
      }

      // Apply lightness
      l = Math.max(0, Math.min(1, l + this.lightness / 200));

      // Convert back to RGB
      [r, g, b] = this.hslToRgb(h, s, l);

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
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

    return [h, s, l];
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  async applyAdjustments() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用 HSL 調整...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用 HSL 調整...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyHSL(imageData);
      ctx.putImageData(imageData, 0, 0);

      this.updateProgress(90, '輸出圖片...');

      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        mimeType = this.originalFile.type;
        ext = this.originalFile.name.split('.').pop();
      } else {
        mimeType = format === 'png' ? 'image/png' :
                   format === 'webp' ? 'image/webp' : 'image/jpeg';
        ext = format;
      }

      const quality = mimeType === 'image/png' ? undefined : 0.92;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.convertedBlob = blob;
      this.outputExt = ext;

      this.updateProgress(100, '完成！');

      this.previewImage.src = URL.createObjectURL(blob);
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', 'HSL 調整套用完成！');

    } catch (error) {
      this.showStatus('error', `套用失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_hsl.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.resetValues();

    this.fileInput.value = '';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
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
  new HueSaturationTool();
});
