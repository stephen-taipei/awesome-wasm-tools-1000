/**
 * IMG-032 自動增強
 * 一鍵自動優化圖片（亮度、對比、飽和度）
 */

class AutoEnhanceTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.enhanceMode = 'auto';
    this.strength = 50;
    this.analysis = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.enhancePanel = document.getElementById('enhancePanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    this.strengthSlider = document.getElementById('strengthSlider');
    this.strengthValue = document.getElementById('strengthValue');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.analysisResult = document.getElementById('analysisResult');
    this.brightnessScore = document.getElementById('brightnessScore');
    this.contrastScore = document.getElementById('contrastScore');
    this.saturationScore = document.getElementById('saturationScore');
    this.sharpnessScore = document.getElementById('sharpnessScore');

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

    // Enhance mode selection
    document.querySelectorAll('.enhance-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.enhance-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        this.enhanceMode = option.dataset.mode;
        this.updatePreview();
      });
    });

    // Strength slider
    this.strengthSlider.addEventListener('input', () => {
      this.strength = parseInt(this.strengthSlider.value);
      this.strengthValue.textContent = `${this.strength}%`;
      this.updatePreview();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyEnhancement());
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

        this.enhancePanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        // Analyze the image
        this.analyzeImage();
        this.updatePreview();
        this.showStatus('success', '圖片載入成功，已分析圖片特徵');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  analyzeImage() {
    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 400);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalBrightness = 0;
    let totalSaturation = 0;
    let minBrightness = 255;
    let maxBrightness = 0;

    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate brightness (luminance)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);

      // Calculate saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let s = 0;
      if (max !== min) {
        s = l > 0.5 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
      }
      totalSaturation += s;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const avgSaturation = (totalSaturation / pixelCount) * 100;
    const contrast = maxBrightness - minBrightness;

    // Calculate sharpness (using simple edge detection)
    let edgeSum = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gx = Math.abs(data[idx] - data[idx - 4]) + Math.abs(data[idx] - data[idx + 4]);
        const gy = Math.abs(data[idx] - data[idx - width * 4]) + Math.abs(data[idx] - data[idx + width * 4]);
        edgeSum += gx + gy;
      }
    }
    const sharpness = (edgeSum / ((width - 2) * (height - 2))) / 4;

    this.analysis = {
      brightness: avgBrightness,
      contrast: contrast,
      saturation: avgSaturation,
      sharpness: sharpness
    };

    // Display analysis results
    this.analysisResult.style.display = 'block';

    this.brightnessScore.textContent = avgBrightness.toFixed(0);
    this.brightnessScore.className = `value ${avgBrightness < 80 ? 'low' : avgBrightness > 180 ? 'high' : 'medium'}`;

    this.contrastScore.textContent = contrast.toFixed(0);
    this.contrastScore.className = `value ${contrast < 100 ? 'low' : contrast > 200 ? 'high' : 'medium'}`;

    this.saturationScore.textContent = avgSaturation.toFixed(0);
    this.saturationScore.className = `value ${avgSaturation < 20 ? 'low' : avgSaturation > 50 ? 'high' : 'medium'}`;

    this.sharpnessScore.textContent = sharpness.toFixed(1);
    this.sharpnessScore.className = `value ${sharpness < 10 ? 'low' : sharpness > 30 ? 'high' : 'medium'}`;
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
    this.applyEnhance(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyEnhance(imageData) {
    const data = imageData.data;
    const factor = this.strength / 100;

    // Get enhancement parameters based on mode
    const params = this.getEnhanceParams();

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Convert to HSL
      let [h, s, l] = this.rgbToHsl(r, g, b);

      // Apply brightness adjustment
      if (params.brightness !== 0) {
        l = l + (params.brightness / 100) * factor;
        l = Math.max(0, Math.min(1, l));
      }

      // Apply contrast
      if (params.contrast !== 0) {
        const contrastFactor = 1 + (params.contrast / 100) * factor;
        l = (l - 0.5) * contrastFactor + 0.5;
        l = Math.max(0, Math.min(1, l));
      }

      // Apply saturation
      if (params.saturation !== 0) {
        const satFactor = 1 + (params.saturation / 100) * factor;
        s = s * satFactor;
        s = Math.max(0, Math.min(1, s));
      }

      // Apply vibrance (smart saturation)
      if (params.vibrance !== 0) {
        const vibFactor = (params.vibrance / 100) * factor;
        const satBoost = (1 - s) * vibFactor;
        s = Math.max(0, Math.min(1, s + satBoost * 0.5));
      }

      // Convert back to RGB
      [r, g, b] = this.hslToRgb(h, s, l);

      // Apply highlights/shadows for HDR mode
      if (params.highlights !== 0 || params.shadows !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance > 128 && params.highlights !== 0) {
          const highlightFactor = 1 + (params.highlights / 100) * factor * ((luminance - 128) / 127);
          r = Math.min(255, r * highlightFactor);
          g = Math.min(255, g * highlightFactor);
          b = Math.min(255, b * highlightFactor);
        }

        if (luminance < 128 && params.shadows !== 0) {
          const shadowFactor = 1 + (params.shadows / 100) * factor * ((128 - luminance) / 128);
          r = Math.min(255, r * shadowFactor);
          g = Math.min(255, g * shadowFactor);
          b = Math.min(255, b * shadowFactor);
        }
      }

      // Apply warmth for portrait mode
      if (params.warmth !== 0) {
        const warmFactor = (params.warmth / 100) * factor;
        r = Math.min(255, r + (255 - r) * warmFactor * 0.1);
        b = Math.max(0, b - b * warmFactor * 0.1);
      }

      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }

  getEnhanceParams() {
    // Default params
    let params = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      vibrance: 0,
      highlights: 0,
      shadows: 0,
      warmth: 0
    };

    switch (this.enhanceMode) {
      case 'auto':
        // Smart auto based on analysis
        if (this.analysis) {
          if (this.analysis.brightness < 100) params.brightness = 20;
          else if (this.analysis.brightness > 180) params.brightness = -10;

          if (this.analysis.contrast < 150) params.contrast = 20;

          if (this.analysis.saturation < 30) params.vibrance = 30;
        } else {
          params = { brightness: 10, contrast: 15, vibrance: 20, saturation: 0, highlights: 0, shadows: 0, warmth: 0 };
        }
        break;

      case 'portrait':
        params = {
          brightness: 5,
          contrast: 10,
          saturation: -5,
          vibrance: 15,
          highlights: -10,
          shadows: 15,
          warmth: 15
        };
        break;

      case 'landscape':
        params = {
          brightness: 5,
          contrast: 20,
          saturation: 25,
          vibrance: 30,
          highlights: -5,
          shadows: 10,
          warmth: 0
        };
        break;

      case 'lowlight':
        params = {
          brightness: 35,
          contrast: 20,
          saturation: 10,
          vibrance: 15,
          highlights: -20,
          shadows: 40,
          warmth: 5
        };
        break;

      case 'vivid':
        params = {
          brightness: 5,
          contrast: 30,
          saturation: 40,
          vibrance: 35,
          highlights: 0,
          shadows: 0,
          warmth: 0
        };
        break;

      case 'hdr':
        params = {
          brightness: 0,
          contrast: 25,
          saturation: 15,
          vibrance: 20,
          highlights: -30,
          shadows: 35,
          warmth: 0
        };
        break;
    }

    return params;
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

  async applyEnhancement() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用自動增強...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用增強效果...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyEnhance(imageData);
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
      this.showStatus('success', '自動增強完成！');

    } catch (error) {
      this.showStatus('error', `處理失敗：${error.message}`);
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
    link.download = `${originalName}_enhanced.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.analysis = null;

    this.strength = 50;
    this.strengthSlider.value = 50;
    this.strengthValue.textContent = '50%';

    this.enhanceMode = 'auto';
    document.querySelectorAll('.enhance-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.mode === 'auto');
    });

    this.fileInput.value = '';
    this.enhancePanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';
    this.analysisResult.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AutoEnhanceTool();
});
