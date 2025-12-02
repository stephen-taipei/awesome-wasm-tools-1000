/**
 * IMG-031 白平衡校正
 * 校正圖片白平衡，修復偏色問題
 */

class WhiteBalanceTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.temperature = 0;
    this.tint = 0;
    this.currentMode = 'manual';
    this.isEyedropperActive = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.wbPanel = document.getElementById('wbPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    this.tempSlider = document.getElementById('tempSlider');
    this.tempValue = document.getElementById('tempValue');
    this.tintSlider = document.getElementById('tintSlider');
    this.tintValue = document.getElementById('tintValue');

    this.resetWbBtn = document.getElementById('resetWbBtn');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.autoCorrectBtn = document.getElementById('autoCorrectBtn');

    this.sampledColorInfo = document.getElementById('sampledColorInfo');
    this.colorSwatch = document.getElementById('colorSwatch');
    this.colorRgb = document.getElementById('colorRgb');

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

    // Mode tabs
    document.querySelectorAll('.wb-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchMode(tab.dataset.mode));
    });

    // Sliders
    this.tempSlider.addEventListener('input', () => {
      this.temperature = parseInt(this.tempSlider.value);
      this.tempValue.textContent = this.temperature;
      this.updatePreview();
    });

    this.tintSlider.addEventListener('input', () => {
      this.tint = parseInt(this.tintSlider.value);
      this.tintValue.textContent = this.tint;
      this.updatePreview();
    });

    // Preset buttons
    document.querySelectorAll('.preset-wb-btn[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });

    // Auto correct
    this.autoCorrectBtn.addEventListener('click', () => this.autoCorrect());

    // Eyedropper on preview image
    this.previewImage.addEventListener('click', (e) => this.handleEyedropper(e));

    // Reset button
    this.resetWbBtn.addEventListener('click', () => this.resetValues());

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyWhiteBalance());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  switchMode(mode) {
    this.currentMode = mode;

    document.querySelectorAll('.wb-mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    document.getElementById('manualMode').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('eyedropperMode').style.display = mode === 'eyedropper' ? 'block' : 'none';
    document.getElementById('autoMode').style.display = mode === 'auto' ? 'block' : 'none';

    this.isEyedropperActive = mode === 'eyedropper';
    this.previewImage.style.cursor = this.isEyedropperActive ? 'crosshair' : 'default';
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

        this.wbPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請調整白平衡');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyPreset(preset) {
    const presets = {
      daylight: { temp: 0, tint: 0 },
      cloudy: { temp: 15, tint: 5 },
      shade: { temp: 25, tint: 10 },
      tungsten: { temp: -55, tint: 5 },
      fluorescent: { temp: -15, tint: 25 },
      flash: { temp: 10, tint: 0 }
    };

    const p = presets[preset];
    if (p) {
      this.temperature = p.temp;
      this.tint = p.tint;
      this.tempSlider.value = this.temperature;
      this.tempValue.textContent = this.temperature;
      this.tintSlider.value = this.tint;
      this.tintValue.textContent = this.tint;
      this.updatePreview();
    }
  }

  handleEyedropper(e) {
    if (!this.isEyedropperActive || !this.originalImage) return;

    const rect = this.previewImage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Get the color at the clicked point
    const canvas = document.createElement('canvas');
    const size = 600;
    const width = Math.min(this.originalImage.naturalWidth, size);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const pixelX = Math.floor(x * width);
    const pixelY = Math.floor(y * height);
    const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;

    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    // Show sampled color
    this.sampledColorInfo.style.display = 'flex';
    this.colorSwatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    this.colorRgb.textContent = `RGB(${r}, ${g}, ${b})`;

    // Calculate white balance correction based on the sampled "gray" point
    this.correctFromGrayPoint(r, g, b);
  }

  correctFromGrayPoint(r, g, b) {
    // The idea: if the user clicked on what should be gray/white,
    // we need to adjust so that R=G=B for that point
    const avg = (r + g + b) / 3;

    // Calculate the deviation from neutral gray
    // Temperature: R vs B balance
    // Tint: G vs (R+B)/2 balance

    const rDiff = r - avg;
    const bDiff = b - avg;
    const gDiff = g - avg;

    // Convert to temperature/tint adjustments
    // Negative temp = more blue, positive = more orange
    this.temperature = Math.round((bDiff - rDiff) * 0.5);
    this.temperature = Math.max(-100, Math.min(100, this.temperature));

    // Negative tint = more green, positive = more magenta
    this.tint = Math.round(-gDiff * 0.5);
    this.tint = Math.max(-100, Math.min(100, this.tint));

    this.tempSlider.value = this.temperature;
    this.tempValue.textContent = this.temperature;
    this.tintSlider.value = this.tint;
    this.tintValue.textContent = this.tint;

    this.updatePreview();
  }

  autoCorrect() {
    if (!this.originalImage) return;

    // Gray World assumption: average color should be neutral gray
    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 600);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    const avgAll = (avgR + avgG + avgB) / 3;

    // Calculate corrections
    const rDiff = avgR - avgAll;
    const bDiff = avgB - avgAll;
    const gDiff = avgG - avgAll;

    this.temperature = Math.round((rDiff - bDiff) * 0.8);
    this.temperature = Math.max(-100, Math.min(100, this.temperature));

    this.tint = Math.round((gDiff) * -0.8);
    this.tint = Math.max(-100, Math.min(100, this.tint));

    this.tempSlider.value = this.temperature;
    this.tempValue.textContent = this.temperature;
    this.tintSlider.value = this.tint;
    this.tintValue.textContent = this.tint;

    this.updatePreview();
    this.showStatus('success', '自動白平衡校正完成');
  }

  resetValues() {
    this.temperature = 0;
    this.tint = 0;

    this.tempSlider.value = 0;
    this.tempValue.textContent = '0';
    this.tintSlider.value = 0;
    this.tintValue.textContent = '0';

    this.sampledColorInfo.style.display = 'none';

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
    this.applyWB(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyWB(imageData) {
    const data = imageData.data;

    // Temperature: adjust R and B channels
    // Positive temp = warmer (more orange) = increase R, decrease B
    // Negative temp = cooler (more blue) = decrease R, increase B
    const tempFactor = this.temperature / 100;

    // Tint: adjust G channel relative to R and B
    // Positive tint = more magenta = decrease G
    // Negative tint = more green = increase G
    const tintFactor = this.tint / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply temperature
      if (tempFactor > 0) {
        // Warmer: boost R, reduce B
        r = r + (255 - r) * tempFactor * 0.3;
        b = b - b * tempFactor * 0.3;
      } else {
        // Cooler: reduce R, boost B
        r = r + r * tempFactor * 0.3;
        b = b + (255 - b) * (-tempFactor) * 0.3;
      }

      // Apply tint
      if (tintFactor > 0) {
        // More magenta: reduce G, slightly boost R and B
        g = g - g * tintFactor * 0.3;
        r = r + (255 - r) * tintFactor * 0.1;
        b = b + (255 - b) * tintFactor * 0.1;
      } else {
        // More green: boost G, slightly reduce R and B
        g = g + (255 - g) * (-tintFactor) * 0.3;
        r = r + r * tintFactor * 0.1;
        b = b + b * tintFactor * 0.1;
      }

      data[i] = Math.max(0, Math.min(255, Math.round(r)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }

  async applyWhiteBalance() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用白平衡校正...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用白平衡...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyWB(imageData);
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
      this.showStatus('success', '白平衡校正完成！');

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
    link.download = `${originalName}_wb.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.resetValues();

    this.fileInput.value = '';
    this.wbPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';

    this.switchMode('manual');
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new WhiteBalanceTool();
});
