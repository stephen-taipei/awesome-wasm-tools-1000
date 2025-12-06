/**
 * IMG-158 圖片濾鏡工具
 * Image Filter Tool
 */

class ImageFilter {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;

    this.filters = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sharpen: 0,
      vignette: 0
    };

    this.presets = {
      original: { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpen: 0, vignette: 0 },
      grayscale: { brightness: 0, contrast: 10, saturation: -100, hue: 0, blur: 0, sharpen: 0, vignette: 0 },
      sepia: { brightness: 5, contrast: 5, saturation: -30, hue: 30, blur: 0, sharpen: 0, vignette: 20 },
      vintage: { brightness: -5, contrast: 15, saturation: -20, hue: 10, blur: 0, sharpen: 0, vignette: 40 },
      warm: { brightness: 5, contrast: 5, saturation: 15, hue: 15, blur: 0, sharpen: 0, vignette: 0 },
      cool: { brightness: 0, contrast: 5, saturation: 10, hue: -20, blur: 0, sharpen: 0, vignette: 0 },
      dramatic: { brightness: -10, contrast: 40, saturation: 20, hue: 0, blur: 0, sharpen: 30, vignette: 50 },
      fade: { brightness: 15, contrast: -20, saturation: -30, hue: 0, blur: 0, sharpen: 0, vignette: 0 },
      vibrant: { brightness: 5, contrast: 20, saturation: 50, hue: 0, blur: 0, sharpen: 20, vignette: 0 }
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Editor
    this.editorSection = document.getElementById('editorSection');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.ctx = this.previewCanvas.getContext('2d');

    // Presets
    this.presetBtns = document.querySelectorAll('.preset-btn');

    // Sliders
    this.brightnessSlider = document.getElementById('brightness');
    this.brightnessValue = document.getElementById('brightnessValue');
    this.contrastSlider = document.getElementById('contrast');
    this.contrastValue = document.getElementById('contrastValue');
    this.saturationSlider = document.getElementById('saturation');
    this.saturationValue = document.getElementById('saturationValue');
    this.hueSlider = document.getElementById('hue');
    this.hueValue = document.getElementById('hueValue');
    this.blurSlider = document.getElementById('blur');
    this.blurValue = document.getElementById('blurValue');
    this.sharpenSlider = document.getElementById('sharpen');
    this.sharpenValue = document.getElementById('sharpenValue');
    this.vignetteSlider = document.getElementById('vignette');
    this.vignetteValue = document.getElementById('vignetteValue');

    this.resetFiltersBtn = document.getElementById('resetFilters');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Presets
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });

    // Sliders
    this.brightnessSlider.addEventListener('input', (e) => {
      this.filters.brightness = parseInt(e.target.value);
      this.brightnessValue.textContent = this.filters.brightness;
      this.updatePreview();
    });

    this.contrastSlider.addEventListener('input', (e) => {
      this.filters.contrast = parseInt(e.target.value);
      this.contrastValue.textContent = this.filters.contrast;
      this.updatePreview();
    });

    this.saturationSlider.addEventListener('input', (e) => {
      this.filters.saturation = parseInt(e.target.value);
      this.saturationValue.textContent = this.filters.saturation;
      this.updatePreview();
    });

    this.hueSlider.addEventListener('input', (e) => {
      this.filters.hue = parseInt(e.target.value);
      this.hueValue.textContent = `${this.filters.hue}°`;
      this.updatePreview();
    });

    this.blurSlider.addEventListener('input', (e) => {
      this.filters.blur = parseInt(e.target.value);
      this.blurValue.textContent = this.filters.blur;
      this.updatePreview();
    });

    this.sharpenSlider.addEventListener('input', (e) => {
      this.filters.sharpen = parseInt(e.target.value);
      this.sharpenValue.textContent = this.filters.sharpen;
      this.updatePreview();
    });

    this.vignetteSlider.addEventListener('input', (e) => {
      this.filters.vignette = parseInt(e.target.value);
      this.vignetteValue.textContent = this.filters.vignette;
      this.updatePreview();
    });

    this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyFilter());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // Set canvas size
        const maxWidth = 800;
        const maxHeight = 600;
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);

        this.previewCanvas.width = img.width * scale;
        this.previewCanvas.height = img.height * scale;

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.editorSection.classList.add('active');
        this.buttonGroup.style.display = 'flex';

        this.updatePreview();
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetName);
    });

    this.filters = { ...preset };
    this.updateSliders();
    this.updatePreview();
  }

  updateSliders() {
    this.brightnessSlider.value = this.filters.brightness;
    this.brightnessValue.textContent = this.filters.brightness;
    this.contrastSlider.value = this.filters.contrast;
    this.contrastValue.textContent = this.filters.contrast;
    this.saturationSlider.value = this.filters.saturation;
    this.saturationValue.textContent = this.filters.saturation;
    this.hueSlider.value = this.filters.hue;
    this.hueValue.textContent = `${this.filters.hue}°`;
    this.blurSlider.value = this.filters.blur;
    this.blurValue.textContent = this.filters.blur;
    this.sharpenSlider.value = this.filters.sharpen;
    this.sharpenValue.textContent = this.filters.sharpen;
    this.vignetteSlider.value = this.filters.vignette;
    this.vignetteValue.textContent = this.filters.vignette;
  }

  resetFilters() {
    this.applyPreset('original');
  }

  updatePreview() {
    if (!this.originalImage) return;

    // Draw original image
    this.ctx.drawImage(this.originalImage, 0, 0, this.previewCanvas.width, this.previewCanvas.height);

    // Get image data
    const imageData = this.ctx.getImageData(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    const data = imageData.data;

    // Apply filters
    this.applyBrightnessContrast(data);
    this.applySaturationHue(data);

    // Put processed data back
    this.ctx.putImageData(imageData, 0, 0);

    // Apply blur (using CSS filter for performance)
    if (this.filters.blur > 0) {
      this.ctx.filter = `blur(${this.filters.blur}px)`;
      this.ctx.drawImage(this.previewCanvas, 0, 0);
      this.ctx.filter = 'none';
    }

    // Apply sharpen
    if (this.filters.sharpen > 0) {
      this.applySharpen();
    }

    // Apply vignette
    if (this.filters.vignette > 0) {
      this.applyVignette();
    }
  }

  applyBrightnessContrast(data) {
    const brightness = this.filters.brightness * 2.55;
    const contrast = (this.filters.contrast + 100) / 100;
    const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = data[i] + brightness;
      data[i + 1] = data[i + 1] + brightness;
      data[i + 2] = data[i + 2] + brightness;

      // Apply contrast
      data[i] = contrastFactor * (data[i] - 128) + 128;
      data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
      data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;

      // Clamp values
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
  }

  applySaturationHue(data) {
    const saturation = (this.filters.saturation + 100) / 100;
    const hue = this.filters.hue;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to HSL
      const hsl = this.rgbToHsl(r, g, b);

      // Apply hue rotation
      hsl.h = (hsl.h + hue / 360 + 1) % 1;

      // Apply saturation
      hsl.s = Math.max(0, Math.min(1, hsl.s * saturation));

      // Convert back to RGB
      const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);

      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
    }
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

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

    return { h, s, l };
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

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  applySharpen() {
    const amount = this.filters.sharpen / 100;
    const imageData = this.ctx.getImageData(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    const data = imageData.data;
    const width = this.previewCanvas.width;
    const height = this.previewCanvas.height;

    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];

    const result = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          result[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = result[i];
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  applyVignette() {
    const width = this.previewCanvas.width;
    const height = this.previewCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);
    const strength = this.filters.vignette / 100;

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, radius * 0.3,
      centerX, centerY, radius
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  applyFilter() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = this.originalImage.width;
    fullCanvas.height = this.originalImage.height;
    const fullCtx = fullCanvas.getContext('2d');

    // Draw original image at full resolution
    fullCtx.drawImage(this.originalImage, 0, 0);

    // Get image data and apply filters
    const imageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
    const data = imageData.data;

    this.applyBrightnessContrast(data);
    this.applySaturationHue(data);

    fullCtx.putImageData(imageData, 0, 0);

    // Apply blur
    if (this.filters.blur > 0) {
      const scaledBlur = this.filters.blur * (this.originalImage.width / this.previewCanvas.width);
      fullCtx.filter = `blur(${scaledBlur}px)`;
      fullCtx.drawImage(fullCanvas, 0, 0);
      fullCtx.filter = 'none';
    }

    // Apply sharpen on full canvas
    if (this.filters.sharpen > 0) {
      this.applySharpenToCanvas(fullCtx, fullCanvas.width, fullCanvas.height);
    }

    // Apply vignette on full canvas
    if (this.filters.vignette > 0) {
      this.applyVignetteToCanvas(fullCtx, fullCanvas.width, fullCanvas.height);
    }

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('濾鏡套用成功！', 'success');
  }

  applySharpenToCanvas(ctx, width, height) {
    const amount = this.filters.sharpen / 100;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];

    const result = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          result[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = result[i];
    }

    ctx.putImageData(imageData, 0, 0);
  }

  applyVignetteToCanvas(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);
    const strength = this.filters.vignette / 100;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.3,
      centerX, centerY, radius
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用濾鏡', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `filtered_${Date.now()}.png`;
    link.href = this.resultDataUrl;
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.resultDataUrl = null;

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.editorSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset filters
    this.filters = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sharpen: 0,
      vignette: 0
    };

    this.updateSliders();

    // Reset preset buttons
    this.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === 'original');
    });

    // Clear canvas
    this.ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageFilter();
});
