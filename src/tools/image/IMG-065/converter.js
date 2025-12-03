/**
 * IMG-065 油畫效果
 * 將照片轉為油畫風格
 */

class OilPaintTool {
  constructor() {
    this.sourceImage = null;
    this.radius = 4;
    this.intensity = 20;
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

    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');

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
    this.radiusSlider.addEventListener('input', () => {
      this.radius = parseInt(this.radiusSlider.value);
      this.radiusValue.textContent = this.radius;
      this.updatePresets();
    });

    this.radiusSlider.addEventListener('change', () => {
      this.processImage();
    });

    this.intensitySlider.addEventListener('input', () => {
      this.intensity = parseInt(this.intensitySlider.value);
      this.intensityValue.textContent = this.intensity;
      this.updatePresets();
    });

    this.intensitySlider.addEventListener('change', () => {
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.radius = parseInt(btn.dataset.radius);
        this.intensity = parseInt(btn.dataset.intensity);
        this.radiusSlider.value = this.radius;
        this.intensitySlider.value = this.intensity;
        this.radiusValue.textContent = this.radius;
        this.intensityValue.textContent = this.intensity;
        this.updatePresets();
        this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const r = parseInt(btn.dataset.radius);
      const i = parseInt(btn.dataset.intensity);
      btn.classList.toggle('active', r === this.radius && i === this.intensity);
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
    this.showStatus('processing', '正在處理油畫效果...');

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const width = this.sourceImage.width;
      const height = this.sourceImage.height;

      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Get source image data
      const srcData = this.originalCtx.getImageData(0, 0, width, height);
      const destData = this.resultCtx.createImageData(width, height);

      this.applyOilPaintEffect(srcData.data, destData.data, width, height, this.radius, this.intensity);

      this.resultCtx.putImageData(destData, 0, 0);

      this.previewInfo.textContent = `${width} × ${height} px | 半徑: ${this.radius} | 強度: ${this.intensity}`;
      this.showStatus('success', '油畫效果已套用');
      this.processing = false;
    }, 50);
  }

  applyOilPaintEffect(src, dest, width, height, radius, intensityLevels) {
    const intensityCount = new Array(intensityLevels);
    const sumR = new Array(intensityLevels);
    const sumG = new Array(intensityLevels);
    const sumB = new Array(intensityLevels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Reset arrays
        for (let i = 0; i < intensityLevels; i++) {
          intensityCount[i] = 0;
          sumR[i] = 0;
          sumG[i] = 0;
          sumB[i] = 0;
        }

        // Calculate intensity for each pixel in the radius
        for (let dy = -radius; dy <= radius; dy++) {
          const py = y + dy;
          if (py < 0 || py >= height) continue;

          for (let dx = -radius; dx <= radius; dx++) {
            const px = x + dx;
            if (px < 0 || px >= width) continue;

            const idx = (py * width + px) * 4;
            const r = src[idx];
            const g = src[idx + 1];
            const b = src[idx + 2];

            // Calculate intensity bin
            const curIntensity = Math.floor(((r + g + b) / 3) * intensityLevels / 256);
            const safeIntensity = Math.min(curIntensity, intensityLevels - 1);

            intensityCount[safeIntensity]++;
            sumR[safeIntensity] += r;
            sumG[safeIntensity] += g;
            sumB[safeIntensity] += b;
          }
        }

        // Find the intensity bin with the most pixels
        let maxCount = 0;
        let maxIndex = 0;
        for (let i = 0; i < intensityLevels; i++) {
          if (intensityCount[i] > maxCount) {
            maxCount = intensityCount[i];
            maxIndex = i;
          }
        }

        // Set destination pixel to the average color of that intensity bin
        const destIdx = (y * width + x) * 4;
        if (maxCount > 0) {
          dest[destIdx] = sumR[maxIndex] / maxCount;
          dest[destIdx + 1] = sumG[maxIndex] / maxCount;
          dest[destIdx + 2] = sumB[maxIndex] / maxCount;
        } else {
          const srcIdx = (y * width + x) * 4;
          dest[destIdx] = src[srcIdx];
          dest[destIdx + 1] = src[srcIdx + 1];
          dest[destIdx + 2] = src[srcIdx + 2];
        }
        dest[destIdx + 3] = 255;
      }
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `oilpaint_r${this.radius}_i${this.intensity}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '油畫圖已下載');
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

    this.radius = 4;
    this.intensity = 20;
    this.radiusSlider.value = 4;
    this.intensitySlider.value = 20;
    this.radiusValue.textContent = '4';
    this.intensityValue.textContent = '20';
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
  new OilPaintTool();
});
