/**
 * IMG-080 直方圖均衡化
 * 自動調整圖片對比度（直方圖均衡）
 */

class HistogramEqualizationTool {
  constructor() {
    this.sourceImage = null;
    this.mode = 'luminance';

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

    this.originalHistogram = document.getElementById('originalHistogram');
    this.originalHistCtx = this.originalHistogram.getContext('2d');
    this.resultHistogram = document.getElementById('resultHistogram');
    this.resultHistCtx = this.resultHistogram.getContext('2d');

    this.infoPanel = document.getElementById('infoPanel');
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

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
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

    const srcData = this.originalCtx.getImageData(0, 0, width, height);
    const resultData = this.resultCtx.createImageData(width, height);

    // Copy source data
    for (let i = 0; i < srcData.data.length; i++) {
      resultData.data[i] = srcData.data[i];
    }

    // Apply equalization based on mode
    switch (this.mode) {
      case 'luminance':
        this.equalizeLuminance(resultData);
        break;
      case 'rgb':
        this.equalizeRGB(resultData);
        break;
      case 'clahe':
        this.equalizeCLAHE(resultData, width, height);
        break;
    }

    this.resultCtx.putImageData(resultData, 0, 0);

    // Draw histograms
    this.drawHistogram(srcData.data, this.originalHistogram, this.originalHistCtx);
    this.drawHistogram(resultData.data, this.resultHistogram, this.resultHistCtx);

    // Update info
    this.updateInfo(srcData.data, resultData.data, width * height);

    this.showStatus('success', '直方圖均衡化完成');
  }

  equalizeLuminance(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // Build luminance histogram
    const histogram = new Array(256).fill(0);
    const luminances = new Array(pixelCount);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
      luminances[i / 4] = lum;
      histogram[lum]++;
    }

    // Build CDF
    const cdf = this.buildCDF(histogram, pixelCount);

    // Apply equalization while preserving color ratios
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const oldLum = luminances[i / 4];
      const newLum = cdf[oldLum];

      if (oldLum > 0) {
        const ratio = newLum / oldLum;
        data[i] = Math.min(255, Math.round(r * ratio));
        data[i + 1] = Math.min(255, Math.round(g * ratio));
        data[i + 2] = Math.min(255, Math.round(b * ratio));
      } else {
        data[i] = newLum;
        data[i + 1] = newLum;
        data[i + 2] = newLum;
      }
    }
  }

  equalizeRGB(imageData) {
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // Build histograms for each channel
    const histR = new Array(256).fill(0);
    const histG = new Array(256).fill(0);
    const histB = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      histR[data[i]]++;
      histG[data[i + 1]]++;
      histB[data[i + 2]]++;
    }

    // Build CDFs
    const cdfR = this.buildCDF(histR, pixelCount);
    const cdfG = this.buildCDF(histG, pixelCount);
    const cdfB = this.buildCDF(histB, pixelCount);

    // Apply equalization
    for (let i = 0; i < data.length; i += 4) {
      data[i] = cdfR[data[i]];
      data[i + 1] = cdfG[data[i + 1]];
      data[i + 2] = cdfB[data[i + 2]];
    }
  }

  equalizeCLAHE(imageData, width, height) {
    const data = imageData.data;
    const tileSize = 64; // Tile size for local histogram
    const clipLimit = 2.0; // Contrast limit

    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);

    // Extract luminance
    const luminance = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      luminance[i / 4] = lum;
    }

    // Compute lookup tables for each tile
    const tileLUTs = [];

    for (let ty = 0; ty < tilesY; ty++) {
      tileLUTs[ty] = [];
      for (let tx = 0; tx < tilesX; tx++) {
        const startX = tx * tileSize;
        const startY = ty * tileSize;
        const endX = Math.min(startX + tileSize, width);
        const endY = Math.min(startY + tileSize, height);

        // Build local histogram
        const hist = new Array(256).fill(0);
        let count = 0;

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            hist[luminance[y * width + x]]++;
            count++;
          }
        }

        // Clip histogram
        const clipThreshold = Math.floor(clipLimit * count / 256);
        let excess = 0;

        for (let i = 0; i < 256; i++) {
          if (hist[i] > clipThreshold) {
            excess += hist[i] - clipThreshold;
            hist[i] = clipThreshold;
          }
        }

        // Redistribute excess
        const increment = Math.floor(excess / 256);
        const remainder = excess % 256;

        for (let i = 0; i < 256; i++) {
          hist[i] += increment;
          if (i < remainder) hist[i]++;
        }

        // Build CDF
        tileLUTs[ty][tx] = this.buildCDF(hist, count);
      }
    }

    // Apply with bilinear interpolation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixelIdx = idx * 4;
        const lum = luminance[idx];

        // Find surrounding tiles
        const tx = (x + 0.5) / tileSize - 0.5;
        const ty = (y + 0.5) / tileSize - 0.5;

        const tx1 = Math.max(0, Math.floor(tx));
        const ty1 = Math.max(0, Math.floor(ty));
        const tx2 = Math.min(tilesX - 1, tx1 + 1);
        const ty2 = Math.min(tilesY - 1, ty1 + 1);

        const fx = Math.max(0, Math.min(1, tx - tx1));
        const fy = Math.max(0, Math.min(1, ty - ty1));

        // Bilinear interpolation
        const v11 = tileLUTs[ty1][tx1][lum];
        const v12 = tileLUTs[ty1][tx2][lum];
        const v21 = tileLUTs[ty2][tx1][lum];
        const v22 = tileLUTs[ty2][tx2][lum];

        const v1 = v11 * (1 - fx) + v12 * fx;
        const v2 = v21 * (1 - fx) + v22 * fx;
        const newLum = v1 * (1 - fy) + v2 * fy;

        // Apply to RGB while preserving color
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];

        if (lum > 0) {
          const ratio = newLum / lum;
          data[pixelIdx] = Math.min(255, Math.round(r * ratio));
          data[pixelIdx + 1] = Math.min(255, Math.round(g * ratio));
          data[pixelIdx + 2] = Math.min(255, Math.round(b * ratio));
        } else {
          data[pixelIdx] = newLum;
          data[pixelIdx + 1] = newLum;
          data[pixelIdx + 2] = newLum;
        }
      }
    }
  }

  buildCDF(histogram, pixelCount) {
    const cdf = new Array(256);
    let sum = 0;
    let cdfMin = -1;

    for (let i = 0; i < 256; i++) {
      sum += histogram[i];
      if (cdfMin < 0 && sum > 0) cdfMin = sum;
      cdf[i] = sum;
    }

    // Normalize to 0-255
    for (let i = 0; i < 256; i++) {
      cdf[i] = Math.round(((cdf[i] - cdfMin) / (pixelCount - cdfMin)) * 255);
    }

    return cdf;
  }

  drawHistogram(data, canvas, ctx) {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 20;
    canvas.height = 120;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 5;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Build luminance histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[lum]++;
    }

    const maxValue = Math.max(...histogram);
    const barWidth = graphWidth / 256;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw bars
    ctx.fillStyle = 'rgba(102, 126, 234, 0.7)';

    for (let i = 0; i < 256; i++) {
      const barHeight = (histogram[i] / maxValue) * graphHeight;
      const x = padding + i * barWidth;
      const y = padding + graphHeight - barHeight;

      ctx.fillRect(x, y, Math.max(barWidth - 0.3, 0.5), barHeight);
    }
  }

  updateInfo(srcData, resultData, pixelCount) {
    // Calculate contrast improvement
    let srcVariance = 0, resultVariance = 0;
    let srcMean = 0, resultMean = 0;

    for (let i = 0; i < srcData.length; i += 4) {
      const srcLum = srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114;
      const resultLum = resultData[i] * 0.299 + resultData[i + 1] * 0.587 + resultData[i + 2] * 0.114;
      srcMean += srcLum;
      resultMean += resultLum;
    }

    srcMean /= pixelCount;
    resultMean /= pixelCount;

    for (let i = 0; i < srcData.length; i += 4) {
      const srcLum = srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114;
      const resultLum = resultData[i] * 0.299 + resultData[i + 1] * 0.587 + resultData[i + 2] * 0.114;
      srcVariance += (srcLum - srcMean) ** 2;
      resultVariance += (resultLum - resultMean) ** 2;
    }

    const srcContrast = Math.sqrt(srcVariance / pixelCount);
    const resultContrast = Math.sqrt(resultVariance / pixelCount);
    const improvement = ((resultContrast - srcContrast) / srcContrast * 100).toFixed(1);

    const modeNames = {
      luminance: '亮度均衡',
      rgb: 'RGB 獨立均衡',
      clahe: '自適應均衡 (CLAHE)'
    };

    this.infoPanel.innerHTML = `
      模式：${modeNames[this.mode]} |
      原始對比度：${srcContrast.toFixed(1)} |
      處理後對比度：${resultContrast.toFixed(1)} |
      改善幅度：${improvement > 0 ? '+' : ''}${improvement}%
    `;
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `equalized_${this.mode}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.mode = 'luminance';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'luminance');
    });

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.originalHistCtx.clearRect(0, 0, this.originalHistogram.width, this.originalHistogram.height);
    this.resultHistCtx.clearRect(0, 0, this.resultHistogram.width, this.resultHistogram.height);
    this.infoPanel.innerHTML = '';

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
  new HistogramEqualizationTool();
});
