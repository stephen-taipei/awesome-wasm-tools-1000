/**
 * IMG-066 素描效果
 * 將照片轉為鉛筆素描風格
 */

class SketchTool {
  constructor() {
    this.sourceImage = null;
    this.style = 'pencil';
    this.strength = 50;
    this.blur = 3;
    this.invert = false;
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

    this.strengthSlider = document.getElementById('strengthSlider');
    this.strengthValue = document.getElementById('strengthValue');
    this.blurSlider = document.getElementById('blurSlider');
    this.blurValue = document.getElementById('blurValue');
    this.invertCheck = document.getElementById('invertCheck');

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

    // Style buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.style = btn.dataset.style;
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Sliders
    this.strengthSlider.addEventListener('input', () => {
      this.strength = parseInt(this.strengthSlider.value);
      this.strengthValue.textContent = `${this.strength}%`;
    });

    this.strengthSlider.addEventListener('change', () => {
      this.processImage();
    });

    this.blurSlider.addEventListener('input', () => {
      this.blur = parseInt(this.blurSlider.value);
      this.blurValue.textContent = this.blur;
    });

    this.blurSlider.addEventListener('change', () => {
      this.processImage();
    });

    // Checkbox
    this.invertCheck.addEventListener('change', () => {
      this.invert = this.invertCheck.checked;
      this.processImage();
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
    if (!this.sourceImage || this.processing) return;

    this.processing = true;
    this.showStatus('processing', '正在處理素描效果...');

    setTimeout(() => {
      const width = this.sourceImage.width;
      const height = this.sourceImage.height;

      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Create temporary canvases
      const tempCanvas1 = document.createElement('canvas');
      const tempCtx1 = tempCanvas1.getContext('2d');
      tempCanvas1.width = width;
      tempCanvas1.height = height;

      const tempCanvas2 = document.createElement('canvas');
      const tempCtx2 = tempCanvas2.getContext('2d');
      tempCanvas2.width = width;
      tempCanvas2.height = height;

      // Draw and convert to grayscale
      tempCtx1.drawImage(this.sourceImage, 0, 0);
      const grayData = tempCtx1.getImageData(0, 0, width, height);
      this.toGrayscale(grayData.data);
      tempCtx1.putImageData(grayData, 0, 0);

      // Different processing based on style
      switch (this.style) {
        case 'pencil':
          this.processPencilSketch(tempCtx1, tempCtx2, width, height);
          break;
        case 'charcoal':
          this.processCharcoalSketch(tempCtx1, tempCtx2, width, height);
          break;
        case 'contour':
          this.processContourSketch(tempCtx1, tempCtx2, width, height);
          break;
      }

      // Copy result
      const resultData = tempCtx2.getImageData(0, 0, width, height);

      // Apply invert if needed
      if (this.invert) {
        this.invertColors(resultData.data);
      }

      this.resultCtx.putImageData(resultData, 0, 0);

      const styleNames = {
        pencil: '鉛筆素描',
        charcoal: '炭筆素描',
        contour: '輪廓線稿'
      };

      this.previewInfo.textContent = `${width} × ${height} px | ${styleNames[this.style]} | 強度: ${this.strength}%`;
      this.showStatus('success', '素描效果已套用');
      this.processing = false;
    }, 50);
  }

  toGrayscale(data) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  invertColors(data) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  processPencilSketch(srcCtx, destCtx, width, height) {
    // Get grayscale image
    const grayData = srcCtx.getImageData(0, 0, width, height);

    // Invert colors
    const invertedData = new ImageData(new Uint8ClampedArray(grayData.data), width, height);
    this.invertColors(invertedData.data);

    // Apply blur to inverted
    const blurredData = this.applyBlur(invertedData, width, height, this.blur);

    // Color dodge blend
    const resultData = destCtx.createImageData(width, height);
    const strength = this.strength / 100;

    for (let i = 0; i < grayData.data.length; i += 4) {
      const base = grayData.data[i];
      const blend = blurredData.data[i];

      // Color dodge formula
      let result;
      if (blend === 255) {
        result = 255;
      } else {
        result = Math.min(255, (base * 256) / (256 - blend));
      }

      // Mix with original based on strength
      const mixed = base * (1 - strength) + result * strength;

      resultData.data[i] = mixed;
      resultData.data[i + 1] = mixed;
      resultData.data[i + 2] = mixed;
      resultData.data[i + 3] = 255;
    }

    destCtx.putImageData(resultData, 0, 0);
  }

  processCharcoalSketch(srcCtx, destCtx, width, height) {
    const grayData = srcCtx.getImageData(0, 0, width, height);

    // Apply edge detection
    const edgeData = this.detectEdges(grayData, width, height);

    // Invert and enhance contrast
    const strength = this.strength / 100;

    for (let i = 0; i < edgeData.data.length; i += 4) {
      let val = 255 - edgeData.data[i];

      // Enhance contrast
      val = val < 128
        ? val * (1 - strength * 0.5)
        : val + (255 - val) * strength * 0.3;

      edgeData.data[i] = val;
      edgeData.data[i + 1] = val;
      edgeData.data[i + 2] = val;
      edgeData.data[i + 3] = 255;
    }

    destCtx.putImageData(edgeData, 0, 0);
  }

  processContourSketch(srcCtx, destCtx, width, height) {
    const grayData = srcCtx.getImageData(0, 0, width, height);

    // Apply strong edge detection
    const edgeData = this.detectEdges(grayData, width, height);

    // Threshold to create clean lines
    const threshold = 255 - (this.strength * 2);

    for (let i = 0; i < edgeData.data.length; i += 4) {
      const val = edgeData.data[i] > threshold ? 255 : 0;
      edgeData.data[i] = val;
      edgeData.data[i + 1] = val;
      edgeData.data[i + 2] = val;
      edgeData.data[i + 3] = 255;
    }

    destCtx.putImageData(edgeData, 0, 0);
  }

  applyBlur(imageData, width, height, radius) {
    const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
    const data = imageData.data;
    const out = result.data;

    // Simple box blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = Math.min(width - 1, Math.max(0, x + dx));
            const py = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (py * width + px) * 4;
            r += data[idx];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        const avg = r / count;
        out[idx] = avg;
        out[idx + 1] = avg;
        out[idx + 2] = avg;
        out[idx + 3] = 255;
      }
    }

    return result;
  }

  detectEdges(imageData, width, height) {
    const result = new ImageData(width, height);
    const data = imageData.data;
    const out = result.data;

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const val = data[idx];
            const ki = (ky + 1) * 3 + (kx + 1);
            gx += val * sobelX[ki];
            gy += val * sobelY[ki];
          }
        }

        const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        const idx = (y * width + x) * 4;
        out[idx] = magnitude;
        out[idx + 1] = magnitude;
        out[idx + 2] = magnitude;
        out[idx + 3] = 255;
      }
    }

    return result;
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sketch_${this.style}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '素描圖已下載');
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

    this.style = 'pencil';
    this.strength = 50;
    this.blur = 3;
    this.invert = false;

    this.strengthSlider.value = 50;
    this.strengthValue.textContent = '50%';
    this.blurSlider.value = 3;
    this.blurValue.textContent = '3';
    this.invertCheck.checked = false;

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === 'pencil');
    });

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
  new SketchTool();
});
