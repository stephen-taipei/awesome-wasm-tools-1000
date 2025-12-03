/**
 * IMG-081 噪點添加
 * 為圖片添加顆粒噪點效果（底片感）
 */

class NoiseTool {
  constructor() {
    this.sourceImage = null;
    this.noiseType = 'gaussian';
    this.intensity = 30;
    this.grainSize = 1;
    this.colorMode = 'mono';

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

    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.sizeSlider = document.getElementById('sizeSlider');
    this.sizeValue = document.getElementById('sizeValue');

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

    // Noise type buttons
    document.querySelectorAll('.noise-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.noiseType = btn.dataset.type;
        document.querySelectorAll('.noise-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Color mode buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.colorMode = btn.dataset.color;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Sliders
    this.intensitySlider.addEventListener('input', () => {
      this.intensity = parseInt(this.intensitySlider.value);
      this.intensityValue.textContent = this.intensity + '%';
      if (this.sourceImage) this.processImage();
    });

    this.sizeSlider.addEventListener('input', () => {
      this.grainSize = parseInt(this.sizeSlider.value);
      this.sizeValue.textContent = this.grainSize;
      if (this.sourceImage) this.processImage();
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

    // Copy original
    this.resultCtx.drawImage(this.sourceImage, 0, 0);
    const imageData = this.resultCtx.getImageData(0, 0, width, height);

    // Apply noise based on type
    switch (this.noiseType) {
      case 'gaussian':
        this.addGaussianNoise(imageData);
        break;
      case 'uniform':
        this.addUniformNoise(imageData);
        break;
      case 'salt-pepper':
        this.addSaltPepperNoise(imageData);
        break;
      case 'film':
        this.addFilmGrain(imageData);
        break;
    }

    this.resultCtx.putImageData(imageData, 0, 0);

    const typeNames = {
      gaussian: '高斯噪點',
      uniform: '均勻噪點',
      'salt-pepper': '椒鹽噪點',
      film: '底片顆粒'
    };

    this.previewInfo.textContent = `${typeNames[this.noiseType]} | 強度: ${this.intensity}% | 顆粒: ${this.grainSize}`;
    this.showStatus('success', '噪點添加完成');
  }

  // Box-Muller transform for Gaussian random
  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  addGaussianNoise(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const sigma = this.intensity * 2.55; // Scale to 0-255 range

    // Generate noise pattern with grain size
    const noiseWidth = Math.ceil(width / this.grainSize);
    const noiseHeight = Math.ceil(height / this.grainSize);

    for (let ny = 0; ny < noiseHeight; ny++) {
      for (let nx = 0; nx < noiseWidth; nx++) {
        let noiseR, noiseG, noiseB;

        if (this.colorMode === 'mono') {
          const noise = this.gaussianRandom() * sigma;
          noiseR = noiseG = noiseB = noise;
        } else {
          noiseR = this.gaussianRandom() * sigma;
          noiseG = this.gaussianRandom() * sigma;
          noiseB = this.gaussianRandom() * sigma;
        }

        // Apply to all pixels in grain block
        for (let gy = 0; gy < this.grainSize; gy++) {
          for (let gx = 0; gx < this.grainSize; gx++) {
            const px = nx * this.grainSize + gx;
            const py = ny * this.grainSize + gy;

            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            data[idx] = Math.max(0, Math.min(255, data[idx] + noiseR));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noiseG));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noiseB));
          }
        }
      }
    }
  }

  addUniformNoise(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const range = this.intensity * 2.55;

    const noiseWidth = Math.ceil(width / this.grainSize);
    const noiseHeight = Math.ceil(height / this.grainSize);

    for (let ny = 0; ny < noiseHeight; ny++) {
      for (let nx = 0; nx < noiseWidth; nx++) {
        let noiseR, noiseG, noiseB;

        if (this.colorMode === 'mono') {
          const noise = (Math.random() - 0.5) * 2 * range;
          noiseR = noiseG = noiseB = noise;
        } else {
          noiseR = (Math.random() - 0.5) * 2 * range;
          noiseG = (Math.random() - 0.5) * 2 * range;
          noiseB = (Math.random() - 0.5) * 2 * range;
        }

        for (let gy = 0; gy < this.grainSize; gy++) {
          for (let gx = 0; gx < this.grainSize; gx++) {
            const px = nx * this.grainSize + gx;
            const py = ny * this.grainSize + gy;

            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            data[idx] = Math.max(0, Math.min(255, data[idx] + noiseR));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noiseG));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noiseB));
          }
        }
      }
    }
  }

  addSaltPepperNoise(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const probability = this.intensity / 100;

    const noiseWidth = Math.ceil(width / this.grainSize);
    const noiseHeight = Math.ceil(height / this.grainSize);

    for (let ny = 0; ny < noiseHeight; ny++) {
      for (let nx = 0; nx < noiseWidth; nx++) {
        if (Math.random() > probability) continue;

        const isSalt = Math.random() > 0.5;
        const value = isSalt ? 255 : 0;

        for (let gy = 0; gy < this.grainSize; gy++) {
          for (let gx = 0; gx < this.grainSize; gx++) {
            const px = nx * this.grainSize + gx;
            const py = ny * this.grainSize + gy;

            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            data[idx] = value;
            data[idx + 1] = value;
            data[idx + 2] = value;
          }
        }
      }
    }
  }

  addFilmGrain(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const sigma = this.intensity * 1.5;

    const noiseWidth = Math.ceil(width / this.grainSize);
    const noiseHeight = Math.ceil(height / this.grainSize);

    for (let ny = 0; ny < noiseHeight; ny++) {
      for (let nx = 0; nx < noiseWidth; nx++) {
        // Film grain typically varies with luminance
        const samplePx = Math.min(nx * this.grainSize, width - 1);
        const samplePy = Math.min(ny * this.grainSize, height - 1);
        const sampleIdx = (samplePy * width + samplePx) * 4;
        const luminance = data[sampleIdx] * 0.299 + data[sampleIdx + 1] * 0.587 + data[sampleIdx + 2] * 0.114;

        // More noise in midtones, less in shadows and highlights
        const midtoneFactor = 1 - Math.abs(luminance - 128) / 128;
        const adjustedSigma = sigma * (0.5 + midtoneFactor * 0.5);

        let noise = this.gaussianRandom() * adjustedSigma;

        // Add some color cast for film look
        let noiseR, noiseG, noiseB;
        if (this.colorMode === 'mono') {
          noiseR = noiseG = noiseB = noise;
        } else {
          // Slight warm/cool variations
          const warmShift = (Math.random() - 0.5) * adjustedSigma * 0.3;
          noiseR = noise + warmShift;
          noiseG = noise;
          noiseB = noise - warmShift;
        }

        for (let gy = 0; gy < this.grainSize; gy++) {
          for (let gx = 0; gx < this.grainSize; gx++) {
            const px = nx * this.grainSize + gx;
            const py = ny * this.grainSize + gy;

            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            data[idx] = Math.max(0, Math.min(255, data[idx] + noiseR));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noiseG));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noiseB));
          }
        }
      }
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `noise_${this.noiseType}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.noiseType = 'gaussian';
    this.intensity = 30;
    this.grainSize = 1;
    this.colorMode = 'mono';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    // Reset UI
    document.querySelectorAll('.noise-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === 'gaussian');
    });
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === 'mono');
    });
    this.intensitySlider.value = 30;
    this.intensityValue.textContent = '30%';
    this.sizeSlider.value = 1;
    this.sizeValue.textContent = '1';

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
  new NoiseTool();
});
