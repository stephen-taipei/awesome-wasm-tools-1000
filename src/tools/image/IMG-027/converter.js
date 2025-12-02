/**
 * IMG-027 亮度/對比度調整
 * 調整圖片亮度與對比度
 */

class BrightnessContrastTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    // Adjustment values
    this.brightness = 0;
    this.exposure = 0;
    this.highlights = 0;
    this.shadows = 0;
    this.contrast = 0;
    this.whites = 0;
    this.blacks = 0;

    this.presets = {
      auto: { brightness: 10, exposure: 5, highlights: -10, shadows: 20, contrast: 15, whites: 5, blacks: -5 },
      brighten: { brightness: 30, exposure: 15, highlights: 0, shadows: 0, contrast: 5, whites: 0, blacks: 0 },
      darken: { brightness: -30, exposure: -15, highlights: 0, shadows: 0, contrast: 5, whites: 0, blacks: 0 },
      'high-contrast': { brightness: 0, exposure: 0, highlights: -20, shadows: -20, contrast: 50, whites: 20, blacks: -20 },
      'low-contrast': { brightness: 5, exposure: 0, highlights: 20, shadows: 20, contrast: -30, whites: -10, blacks: 10 },
      vivid: { brightness: 10, exposure: 10, highlights: -10, shadows: 15, contrast: 25, whites: 10, blacks: -10 }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.presetPanel = document.getElementById('presetPanel');
    this.adjustPanel = document.getElementById('adjustPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.histogramCanvas = document.getElementById('histogramCanvas');

    // Sliders
    this.brightnessSlider = document.getElementById('brightnessSlider');
    this.brightnessValue = document.getElementById('brightnessValue');
    this.exposureSlider = document.getElementById('exposureSlider');
    this.exposureValue = document.getElementById('exposureValue');
    this.highlightsSlider = document.getElementById('highlightsSlider');
    this.highlightsValue = document.getElementById('highlightsValue');
    this.shadowsSlider = document.getElementById('shadowsSlider');
    this.shadowsValue = document.getElementById('shadowsValue');
    this.contrastSlider = document.getElementById('contrastSlider');
    this.contrastValue = document.getElementById('contrastValue');
    this.whitesSlider = document.getElementById('whitesSlider');
    this.whitesValue = document.getElementById('whitesValue');
    this.blacksSlider = document.getElementById('blacksSlider');
    this.blacksValue = document.getElementById('blacksValue');

    this.resetValuesBtn = document.getElementById('resetValuesBtn');
    this.presetBtns = document.querySelectorAll('.preset-btn');
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

    // Preset buttons
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Reset values button
    this.resetValuesBtn.addEventListener('click', () => this.resetValues());

    // Sliders
    const sliders = [
      { slider: this.brightnessSlider, value: this.brightnessValue, prop: 'brightness' },
      { slider: this.exposureSlider, value: this.exposureValue, prop: 'exposure' },
      { slider: this.highlightsSlider, value: this.highlightsValue, prop: 'highlights' },
      { slider: this.shadowsSlider, value: this.shadowsValue, prop: 'shadows' },
      { slider: this.contrastSlider, value: this.contrastValue, prop: 'contrast' },
      { slider: this.whitesSlider, value: this.whitesValue, prop: 'whites' },
      { slider: this.blacksSlider, value: this.blacksValue, prop: 'blacks' }
    ];

    sliders.forEach(({ slider, value, prop }) => {
      slider.addEventListener('input', () => {
        this[prop] = parseInt(slider.value);
        value.textContent = this[prop];
        this.presetBtns.forEach(b => b.classList.remove('active'));
        this.updatePreview();
      });
    });

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

        this.presetPanel.style.display = 'block';
        this.adjustPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.drawHistogram();
        this.showStatus('success', '圖片載入成功，請調整參數');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    this.brightness = preset.brightness;
    this.exposure = preset.exposure;
    this.highlights = preset.highlights;
    this.shadows = preset.shadows;
    this.contrast = preset.contrast;
    this.whites = preset.whites;
    this.blacks = preset.blacks;

    this.updateSliders();
    this.updatePreview();
  }

  updateSliders() {
    this.brightnessSlider.value = this.brightness;
    this.brightnessValue.textContent = this.brightness;
    this.exposureSlider.value = this.exposure;
    this.exposureValue.textContent = this.exposure;
    this.highlightsSlider.value = this.highlights;
    this.highlightsValue.textContent = this.highlights;
    this.shadowsSlider.value = this.shadows;
    this.shadowsValue.textContent = this.shadows;
    this.contrastSlider.value = this.contrast;
    this.contrastValue.textContent = this.contrast;
    this.whitesSlider.value = this.whites;
    this.whitesValue.textContent = this.whites;
    this.blacksSlider.value = this.blacks;
    this.blacksValue.textContent = this.blacks;
  }

  resetValues() {
    this.brightness = 0;
    this.exposure = 0;
    this.highlights = 0;
    this.shadows = 0;
    this.contrast = 0;
    this.whites = 0;
    this.blacks = 0;

    this.updateSliders();
    this.presetBtns.forEach(b => b.classList.remove('active'));
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
    this.applyAdjustmentsToImageData(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
    this.drawHistogram(imageData);
  }

  applyAdjustmentsToImageData(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Calculate luminance for selective adjustments
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply exposure (multiplicative)
      const exposureFactor = Math.pow(2, this.exposure / 100);
      r *= exposureFactor;
      g *= exposureFactor;
      b *= exposureFactor;

      // Apply brightness (additive)
      r += this.brightness * 2.55;
      g += this.brightness * 2.55;
      b += this.brightness * 2.55;

      // Apply highlights (affect bright areas)
      if (lum > 128) {
        const highlightFactor = ((lum - 128) / 127) * (this.highlights / 100);
        r += highlightFactor * 50;
        g += highlightFactor * 50;
        b += highlightFactor * 50;
      }

      // Apply shadows (affect dark areas)
      if (lum < 128) {
        const shadowFactor = ((128 - lum) / 128) * (this.shadows / 100);
        r += shadowFactor * 50;
        g += shadowFactor * 50;
        b += shadowFactor * 50;
      }

      // Apply contrast
      const contrastFactor = (100 + this.contrast) / 100;
      r = ((r - 128) * contrastFactor) + 128;
      g = ((g - 128) * contrastFactor) + 128;
      b = ((b - 128) * contrastFactor) + 128;

      // Apply whites (lift white point)
      if (lum > 200) {
        r += this.whites * 0.5;
        g += this.whites * 0.5;
        b += this.whites * 0.5;
      }

      // Apply blacks (lower black point)
      if (lum < 55) {
        r += this.blacks * 0.5;
        g += this.blacks * 0.5;
        b += this.blacks * 0.5;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  drawHistogram(imageData) {
    const canvas = this.histogramCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    if (!imageData && this.originalImage) {
      // Get image data from original
      const tempCanvas = document.createElement('canvas');
      const tempWidth = Math.min(this.originalImage.naturalWidth, 400);
      const tempHeight = Math.round(tempWidth * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
      tempCanvas.width = tempWidth;
      tempCanvas.height = tempHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0, tempWidth, tempHeight);
      imageData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);
    }

    if (!imageData) return;

    // Calculate histogram
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);
    const lumHist = new Array(256).fill(0);

    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      rHist[data[i]]++;
      gHist[data[i + 1]]++;
      bHist[data[i + 2]]++;
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      lumHist[Math.max(0, Math.min(255, lum))]++;
    }

    // Find max for scaling
    const maxVal = Math.max(...lumHist);

    // Draw luminance histogram
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const barWidth = width / 256;
    for (let i = 0; i < 256; i++) {
      const barHeight = (lumHist[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    // Draw RGB overlays
    ctx.globalAlpha = 0.3;

    // Red
    ctx.fillStyle = '#ff0000';
    for (let i = 0; i < 256; i++) {
      const barHeight = (rHist[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    // Green
    ctx.fillStyle = '#00ff00';
    for (let i = 0; i < 256; i++) {
      const barHeight = (gHist[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    // Blue
    ctx.fillStyle = '#0000ff';
    for (let i = 0; i < 256; i++) {
      const barHeight = (bHist[i] / maxVal) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }

    ctx.globalAlpha = 1;
  }

  async applyAdjustments() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用調整...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用調整...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyAdjustmentsToImageData(imageData);
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
      this.showStatus('success', '調整套用完成！');

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
    link.download = `${originalName}_adjusted.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.resetValues();

    this.fileInput.value = '';
    this.presetPanel.style.display = 'none';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';

    // Clear histogram
    const ctx = this.histogramCanvas.getContext('2d');
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, this.histogramCanvas.width, this.histogramCanvas.height);
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BrightnessContrastTool();
});
