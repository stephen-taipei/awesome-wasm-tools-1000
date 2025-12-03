/**
 * IMG-073 故障藝術效果
 * 產生數位故障（Glitch Art）效果
 */

class GlitchArtTool {
  constructor() {
    this.sourceImage = null;
    this.effect = 'rgb';
    this.intensity = 50;
    this.offset = 10;
    this.seed = 50;

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
    this.offsetSlider = document.getElementById('offsetSlider');
    this.offsetValue = document.getElementById('offsetValue');
    this.seedSlider = document.getElementById('seedSlider');
    this.seedValue = document.getElementById('seedValue');

    this.randomBtn = document.getElementById('randomBtn');
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

    // Effect buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.effect = btn.dataset.effect;
        document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Sliders
    this.intensitySlider.addEventListener('input', () => {
      this.intensity = parseInt(this.intensitySlider.value);
      this.intensityValue.textContent = `${this.intensity}%`;
      this.processImage();
    });

    this.offsetSlider.addEventListener('input', () => {
      this.offset = parseInt(this.offsetSlider.value);
      this.offsetValue.textContent = `${this.offset}px`;
      this.processImage();
    });

    this.seedSlider.addEventListener('input', () => {
      this.seed = parseInt(this.seedSlider.value);
      this.seedValue.textContent = this.seed;
      this.processImage();
    });

    // Buttons
    this.randomBtn.addEventListener('click', () => this.randomize());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  // Seeded random number generator
  seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
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
        this.randomBtn.disabled = false;

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

    // Draw original image
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Apply effect based on type
    switch (this.effect) {
      case 'rgb':
        this.applyRGBShift(width, height);
        break;
      case 'scanline':
        this.applyScanlines(width, height);
        break;
      case 'slice':
        this.applySlice(width, height);
        break;
      case 'noise':
        this.applyNoise(width, height);
        break;
    }

    const effectNames = {
      rgb: 'RGB 偏移',
      scanline: '掃描線',
      slice: '像素切片',
      noise: '雜訊干擾'
    };

    this.previewInfo.textContent = `${width} × ${height} px | ${effectNames[this.effect]} | 強度: ${this.intensity}%`;
    this.showStatus('success', '故障效果已套用');
  }

  applyRGBShift(width, height) {
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    const shiftAmount = Math.floor(this.offset * (this.intensity / 100));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Shift red channel left
        const redX = Math.max(0, x - shiftAmount);
        const redIdx = (y * width + redX) * 4;
        newData[idx] = data[redIdx];

        // Keep green in place
        newData[idx + 1] = data[idx + 1];

        // Shift blue channel right
        const blueX = Math.min(width - 1, x + shiftAmount);
        const blueIdx = (y * width + blueX) * 4;
        newData[idx + 2] = data[blueIdx + 2];

        newData[idx + 3] = data[idx + 3];
      }
    }

    imageData.data.set(newData);
    this.resultCtx.putImageData(imageData, 0, 0);
  }

  applyScanlines(width, height) {
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const lineSpacing = Math.max(2, Math.floor(10 - (this.intensity / 20)));
    const lineIntensity = this.intensity / 100;

    for (let y = 0; y < height; y++) {
      if (y % lineSpacing === 0) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const darken = 1 - lineIntensity * 0.7;
          data[idx] = Math.floor(data[idx] * darken);
          data[idx + 1] = Math.floor(data[idx + 1] * darken);
          data[idx + 2] = Math.floor(data[idx + 2] * darken);
        }
      }
    }

    // Add random horizontal shifts
    const numShifts = Math.floor(this.intensity / 10);
    for (let i = 0; i < numShifts; i++) {
      const shiftY = Math.floor(this.seededRandom(this.seed + i) * height);
      const shiftHeight = Math.floor(this.seededRandom(this.seed + i + 100) * 20) + 5;
      const shiftX = Math.floor((this.seededRandom(this.seed + i + 200) - 0.5) * this.offset * 2);

      for (let y = shiftY; y < Math.min(shiftY + shiftHeight, height); y++) {
        const rowData = [];
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          rowData.push([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]);
        }

        for (let x = 0; x < width; x++) {
          const srcX = (x - shiftX + width) % width;
          const idx = (y * width + x) * 4;
          data[idx] = rowData[srcX][0];
          data[idx + 1] = rowData[srcX][1];
          data[idx + 2] = rowData[srcX][2];
          data[idx + 3] = rowData[srcX][3];
        }
      }
    }

    this.resultCtx.putImageData(imageData, 0, 0);
  }

  applySlice(width, height) {
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const originalData = new Uint8ClampedArray(data);

    const numSlices = Math.floor(this.intensity / 5) + 1;

    for (let i = 0; i < numSlices; i++) {
      const sliceY = Math.floor(this.seededRandom(this.seed + i) * height);
      const sliceHeight = Math.floor(this.seededRandom(this.seed + i + 50) * 30) + 5;
      const sliceOffset = Math.floor((this.seededRandom(this.seed + i + 100) - 0.5) * this.offset * 4);

      for (let y = sliceY; y < Math.min(sliceY + sliceHeight, height); y++) {
        for (let x = 0; x < width; x++) {
          const srcX = (x - sliceOffset + width) % width;
          const dstIdx = (y * width + x) * 4;
          const srcIdx = (y * width + srcX) * 4;

          data[dstIdx] = originalData[srcIdx];
          data[dstIdx + 1] = originalData[srcIdx + 1];
          data[dstIdx + 2] = originalData[srcIdx + 2];
          data[dstIdx + 3] = originalData[srcIdx + 3];
        }
      }
    }

    // Add color corruption to some slices
    for (let i = 0; i < Math.floor(numSlices / 2); i++) {
      const corruptY = Math.floor(this.seededRandom(this.seed + i + 200) * height);
      const corruptHeight = Math.floor(this.seededRandom(this.seed + i + 250) * 10) + 2;
      const channel = Math.floor(this.seededRandom(this.seed + i + 300) * 3);

      for (let y = corruptY; y < Math.min(corruptY + corruptHeight, height); y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          data[idx + channel] = Math.min(255, data[idx + channel] + 100);
        }
      }
    }

    this.resultCtx.putImageData(imageData, 0, 0);
  }

  applyNoise(width, height) {
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const noiseIntensity = this.intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      if (this.seededRandom(this.seed + i) < noiseIntensity * 0.3) {
        const noise = (this.seededRandom(this.seed + i + 1) - 0.5) * 255 * noiseIntensity;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
    }

    // Add random color blocks
    const numBlocks = Math.floor(this.intensity / 10);
    for (let i = 0; i < numBlocks; i++) {
      const blockX = Math.floor(this.seededRandom(this.seed + i + 500) * width);
      const blockY = Math.floor(this.seededRandom(this.seed + i + 600) * height);
      const blockW = Math.floor(this.seededRandom(this.seed + i + 700) * this.offset * 3) + 5;
      const blockH = Math.floor(this.seededRandom(this.seed + i + 800) * 10) + 2;

      const r = Math.floor(this.seededRandom(this.seed + i + 900) * 255);
      const g = Math.floor(this.seededRandom(this.seed + i + 1000) * 255);
      const b = Math.floor(this.seededRandom(this.seed + i + 1100) * 255);

      for (let y = blockY; y < Math.min(blockY + blockH, height); y++) {
        for (let x = blockX; x < Math.min(blockX + blockW, width); x++) {
          const idx = (y * width + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }

    this.resultCtx.putImageData(imageData, 0, 0);
  }

  randomize() {
    // Randomize all parameters
    this.intensity = Math.floor(Math.random() * 80) + 20;
    this.offset = Math.floor(Math.random() * 40) + 5;
    this.seed = Math.floor(Math.random() * 100) + 1;

    const effects = ['rgb', 'scanline', 'slice', 'noise'];
    this.effect = effects[Math.floor(Math.random() * effects.length)];

    // Update UI
    this.intensitySlider.value = this.intensity;
    this.offsetSlider.value = this.offset;
    this.seedSlider.value = this.seed;
    this.intensityValue.textContent = `${this.intensity}%`;
    this.offsetValue.textContent = `${this.offset}px`;
    this.seedValue.textContent = this.seed;

    document.querySelectorAll('.effect-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.effect === this.effect);
    });

    this.processImage();
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `glitch_${this.effect}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.randomBtn.disabled = true;

    this.effect = 'rgb';
    this.intensity = 50;
    this.offset = 10;
    this.seed = 50;

    this.intensitySlider.value = 50;
    this.offsetSlider.value = 10;
    this.seedSlider.value = 50;
    this.intensityValue.textContent = '50%';
    this.offsetValue.textContent = '10px';
    this.seedValue.textContent = '50';

    document.querySelectorAll('.effect-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.effect === 'rgb');
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
  new GlitchArtTool();
});
