/**
 * IMG-068 卡通效果
 * 將照片轉為卡通/動漫風格
 */

class CartoonTool {
  constructor() {
    this.sourceImage = null;
    this.edgeStrength = 50;
    this.colorLevels = 12;
    this.smoothness = 5;
    this.blackEdge = true;
    this.processing = false;

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
    this.previewInfo = document.getElementById('previewInfo');

    this.edgeSlider = document.getElementById('edgeSlider');
    this.edgeValue = document.getElementById('edgeValue');
    this.colorSlider = document.getElementById('colorSlider');
    this.colorValue = document.getElementById('colorValue');
    this.smoothSlider = document.getElementById('smoothSlider');
    this.smoothValue = document.getElementById('smoothValue');
    this.blackEdgeCheck = document.getElementById('blackEdgeCheck');

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

    // Sliders
    this.edgeSlider.addEventListener('input', () => {
      this.edgeStrength = parseInt(this.edgeSlider.value);
      this.edgeValue.textContent = `${this.edgeStrength}%`;
      this.updatePresets();
    });
    this.edgeSlider.addEventListener('change', () => this.processImage());

    this.colorSlider.addEventListener('input', () => {
      this.colorLevels = parseInt(this.colorSlider.value);
      this.colorValue.textContent = `${this.colorLevels} 色`;
      this.updatePresets();
    });
    this.colorSlider.addEventListener('change', () => this.processImage());

    this.smoothSlider.addEventListener('input', () => {
      this.smoothness = parseInt(this.smoothSlider.value);
      this.smoothValue.textContent = this.smoothness;
      this.updatePresets();
    });
    this.smoothSlider.addEventListener('change', () => this.processImage());

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.edgeStrength = parseInt(btn.dataset.edge);
        this.colorLevels = parseInt(btn.dataset.color);
        this.smoothness = parseInt(btn.dataset.smooth);
        this.edgeSlider.value = this.edgeStrength;
        this.colorSlider.value = this.colorLevels;
        this.smoothSlider.value = this.smoothness;
        this.edgeValue.textContent = `${this.edgeStrength}%`;
        this.colorValue.textContent = `${this.colorLevels} 色`;
        this.smoothValue.textContent = this.smoothness;
        this.updatePresets();
        this.processImage();
      });
    });

    // Checkbox
    this.blackEdgeCheck.addEventListener('change', () => {
      this.blackEdge = this.blackEdgeCheck.checked;
      this.processImage();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const e = parseInt(btn.dataset.edge);
      const c = parseInt(btn.dataset.color);
      const s = parseInt(btn.dataset.smooth);
      btn.classList.toggle('active', e === this.edgeStrength && c === this.colorLevels && s === this.smoothness);
    });
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
    if (!this.sourceImage || this.processing) return;

    this.processing = true;
    this.showStatus('processing', '正在處理卡通效果...');

    setTimeout(() => {
      const width = this.sourceImage.width;
      const height = this.sourceImage.height;

      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Create temporary canvases
      const smoothCanvas = document.createElement('canvas');
      const smoothCtx = smoothCanvas.getContext('2d');
      smoothCanvas.width = width;
      smoothCanvas.height = height;

      // Draw source
      smoothCtx.drawImage(this.sourceImage, 0, 0);

      // Step 1: Apply bilateral filter for smoothing (simplified)
      let imageData = smoothCtx.getImageData(0, 0, width, height);
      imageData = this.applyBilateralSmooth(imageData, width, height, this.smoothness);

      // Step 2: Quantize colors
      this.quantizeColors(imageData.data, this.colorLevels);

      // Step 3: Detect edges
      const edgeData = this.detectEdges(this.originalCtx.getImageData(0, 0, width, height), width, height);

      // Step 4: Combine smoothed image with edges
      if (this.edgeStrength > 0) {
        this.combineWithEdges(imageData.data, edgeData.data, width, height, this.edgeStrength / 100, this.blackEdge);
      }

      this.resultCtx.putImageData(imageData, 0, 0);

      this.previewInfo.textContent = `${width} × ${height} px | 邊緣: ${this.edgeStrength}% | 色數: ${this.colorLevels}`;
      this.showStatus('success', '卡通效果已套用');
      this.processing = false;
    }, 50);
  }

  applyBilateralSmooth(imageData, width, height, iterations) {
    let src = imageData.data;
    let result = new Uint8ClampedArray(src);

    const radius = 2;

    for (let iter = 0; iter < iterations; iter++) {
      const temp = new Uint8ClampedArray(result);

      for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
          const idx = (y * width + x) * 4;
          const centerR = temp[idx];
          const centerG = temp[idx + 1];
          const centerB = temp[idx + 2];

          let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const pidx = ((y + dy) * width + (x + dx)) * 4;
              const r = temp[pidx];
              const g = temp[pidx + 1];
              const b = temp[pidx + 2];

              const colorDist = Math.abs(r - centerR) + Math.abs(g - centerG) + Math.abs(b - centerB);
              const weight = colorDist < 30 ? 1 : 0.1;

              sumR += r * weight;
              sumG += g * weight;
              sumB += b * weight;
              sumWeight += weight;
            }
          }

          result[idx] = sumR / sumWeight;
          result[idx + 1] = sumG / sumWeight;
          result[idx + 2] = sumB / sumWeight;
          result[idx + 3] = temp[idx + 3];
        }
      }
    }

    return new ImageData(result, width, height);
  }

  quantizeColors(data, levels) {
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round(data[i] / step) * step);
      data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
      data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
    }
  }

  detectEdges(imageData, width, height) {
    const src = imageData.data;
    const result = new ImageData(width, height);
    const dst = result.data;

    // Convert to grayscale first
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < src.length; i += 4) {
      gray[i / 4] = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    }

    // Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Sobel X
        const gx =
          -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
          -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
          -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];

        // Sobel Y
        const gy =
          -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
          gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];

        const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        const outIdx = idx * 4;
        dst[outIdx] = magnitude;
        dst[outIdx + 1] = magnitude;
        dst[outIdx + 2] = magnitude;
        dst[outIdx + 3] = 255;
      }
    }

    return result;
  }

  combineWithEdges(colorData, edgeData, width, height, strength, useBlackEdge) {
    const threshold = 50;

    for (let i = 0; i < colorData.length; i += 4) {
      const edgeVal = edgeData[i];

      if (edgeVal > threshold) {
        const edgeFactor = Math.min(1, (edgeVal - threshold) / (255 - threshold)) * strength;

        if (useBlackEdge) {
          // Black edges
          colorData[i] = colorData[i] * (1 - edgeFactor);
          colorData[i + 1] = colorData[i + 1] * (1 - edgeFactor);
          colorData[i + 2] = colorData[i + 2] * (1 - edgeFactor);
        } else {
          // Darker edges based on original color
          colorData[i] = colorData[i] * (1 - edgeFactor * 0.5);
          colorData[i + 1] = colorData[i + 1] * (1 - edgeFactor * 0.5);
          colorData[i + 2] = colorData[i + 2] * (1 - edgeFactor * 0.5);
        }
      }
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cartoon_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '卡通圖已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.processing = false;

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.edgeStrength = 50;
    this.colorLevels = 12;
    this.smoothness = 5;
    this.blackEdge = true;

    this.edgeSlider.value = 50;
    this.colorSlider.value = 12;
    this.smoothSlider.value = 5;
    this.edgeValue.textContent = '50%';
    this.colorValue.textContent = '12 色';
    this.smoothValue.textContent = '5';
    this.blackEdgeCheck.checked = true;
    this.updatePresets();

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
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
  new CartoonTool();
});
