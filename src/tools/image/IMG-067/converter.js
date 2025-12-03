/**
 * IMG-067 水彩畫效果
 * 將照片轉為水彩畫風格
 */

class WatercolorTool {
  constructor() {
    this.sourceImage = null;
    this.blend = 5;
    this.soften = 4;
    this.saturation = 110;
    this.addTexture = true;
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

    this.blendSlider = document.getElementById('blendSlider');
    this.blendValue = document.getElementById('blendValue');
    this.softenSlider = document.getElementById('softenSlider');
    this.softenValue = document.getElementById('softenValue');
    this.saturationSlider = document.getElementById('saturationSlider');
    this.saturationValue = document.getElementById('saturationValue');
    this.textureCheck = document.getElementById('textureCheck');

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
    this.blendSlider.addEventListener('input', () => {
      this.blend = parseInt(this.blendSlider.value);
      this.blendValue.textContent = this.blend;
      this.updatePresets();
    });
    this.blendSlider.addEventListener('change', () => this.processImage());

    this.softenSlider.addEventListener('input', () => {
      this.soften = parseInt(this.softenSlider.value);
      this.softenValue.textContent = this.soften;
      this.updatePresets();
    });
    this.softenSlider.addEventListener('change', () => this.processImage());

    this.saturationSlider.addEventListener('input', () => {
      this.saturation = parseInt(this.saturationSlider.value);
      this.saturationValue.textContent = `${this.saturation}%`;
      this.updatePresets();
    });
    this.saturationSlider.addEventListener('change', () => this.processImage());

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.blend = parseInt(btn.dataset.blend);
        this.soften = parseInt(btn.dataset.soften);
        this.saturation = parseInt(btn.dataset.sat);
        this.blendSlider.value = this.blend;
        this.softenSlider.value = this.soften;
        this.saturationSlider.value = this.saturation;
        this.blendValue.textContent = this.blend;
        this.softenValue.textContent = this.soften;
        this.saturationValue.textContent = `${this.saturation}%`;
        this.updatePresets();
        this.processImage();
      });
    });

    // Texture checkbox
    this.textureCheck.addEventListener('change', () => {
      this.addTexture = this.textureCheck.checked;
      this.processImage();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const b = parseInt(btn.dataset.blend);
      const s = parseInt(btn.dataset.soften);
      const sat = parseInt(btn.dataset.sat);
      btn.classList.toggle('active', b === this.blend && s === this.soften && sat === this.saturation);
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
    this.showStatus('processing', '正在處理水彩畫效果...');

    setTimeout(() => {
      const width = this.sourceImage.width;
      const height = this.sourceImage.height;

      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Create temporary canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = width;
      tempCanvas.height = height;

      // Draw source
      tempCtx.drawImage(this.sourceImage, 0, 0);

      // Get image data
      let imageData = tempCtx.getImageData(0, 0, width, height);

      // Step 1: Apply median filter for watercolor smoothing effect
      imageData = this.applyMedianFilter(imageData, width, height, this.blend);

      // Step 2: Apply edge-preserving blur
      imageData = this.applyBilateralFilter(imageData, width, height, this.soften);

      // Step 3: Adjust saturation
      this.adjustSaturation(imageData.data, this.saturation / 100);

      // Step 4: Add paper texture if enabled
      if (this.addTexture) {
        this.addPaperTexture(imageData.data, width, height);
      }

      this.resultCtx.putImageData(imageData, 0, 0);

      this.previewInfo.textContent = `${width} × ${height} px | 暈染: ${this.blend} | 軟化: ${this.soften} | 飽和: ${this.saturation}%`;
      this.showStatus('success', '水彩畫效果已套用');
      this.processing = false;
    }, 50);
  }

  applyMedianFilter(imageData, width, height, radius) {
    const src = imageData.data;
    const result = new ImageData(new Uint8ClampedArray(src), width, height);
    const dst = result.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rValues = [], gValues = [], bValues = [];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = Math.min(width - 1, Math.max(0, x + dx));
            const py = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (py * width + px) * 4;
            rValues.push(src[idx]);
            gValues.push(src[idx + 1]);
            bValues.push(src[idx + 2]);
          }
        }

        rValues.sort((a, b) => a - b);
        gValues.sort((a, b) => a - b);
        bValues.sort((a, b) => a - b);

        const mid = Math.floor(rValues.length / 2);
        const idx = (y * width + x) * 4;
        dst[idx] = rValues[mid];
        dst[idx + 1] = gValues[mid];
        dst[idx + 2] = bValues[mid];
        dst[idx + 3] = src[idx + 3];
      }
    }

    return result;
  }

  applyBilateralFilter(imageData, width, height, radius) {
    const src = imageData.data;
    const result = new ImageData(new Uint8ClampedArray(src), width, height);
    const dst = result.data;

    const sigmaSpace = radius;
    const sigmaColor = 30;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const centerR = src[idx];
        const centerG = src[idx + 1];
        const centerB = src[idx + 2];

        let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const px = Math.min(width - 1, Math.max(0, x + dx));
            const py = Math.min(height - 1, Math.max(0, y + dy));
            const pidx = (py * width + px) * 4;

            const r = src[pidx];
            const g = src[pidx + 1];
            const b = src[pidx + 2];

            // Spatial weight
            const spatialDist = Math.sqrt(dx * dx + dy * dy);
            const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));

            // Color weight
            const colorDist = Math.sqrt(
              Math.pow(r - centerR, 2) +
              Math.pow(g - centerG, 2) +
              Math.pow(b - centerB, 2)
            );
            const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));

            const weight = spatialWeight * colorWeight;

            sumR += r * weight;
            sumG += g * weight;
            sumB += b * weight;
            sumWeight += weight;
          }
        }

        dst[idx] = sumR / sumWeight;
        dst[idx + 1] = sumG / sumWeight;
        dst[idx + 2] = sumB / sumWeight;
        dst[idx + 3] = src[idx + 3];
      }
    }

    return result;
  }

  adjustSaturation(data, factor) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = Math.min(255, Math.max(0, gray + (r - gray) * factor));
      data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * factor));
      data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * factor));
    }
  }

  addPaperTexture(data, width, height) {
    // Generate noise pattern for paper texture
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);

      // Create subtle paper grain effect
      const noise = (Math.sin(x * 0.5) * Math.cos(y * 0.5) * 10) +
                   (Math.random() - 0.5) * 15;

      // Slight darkening at edges for vignette
      const centerX = width / 2;
      const centerY = height / 2;
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const vignette = 1 - (distFromCenter / maxDist) * 0.15;

      data[i] = Math.min(255, Math.max(0, (data[i] + noise) * vignette));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] + noise) * vignette));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] + noise) * vignette));
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `watercolor_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '水彩畫已下載');
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

    this.blend = 5;
    this.soften = 4;
    this.saturation = 110;
    this.addTexture = true;

    this.blendSlider.value = 5;
    this.softenSlider.value = 4;
    this.saturationSlider.value = 110;
    this.blendValue.textContent = '5';
    this.softenValue.textContent = '4';
    this.saturationValue.textContent = '110%';
    this.textureCheck.checked = true;
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
  new WatercolorTool();
});
