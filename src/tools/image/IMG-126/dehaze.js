/**
 * IMG-126 圖片去霧
 * 去除霧霾提升清晰度
 */

class Dehazer {
  constructor() {
    this.originalImage = null;
    this.currentMode = 'dcp';
    this.strength = 70;
    this.contrast = 30;
    this.saturation = 50;
    this.init();
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
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.dehazeBtn = document.getElementById('dehazeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.strengthInput = document.getElementById('strength');
    this.strengthValue = document.getElementById('strengthValue');
    this.contrastInput = document.getElementById('contrast');
    this.contrastValue = document.getElementById('contrastValue');
    this.saturationInput = document.getElementById('saturation');
    this.saturationValue = document.getElementById('saturationValue');
    this.modeItems = document.querySelectorAll('.mode-item');
  }

  bindEvents() {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.modeItems.forEach(item => {
      item.addEventListener('click', () => this.selectMode(item));
    });

    this.strengthInput.addEventListener('input', () => {
      this.strength = parseInt(this.strengthInput.value);
      this.strengthValue.textContent = `${this.strength}%`;
    });

    this.contrastInput.addEventListener('input', () => {
      this.contrast = parseInt(this.contrastInput.value);
      this.contrastValue.textContent = `${this.contrast}%`;
    });

    this.saturationInput.addEventListener('input', () => {
      this.saturation = parseInt(this.saturationInput.value);
      this.saturationValue.textContent = `${this.saturation}%`;
    });

    this.dehazeBtn.addEventListener('click', () => this.dehaze());
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
        this.dehazeBtn.disabled = false;

        document.getElementById('imageSize').textContent =
          `${img.width} x ${img.height}`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  selectMode(item) {
    this.modeItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    this.currentMode = item.dataset.mode;
  }

  async dehaze() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    this.showProgress('開始處理...', 0);
    this.dehazeBtn.disabled = true;

    try {
      // Create temp canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.originalImage.width;
      tempCanvas.height = this.originalImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

      // Estimate haze level
      const hazeLevel = this.estimateHazeLevel(imageData);
      document.getElementById('hazeLevel').textContent =
        hazeLevel < 30 ? '輕微' : hazeLevel < 60 ? '中等' : '嚴重';

      // Set result canvas size
      this.resultCanvas.width = this.originalImage.width;
      this.resultCanvas.height = this.originalImage.height;

      let result;

      // Apply selected algorithm
      switch (this.currentMode) {
        case 'dcp':
          result = await this.darkChannelPrior(imageData);
          break;
        case 'clahe':
          result = await this.claheMethod(imageData);
          break;
        case 'retinex':
          result = await this.retinexMethod(imageData);
          break;
        case 'hybrid':
          result = await this.hybridMethod(imageData);
          break;
      }

      // Apply additional enhancements
      this.showProgress('應用增強效果...', 90);
      result = this.applyEnhancements(result);

      this.ctx.putImageData(result, 0, 0);

      // Calculate clarity improvement
      const originalClarity = this.calculateClarity(imageData);
      const resultClarity = this.calculateClarity(result);
      const improvement = ((resultClarity - originalClarity) / originalClarity * 100).toFixed(1);
      document.getElementById('clarityGain').textContent = `+${improvement}%`;

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.hideProgress();
      this.downloadBtn.disabled = false;
      this.showStatus('去霧完成！', 'success');

    } catch (error) {
      console.error('Dehaze error:', error);
      this.showStatus('處理失敗：' + error.message, 'error');
      this.hideProgress();
    }

    this.dehazeBtn.disabled = false;
  }

  estimateHazeLevel(imageData) {
    const data = imageData.data;
    let totalBrightness = 0;
    let totalContrast = 0;
    const pixels = data.length / 4;

    // Calculate average brightness
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixels;

    // Calculate contrast (standard deviation)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalContrast += Math.pow(brightness - avgBrightness, 2);
    }

    const contrast = Math.sqrt(totalContrast / pixels);

    // High brightness + low contrast = hazy
    const hazeScore = (avgBrightness / 255 * 50) + ((1 - contrast / 128) * 50);
    return Math.min(100, Math.max(0, hazeScore));
  }

  calculateClarity(imageData) {
    // Use Laplacian variance as clarity metric
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let variance = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3;
        const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3;
        const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3;
        const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3;

        const laplacian = Math.abs(4 * center - top - bottom - left - right);
        variance += laplacian * laplacian;
        count++;
      }
    }

    return Math.sqrt(variance / count);
  }

  // Dark Channel Prior (DCP) Algorithm
  async darkChannelPrior(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data);

    const patchSize = 15;
    const omega = this.strength / 100 * 0.95; // Haze removal strength

    this.showProgress('計算暗通道...', 10);

    // Step 1: Compute dark channel
    const darkChannel = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255;

        // Find minimum in patch
        for (let py = Math.max(0, y - patchSize); py < Math.min(height, y + patchSize); py++) {
          for (let px = Math.max(0, x - patchSize); px < Math.min(width, x + patchSize); px++) {
            const idx = (py * width + px) * 4;
            const minRGB = Math.min(data[idx], data[idx + 1], data[idx + 2]);
            minVal = Math.min(minVal, minRGB);
          }
        }

        darkChannel[y * width + x] = minVal;
      }

      if (y % 50 === 0) {
        this.showProgress(`計算暗通道... ${Math.round(y / height * 30)}%`, y / height * 30 + 10);
        await this.sleep(1);
      }
    }

    // Step 2: Estimate atmospheric light
    this.showProgress('估計大氣光...', 40);

    // Find top 0.1% brightest pixels in dark channel
    const flatDark = Array.from(darkChannel);
    const sortedIndices = flatDark
      .map((val, idx) => ({ val, idx }))
      .sort((a, b) => b.val - a.val)
      .slice(0, Math.ceil(width * height * 0.001))
      .map(item => item.idx);

    let maxIntensity = 0;
    let atmosphericLight = [255, 255, 255];

    for (const idx of sortedIndices) {
      const pixelIdx = idx * 4;
      const intensity = data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2];
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        atmosphericLight = [data[pixelIdx], data[pixelIdx + 1], data[pixelIdx + 2]];
      }
    }

    // Step 3: Compute transmission map
    this.showProgress('計算透射率圖...', 50);

    const transmission = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 1;

        for (let py = Math.max(0, y - patchSize); py < Math.min(height, y + patchSize); py++) {
          for (let px = Math.max(0, x - patchSize); px < Math.min(width, x + patchSize); px++) {
            const idx = (py * width + px) * 4;
            const normR = data[idx] / atmosphericLight[0];
            const normG = data[idx + 1] / atmosphericLight[1];
            const normB = data[idx + 2] / atmosphericLight[2];
            minVal = Math.min(minVal, normR, normG, normB);
          }
        }

        transmission[y * width + x] = 1 - omega * minVal;
      }

      if (y % 50 === 0) {
        this.showProgress(`計算透射率... ${Math.round(y / height * 30 + 50)}%`, y / height * 30 + 50);
        await this.sleep(1);
      }
    }

    // Step 4: Recover scene radiance
    this.showProgress('恢復場景...', 80);

    const t0 = 0.1; // Minimum transmission

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const t = Math.max(transmission[i], t0);

      result[idx] = Math.min(255, Math.max(0, (data[idx] - atmosphericLight[0]) / t + atmosphericLight[0]));
      result[idx + 1] = Math.min(255, Math.max(0, (data[idx + 1] - atmosphericLight[1]) / t + atmosphericLight[1]));
      result[idx + 2] = Math.min(255, Math.max(0, (data[idx + 2] - atmosphericLight[2]) / t + atmosphericLight[2]));
      result[idx + 3] = data[idx + 3];
    }

    return new ImageData(result, width, height);
  }

  // CLAHE (Contrast Limited Adaptive Histogram Equalization)
  async claheMethod(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data);

    const tileSize = 64;
    const clipLimit = 2.0 + (this.strength / 100) * 3;

    this.showProgress('應用 CLAHE 演算法...', 20);

    // Convert to LAB-like (just use L channel approximation)
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      luminance[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Process tiles
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    const cdfs = [];

    for (let ty = 0; ty < tilesY; ty++) {
      cdfs[ty] = [];
      for (let tx = 0; tx < tilesX; tx++) {
        const startX = tx * tileSize;
        const startY = ty * tileSize;
        const endX = Math.min(startX + tileSize, width);
        const endY = Math.min(startY + tileSize, height);

        // Build histogram
        const histogram = new Array(256).fill(0);
        let count = 0;

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const val = Math.round(luminance[y * width + x]);
            histogram[val]++;
            count++;
          }
        }

        // Clip histogram
        const clipValue = Math.round(count / 256 * clipLimit);
        let excess = 0;

        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipValue) {
            excess += histogram[i] - clipValue;
            histogram[i] = clipValue;
          }
        }

        // Redistribute excess
        const increment = excess / 256;
        for (let i = 0; i < 256; i++) {
          histogram[i] += increment;
        }

        // Build CDF
        const cdf = new Float32Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }

        // Normalize CDF
        for (let i = 0; i < 256; i++) {
          cdf[i] = (cdf[i] / count) * 255;
        }

        cdfs[ty][tx] = cdf;
      }

      this.showProgress(`處理中... ${Math.round((ty + 1) / tilesY * 60 + 20)}%`, (ty + 1) / tilesY * 60 + 20);
      await this.sleep(1);
    }

    // Interpolate and apply
    this.showProgress('插值處理...', 80);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const lum = Math.round(luminance[y * width + x]);

        // Find tile coordinates
        const tx = x / tileSize;
        const ty = y / tileSize;

        const tx1 = Math.min(Math.floor(tx), tilesX - 1);
        const ty1 = Math.min(Math.floor(ty), tilesY - 1);
        const tx2 = Math.min(tx1 + 1, tilesX - 1);
        const ty2 = Math.min(ty1 + 1, tilesY - 1);

        const fx = tx - tx1;
        const fy = ty - ty1;

        // Bilinear interpolation of CDFs
        const val1 = cdfs[ty1][tx1][lum] * (1 - fx) + cdfs[ty1][tx2][lum] * fx;
        const val2 = cdfs[ty2][tx1][lum] * (1 - fx) + cdfs[ty2][tx2][lum] * fx;
        const newLum = val1 * (1 - fy) + val2 * fy;

        // Apply to color channels
        const scale = luminance[y * width + x] > 0 ? newLum / luminance[y * width + x] : 1;
        result[idx] = Math.min(255, Math.max(0, data[idx] * scale));
        result[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * scale));
        result[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * scale));
      }
    }

    return new ImageData(result, width, height);
  }

  // Multi-Scale Retinex
  async retinexMethod(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data);

    const scales = [15, 80, 250]; // Multi-scale sigmas
    const weight = 1 / scales.length;

    this.showProgress('應用 Retinex 演算法...', 10);

    // Process each channel
    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(width * height);
      const retinex = new Float32Array(width * height);

      // Extract channel and take log
      for (let i = 0; i < width * height; i++) {
        const val = data[i * 4 + c];
        channel[i] = Math.log(val + 1);
      }

      // Multi-scale processing
      for (let s = 0; s < scales.length; s++) {
        const sigma = scales[s];
        const blurred = this.gaussianBlur(channel, width, height, sigma);

        for (let i = 0; i < width * height; i++) {
          retinex[i] += weight * (channel[i] - blurred[i]);
        }

        this.showProgress(`處理通道 ${c + 1}/3, 尺度 ${s + 1}/${scales.length}...`,
          ((c * scales.length + s + 1) / (3 * scales.length)) * 80 + 10);
        await this.sleep(1);
      }

      // Normalize and apply gain
      let minVal = Infinity, maxVal = -Infinity;
      for (let i = 0; i < width * height; i++) {
        minVal = Math.min(minVal, retinex[i]);
        maxVal = Math.max(maxVal, retinex[i]);
      }

      const range = maxVal - minVal;
      const gain = this.strength / 100;

      for (let i = 0; i < width * height; i++) {
        const normalized = (retinex[i] - minVal) / range * 255;
        const original = data[i * 4 + c];
        result[i * 4 + c] = Math.min(255, Math.max(0, original * (1 - gain) + normalized * gain));
      }
    }

    return new ImageData(result, width, height);
  }

  // Hybrid method combining multiple techniques
  async hybridMethod(imageData) {
    this.showProgress('混合增強處理...', 10);

    // First apply DCP
    const dcpResult = await this.darkChannelPrior(imageData);

    // Then apply CLAHE on the result
    this.showProgress('應用 CLAHE 增強...', 60);

    // Simplified CLAHE
    const width = dcpResult.width;
    const height = dcpResult.height;
    const data = dcpResult.data;
    const result = new Uint8ClampedArray(data);

    // Simple histogram equalization per channel
    for (let c = 0; c < 3; c++) {
      const histogram = new Array(256).fill(0);

      for (let i = 0; i < width * height; i++) {
        histogram[data[i * 4 + c]]++;
      }

      const cdf = new Float32Array(256);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }

      const cdfMin = cdf.find(v => v > 0);
      const total = width * height;

      for (let i = 0; i < width * height; i++) {
        const idx = i * 4 + c;
        const original = data[idx];
        const equalized = Math.round((cdf[original] - cdfMin) / (total - cdfMin) * 255);
        const blend = this.strength / 200; // Half strength for subtle effect
        result[idx] = Math.round(original * (1 - blend) + equalized * blend);
      }
    }

    return new ImageData(result, width, height);
  }

  gaussianBlur(channel, width, height, sigma) {
    // Create Gaussian kernel
    const size = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = new Float32Array(size);
    let sum = 0;
    const center = Math.floor(size / 2);

    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    // Separable convolution
    const temp = new Float32Array(width * height);
    const result = new Float32Array(width * height);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = 0;
        for (let k = 0; k < size; k++) {
          const px = Math.min(Math.max(x + k - center, 0), width - 1);
          val += channel[y * width + px] * kernel[k];
        }
        temp[y * width + x] = val;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = 0;
        for (let k = 0; k < size; k++) {
          const py = Math.min(Math.max(y + k - center, 0), height - 1);
          val += temp[py * width + x] * kernel[k];
        }
        result[y * width + x] = val;
      }
    }

    return result;
  }

  applyEnhancements(imageData) {
    const data = imageData.data;
    const contrastFactor = 1 + (this.contrast / 100);
    const saturationFactor = 1 + ((this.saturation - 50) / 100);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply contrast
      r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

      // Apply saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    return imageData;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showProgress(text, percent) {
    this.progressSection.classList.add('active');
    this.progressText.textContent = text;
    this.progressFill.style.width = `${percent}%`;
  }

  hideProgress() {
    this.progressSection.classList.remove('active');
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
    link.download = `dehazed-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.originalImg.src = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.dehazeBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    document.getElementById('imageSize').textContent = '-';
    document.getElementById('hazeLevel').textContent = '-';
    document.getElementById('clarityGain').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new Dehazer();
});
