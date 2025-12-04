/**
 * IMG-127 圖片色彩校正
 * 專業色彩調整與白平衡校正
 */

class ColorCorrector {
  constructor() {
    this.originalImage = null;
    this.originalImageData = null;
    this.settings = this.getDefaultSettings();
    this.init();
  }

  getDefaultSettings() {
    return {
      // Basic
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      // Curves
      curveRGB: 100,
      curveR: 100,
      curveG: 100,
      curveB: 100,
      // White Balance
      temperature: 0,
      tint: 0,
      // HSL
      hue: 0,
      saturation: 0,
      lightness: 0,
      vibrance: 0
    };
  }

  init() {
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.originalImg = document.getElementById('originalImage');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.statusMessage = document.getElementById('statusMessage');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.histogramOriginal = document.getElementById('histogramOriginal');
    this.histogramResult = document.getElementById('histogramResult');
  }

  bindEvents() {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn));
    });

    // All sliders
    const sliders = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
                     'curveRGB', 'curveR', 'curveG', 'curveB',
                     'temperature', 'tint', 'hue', 'saturation', 'lightness', 'vibrance'];

    sliders.forEach(id => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.addEventListener('input', () => {
          this.settings[id] = parseInt(slider.value);
          this.updateSliderDisplay(id);
          if (this.originalImage) this.applyCorrections();
        });
      }
    });

    // White balance presets
    document.querySelectorAll('[data-wb]').forEach(item => {
      item.addEventListener('click', () => this.applyWBPreset(item.dataset.wb));
    });

    // Style presets
    document.querySelectorAll('[data-preset]').forEach(item => {
      item.addEventListener('click', () => this.applyStylePreset(item.dataset.preset));
    });

    this.applyBtn.addEventListener('click', () => this.applyCorrections());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave() {
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImage(file);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImg.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.applyBtn.disabled = false;

        // Store original image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);

        // Set result canvas size
        this.resultCanvas.width = img.width;
        this.resultCanvas.height = img.height;

        // Initial apply
        this.applyCorrections();

        // Draw original histogram
        this.drawHistogram(this.originalImageData, this.histogramOriginal);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  switchTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  }

  updateSliderDisplay(id) {
    const valueEl = document.getElementById(`${id}Value`);
    if (!valueEl) return;

    let value = this.settings[id];
    if (id.startsWith('curve')) {
      valueEl.textContent = (value / 100).toFixed(1);
    } else if (id === 'hue') {
      valueEl.textContent = `${value}°`;
    } else {
      valueEl.textContent = value;
    }
  }

  applyWBPreset(preset) {
    const presets = {
      auto: { temperature: 0, tint: 0 },
      daylight: { temperature: 10, tint: 5 },
      cloudy: { temperature: 20, tint: 10 },
      tungsten: { temperature: -40, tint: -10 },
      fluorescent: { temperature: -20, tint: 30 }
    };

    const p = presets[preset];
    if (p) {
      this.settings.temperature = p.temperature;
      this.settings.tint = p.tint;
      document.getElementById('temperature').value = p.temperature;
      document.getElementById('tint').value = p.tint;
      this.updateSliderDisplay('temperature');
      this.updateSliderDisplay('tint');
      if (this.originalImage) this.applyCorrections();
    }
  }

  applyStylePreset(preset) {
    const presets = {
      vivid: { saturation: 30, vibrance: 20, contrast: 15 },
      natural: { saturation: 0, vibrance: 10, contrast: 5 },
      portrait: { saturation: -10, vibrance: 15, contrast: 10, shadows: 10 },
      landscape: { saturation: 20, vibrance: 25, contrast: 20, highlights: -10 },
      bw: { saturation: -100, contrast: 20 },
      sepia: { saturation: -70, temperature: 30, tint: 10 },
      cool: { temperature: -30, tint: 5, saturation: 10 },
      warm: { temperature: 30, tint: 10, saturation: 10 },
      cinema: { contrast: 25, saturation: -15, shadows: 15, blacks: -10 },
      reset: this.getDefaultSettings()
    };

    const p = presets[preset];
    if (p) {
      // Reset to defaults first for non-reset presets
      if (preset !== 'reset') {
        this.settings = { ...this.getDefaultSettings(), ...p };
      } else {
        this.settings = this.getDefaultSettings();
      }

      // Update all sliders
      Object.keys(this.settings).forEach(key => {
        const slider = document.getElementById(key);
        if (slider) {
          slider.value = this.settings[key];
          this.updateSliderDisplay(key);
        }
      });

      if (this.originalImage) this.applyCorrections();
    }
  }

  applyCorrections() {
    if (!this.originalImageData) return;

    const width = this.originalImageData.width;
    const height = this.originalImageData.height;
    const srcData = this.originalImageData.data;
    const resultData = new Uint8ClampedArray(srcData);

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Apply exposure
      if (this.settings.exposure !== 0) {
        const factor = Math.pow(2, this.settings.exposure / 50);
        r *= factor;
        g *= factor;
        b *= factor;
      }

      // Apply contrast
      if (this.settings.contrast !== 0) {
        const factor = (100 + this.settings.contrast) / 100;
        r = (r - 128) * factor + 128;
        g = (g - 128) * factor + 128;
        b = (b - 128) * factor + 128;
      }

      // Apply highlights and shadows
      const lum = (r + g + b) / 3;
      if (this.settings.highlights !== 0 && lum > 128) {
        const factor = 1 + (this.settings.highlights / 100) * ((lum - 128) / 127);
        r *= factor;
        g *= factor;
        b *= factor;
      }
      if (this.settings.shadows !== 0 && lum < 128) {
        const factor = 1 + (this.settings.shadows / 100) * ((128 - lum) / 128);
        r *= factor;
        g *= factor;
        b *= factor;
      }

      // Apply whites and blacks
      if (this.settings.whites !== 0) {
        const factor = 1 + this.settings.whites / 200;
        if (r > 200) r = 200 + (r - 200) * factor;
        if (g > 200) g = 200 + (g - 200) * factor;
        if (b > 200) b = 200 + (b - 200) * factor;
      }
      if (this.settings.blacks !== 0) {
        const factor = 1 + this.settings.blacks / 200;
        if (r < 55) r = 55 - (55 - r) * factor;
        if (g < 55) g = 55 - (55 - g) * factor;
        if (b < 55) b = 55 - (55 - b) * factor;
      }

      // Apply curves (gamma)
      const gammaRGB = 100 / this.settings.curveRGB;
      const gammaR = 100 / this.settings.curveR;
      const gammaG = 100 / this.settings.curveG;
      const gammaB = 100 / this.settings.curveB;

      r = 255 * Math.pow(r / 255, gammaRGB * gammaR);
      g = 255 * Math.pow(g / 255, gammaRGB * gammaG);
      b = 255 * Math.pow(b / 255, gammaRGB * gammaB);

      // Apply temperature and tint
      if (this.settings.temperature !== 0) {
        const t = this.settings.temperature / 100;
        r += t * 30;
        b -= t * 30;
      }
      if (this.settings.tint !== 0) {
        const t = this.settings.tint / 100;
        g += t * 20;
      }

      // Convert to HSL for HSL adjustments
      let [h, s, l] = this.rgbToHsl(r, g, b);

      // Apply hue shift
      if (this.settings.hue !== 0) {
        h = (h + this.settings.hue / 360 + 1) % 1;
      }

      // Apply saturation
      if (this.settings.saturation !== 0) {
        s = Math.max(0, Math.min(1, s * (1 + this.settings.saturation / 100)));
      }

      // Apply lightness
      if (this.settings.lightness !== 0) {
        l = Math.max(0, Math.min(1, l + this.settings.lightness / 200));
      }

      // Apply vibrance (smart saturation)
      if (this.settings.vibrance !== 0) {
        const avg = (r + g + b) / 3 / 255;
        const maxC = Math.max(r, g, b) / 255;
        const satLevel = maxC - avg;
        const vibranceFactor = (1 - satLevel) * (this.settings.vibrance / 100);
        s = Math.max(0, Math.min(1, s * (1 + vibranceFactor)));
      }

      // Convert back to RGB
      [r, g, b] = this.hslToRgb(h, s, l);

      resultData[i] = Math.max(0, Math.min(255, r));
      resultData[i + 1] = Math.max(0, Math.min(255, g));
      resultData[i + 2] = Math.max(0, Math.min(255, b));
    }

    const resultImageData = new ImageData(resultData, width, height);
    this.ctx.putImageData(resultImageData, 0, 0);

    // Draw result histogram
    this.drawHistogram(resultImageData, this.histogramResult);

    this.downloadBtn.disabled = false;
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

    return [r * 255, g * 255, b * 255];
  }

  drawHistogram(imageData, canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Calculate histograms
    const histR = new Array(256).fill(0);
    const histG = new Array(256).fill(0);
    const histB = new Array(256).fill(0);

    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      histR[data[i]]++;
      histG[data[i + 1]]++;
      histB[data[i + 2]]++;
    }

    // Find max
    const maxVal = Math.max(...histR, ...histG, ...histB);

    // Draw
    const barWidth = width / 256;

    // Draw luminance (combined)
    ctx.globalAlpha = 0.5;

    ctx.fillStyle = '#ff6666';
    for (let i = 0; i < 256; i++) {
      const h = (histR[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - h, barWidth, h);
    }

    ctx.fillStyle = '#66ff66';
    for (let i = 0; i < 256; i++) {
      const h = (histG[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - h, barWidth, h);
    }

    ctx.fillStyle = '#6666ff';
    for (let i = 0; i < 256; i++) {
      const h = (histB[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - h, barWidth, h);
    }

    ctx.globalAlpha = 1;
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }

  download() {
    const link = document.createElement('a');
    link.download = `color-corrected-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.originalImageData = null;
    this.settings = this.getDefaultSettings();
    this.originalImg.src = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    // Reset all sliders
    Object.keys(this.settings).forEach(key => {
      const slider = document.getElementById(key);
      if (slider) {
        slider.value = this.settings[key];
        this.updateSliderDisplay(key);
      }
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ColorCorrector();
});
