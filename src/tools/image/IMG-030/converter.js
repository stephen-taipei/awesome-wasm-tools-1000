/**
 * IMG-030 色階調整
 * 調整圖片輸入輸出色階範圍
 */

class LevelsTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.activeChannel = 'rgb';
    this.levels = {
      rgb: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      red: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      green: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      blue: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.levelsPanel = document.getElementById('levelsPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.histogramCanvas = document.getElementById('histogramCanvas');
    this.histCtx = this.histogramCanvas.getContext('2d');

    this.channelTabs = document.querySelectorAll('.channel-tab');

    this.inputBlackSlider = document.getElementById('inputBlackSlider');
    this.inputBlackValue = document.getElementById('inputBlackValue');
    this.gammaSlider = document.getElementById('gammaSlider');
    this.gammaValue = document.getElementById('gammaValue');
    this.inputWhiteSlider = document.getElementById('inputWhiteSlider');
    this.inputWhiteValue = document.getElementById('inputWhiteValue');
    this.outputBlackSlider = document.getElementById('outputBlackSlider');
    this.outputBlackValue = document.getElementById('outputBlackValue');
    this.outputWhiteSlider = document.getElementById('outputWhiteSlider');
    this.outputWhiteValue = document.getElementById('outputWhiteValue');

    this.resetLevelsBtn = document.getElementById('resetLevelsBtn');
    this.autoLevelsBtn = document.getElementById('autoLevelsBtn');
    this.autoContrastBtn = document.getElementById('autoContrastBtn');
    this.autoColorBtn = document.getElementById('autoColorBtn');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
    this.resizeHistogram();
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

    // Channel tabs
    this.channelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.channelTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeChannel = tab.dataset.channel;
        this.updateSliders();
        this.drawHistogram();
      });
    });

    // Sliders
    this.inputBlackSlider.addEventListener('input', () => {
      const val = parseInt(this.inputBlackSlider.value);
      this.levels[this.activeChannel].inputBlack = val;
      this.inputBlackValue.textContent = val;
      this.updatePreview();
    });

    this.gammaSlider.addEventListener('input', () => {
      const val = parseFloat(this.gammaSlider.value);
      this.levels[this.activeChannel].gamma = val;
      this.gammaValue.textContent = val.toFixed(2);
      this.updatePreview();
    });

    this.inputWhiteSlider.addEventListener('input', () => {
      const val = parseInt(this.inputWhiteSlider.value);
      this.levels[this.activeChannel].inputWhite = val;
      this.inputWhiteValue.textContent = val;
      this.updatePreview();
    });

    this.outputBlackSlider.addEventListener('input', () => {
      const val = parseInt(this.outputBlackSlider.value);
      this.levels[this.activeChannel].outputBlack = val;
      this.outputBlackValue.textContent = val;
      this.updatePreview();
    });

    this.outputWhiteSlider.addEventListener('input', () => {
      const val = parseInt(this.outputWhiteSlider.value);
      this.levels[this.activeChannel].outputWhite = val;
      this.outputWhiteValue.textContent = val;
      this.updatePreview();
    });

    // Auto buttons
    this.resetLevelsBtn.addEventListener('click', () => this.resetLevels());
    this.autoLevelsBtn.addEventListener('click', () => this.autoLevels());
    this.autoContrastBtn.addEventListener('click', () => this.autoContrast());
    this.autoColorBtn.addEventListener('click', () => this.autoColor());

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeHistogram();
      this.drawHistogram();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyAdjustments());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  resizeHistogram() {
    const rect = this.histogramCanvas.getBoundingClientRect();
    this.histogramCanvas.width = rect.width * 2;
    this.histogramCanvas.height = rect.height * 2;
    this.histCtx.scale(2, 2);
    this.histWidth = rect.width;
    this.histHeight = rect.height;
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

        this.levelsPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.calculateHistogram();
        this.drawHistogram();
        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請調整色階');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  calculateHistogram() {
    const tempCanvas = document.createElement('canvas');
    const tempWidth = Math.min(this.originalImage.naturalWidth, 400);
    const tempHeight = Math.round(tempWidth * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    tempCanvas.width = tempWidth;
    tempCanvas.height = tempHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0, tempWidth, tempHeight);
    const imageData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);

    this.histograms = {
      rgb: new Array(256).fill(0),
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0)
    };

    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      this.histograms.rgb[lum]++;
      this.histograms.red[r]++;
      this.histograms.green[g]++;
      this.histograms.blue[b]++;
    }
  }

  drawHistogram() {
    const ctx = this.histCtx;
    const w = this.histWidth;
    const h = this.histHeight;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    if (!this.histograms) return;

    const hist = this.histograms[this.activeChannel];
    const maxVal = Math.max(...hist);

    // Draw histogram
    const color = this.activeChannel === 'rgb' ? 'rgba(200, 200, 200, 0.8)' :
                  this.activeChannel === 'red' ? 'rgba(255, 100, 100, 0.8)' :
                  this.activeChannel === 'green' ? 'rgba(100, 255, 100, 0.8)' :
                  'rgba(100, 100, 255, 0.8)';

    ctx.fillStyle = color;
    for (let i = 0; i < 256; i++) {
      const barHeight = (hist[i] / maxVal) * h;
      ctx.fillRect(i / 255 * w, h - barHeight, w / 256 + 1, barHeight);
    }

    // Draw level markers
    const level = this.levels[this.activeChannel];

    // Input black
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, level.inputBlack / 255 * w, h);

    // Input white
    ctx.fillRect(level.inputWhite / 255 * w, 0, w, h);

    // Triangular markers
    ctx.fillStyle = '#fff';
    this.drawTriangle(ctx, level.inputBlack / 255 * w, h, 8, true);
    this.drawTriangle(ctx, level.inputWhite / 255 * w, h, 8, true);

    // Gamma marker (at midpoint)
    const gammaX = this.gammaToX(level.gamma, level.inputBlack, level.inputWhite);
    ctx.fillStyle = '#888';
    this.drawTriangle(ctx, gammaX / 255 * w, h, 6, true);
  }

  drawTriangle(ctx, x, y, size, up) {
    ctx.beginPath();
    if (up) {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
    } else {
      ctx.moveTo(x, y + size);
      ctx.lineTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  gammaToX(gamma, black, white) {
    // Gamma 1.0 = midpoint, lower gamma = darker midtones (higher x), higher gamma = brighter midtones (lower x)
    const mid = (black + white) / 2;
    const range = (white - black) / 2;
    return mid + range * (1 - gamma) * 0.3;
  }

  updateSliders() {
    const level = this.levels[this.activeChannel];
    this.inputBlackSlider.value = level.inputBlack;
    this.inputBlackValue.textContent = level.inputBlack;
    this.gammaSlider.value = level.gamma;
    this.gammaValue.textContent = level.gamma.toFixed(2);
    this.inputWhiteSlider.value = level.inputWhite;
    this.inputWhiteValue.textContent = level.inputWhite;
    this.outputBlackSlider.value = level.outputBlack;
    this.outputBlackValue.textContent = level.outputBlack;
    this.outputWhiteSlider.value = level.outputWhite;
    this.outputWhiteValue.textContent = level.outputWhite;
  }

  resetLevels() {
    this.levels = {
      rgb: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      red: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      green: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      blue: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 }
    };
    this.updateSliders();
    this.drawHistogram();
    this.updatePreview();
  }

  autoLevels() {
    if (!this.histograms) return;

    // Find black and white points (ignore 0.1% of pixels)
    const findLimits = (hist) => {
      const total = hist.reduce((a, b) => a + b, 0);
      const threshold = total * 0.001;

      let sum = 0;
      let black = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        if (sum > threshold) {
          black = i;
          break;
        }
      }

      sum = 0;
      let white = 255;
      for (let i = 255; i >= 0; i--) {
        sum += hist[i];
        if (sum > threshold) {
          white = i;
          break;
        }
      }

      return { black, white };
    };

    const limits = findLimits(this.histograms.rgb);
    this.levels.rgb.inputBlack = limits.black;
    this.levels.rgb.inputWhite = limits.white;

    this.updateSliders();
    this.drawHistogram();
    this.updatePreview();
  }

  autoContrast() {
    if (!this.histograms) return;

    // Stretch histogram to full range
    const findLimits = (hist) => {
      let black = 0, white = 255;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > 0) { black = i; break; }
      }
      for (let i = 255; i >= 0; i--) {
        if (hist[i] > 0) { white = i; break; }
      }
      return { black, white };
    };

    const limits = findLimits(this.histograms.rgb);
    this.levels.rgb.inputBlack = limits.black;
    this.levels.rgb.inputWhite = limits.white;

    this.updateSliders();
    this.drawHistogram();
    this.updatePreview();
  }

  autoColor() {
    if (!this.histograms) return;

    // Auto levels for each channel
    const findLimits = (hist) => {
      const total = hist.reduce((a, b) => a + b, 0);
      const threshold = total * 0.005;

      let sum = 0, black = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        if (sum > threshold) { black = i; break; }
      }

      sum = 0;
      let white = 255;
      for (let i = 255; i >= 0; i--) {
        sum += hist[i];
        if (sum > threshold) { white = i; break; }
      }

      return { black, white };
    };

    ['red', 'green', 'blue'].forEach(channel => {
      const limits = findLimits(this.histograms[channel]);
      this.levels[channel].inputBlack = limits.black;
      this.levels[channel].inputWhite = limits.white;
    });

    this.updateSliders();
    this.drawHistogram();
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
    this.applyLevels(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyLevels(imageData) {
    const data = imageData.data;

    // Generate lookup tables
    const luts = {};
    ['rgb', 'red', 'green', 'blue'].forEach(channel => {
      luts[channel] = this.generateLUT(this.levels[channel]);
    });

    for (let i = 0; i < data.length; i += 4) {
      // Apply RGB levels first, then individual channels
      let r = luts.rgb[data[i]];
      let g = luts.rgb[data[i + 1]];
      let b = luts.rgb[data[i + 2]];

      // Then apply individual channel levels
      data[i] = luts.red[r];
      data[i + 1] = luts.green[g];
      data[i + 2] = luts.blue[b];
    }
  }

  generateLUT(level) {
    const lut = new Uint8Array(256);
    const { inputBlack, inputWhite, gamma, outputBlack, outputWhite } = level;

    for (let i = 0; i < 256; i++) {
      // Input levels
      let val = (i - inputBlack) / (inputWhite - inputBlack);
      val = Math.max(0, Math.min(1, val));

      // Gamma correction
      val = Math.pow(val, 1 / gamma);

      // Output levels
      val = outputBlack + val * (outputWhite - outputBlack);

      lut[i] = Math.max(0, Math.min(255, Math.round(val)));
    }

    return lut;
  }

  async applyAdjustments() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用色階調整...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用色階...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyLevels(imageData);
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
      this.showStatus('success', '色階調整套用完成！');

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
    link.download = `${originalName}_levels.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.histograms = null;
    this.resetLevels();

    this.fileInput.value = '';
    this.levelsPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';

    this.channelTabs.forEach(t => t.classList.remove('active'));
    this.channelTabs[0].classList.add('active');
    this.activeChannel = 'rgb';

    // Clear histogram
    this.histCtx.fillStyle = '#0a0a1a';
    this.histCtx.fillRect(0, 0, this.histWidth, this.histHeight);
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new LevelsTool();
});
