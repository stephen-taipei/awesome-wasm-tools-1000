/**
 * IMG-069 浮雕效果
 * 產生浮雕/凸起的立體效果
 */

class EmbossTool {
  constructor() {
    this.sourceImage = null;
    this.direction = 'bl'; // bottom-left light source
    this.strength = 5;
    this.style = 'emboss';

    // Emboss kernels for different light directions
    this.kernels = {
      tl: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],    // Top-left
      t:  [[-1, -2, -1], [0, 1, 0], [1, 2, 1]],     // Top
      tr: [[0, -1, -2], [1, 1, -1], [2, 1, 0]],     // Top-right
      l:  [[-1, 0, 1], [-2, 1, 2], [-1, 0, 1]],     // Left
      r:  [[1, 0, -1], [2, 1, -2], [1, 0, -1]],     // Right
      bl: [[0, 1, 2], [-1, 1, 1], [-2, -1, 0]],     // Bottom-left
      b:  [[1, 2, 1], [0, 1, 0], [-1, -2, -1]],     // Bottom
      br: [[2, 1, 0], [1, 1, -1], [0, -1, -2]]      // Bottom-right
    };

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

    // Direction buttons
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.direction = btn.dataset.direction;
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Strength slider
    this.strengthSlider.addEventListener('input', () => {
      this.strength = parseInt(this.strengthSlider.value);
      this.strengthValue.textContent = this.strength;
    });
    this.strengthSlider.addEventListener('change', () => this.processImage());

    // Style buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.style = btn.dataset.style;
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
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

    // Get source image data
    const srcData = this.originalCtx.getImageData(0, 0, width, height);
    const destData = this.resultCtx.createImageData(width, height);

    // Get the kernel based on direction
    let kernel = this.kernels[this.direction];

    // For deboss, invert the kernel
    if (this.style === 'deboss') {
      kernel = kernel.map(row => row.map(val => -val));
    }

    // Apply the emboss effect
    this.applyEmboss(srcData.data, destData.data, width, height, kernel, this.strength, this.style === 'color');

    this.resultCtx.putImageData(destData, 0, 0);

    const directionNames = {
      tl: '左上', t: '上', tr: '右上',
      l: '左', r: '右',
      bl: '左下', b: '下', br: '右下'
    };

    const styleNames = {
      emboss: '浮雕',
      deboss: '凹雕',
      color: '彩色浮雕'
    };

    this.previewInfo.textContent = `${width} × ${height} px | ${styleNames[this.style]} | 光源: ${directionNames[this.direction]} | 強度: ${this.strength}`;
    this.showStatus('success', '浮雕效果已套用');
  }

  applyEmboss(src, dest, width, height, kernel, strength, preserveColor) {
    const factor = strength / 5; // Normalize strength

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumR = 0, sumG = 0, sumB = 0;

        // Apply convolution
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const kVal = kernel[ky + 1][kx + 1] * factor;

            sumR += src[idx] * kVal;
            sumG += src[idx + 1] * kVal;
            sumB += src[idx + 2] * kVal;
          }
        }

        const destIdx = (y * width + x) * 4;

        if (preserveColor) {
          // Color emboss: add emboss effect to original colors
          const srcIdx = (y * width + x) * 4;
          const embossVal = (sumR + sumG + sumB) / 3;

          dest[destIdx] = Math.min(255, Math.max(0, src[srcIdx] + embossVal * 0.5));
          dest[destIdx + 1] = Math.min(255, Math.max(0, src[srcIdx + 1] + embossVal * 0.5));
          dest[destIdx + 2] = Math.min(255, Math.max(0, src[srcIdx + 2] + embossVal * 0.5));
        } else {
          // Grayscale emboss: add 128 to center the values
          const gray = (sumR + sumG + sumB) / 3 + 128;
          const clamped = Math.min(255, Math.max(0, gray));

          dest[destIdx] = clamped;
          dest[destIdx + 1] = clamped;
          dest[destIdx + 2] = clamped;
        }

        dest[destIdx + 3] = 255;
      }
    }

    // Handle edges by copying from source (simple approach)
    for (let x = 0; x < width; x++) {
      // Top row
      const topIdx = x * 4;
      dest[topIdx] = dest[topIdx + 1] = dest[topIdx + 2] = 128;
      dest[topIdx + 3] = 255;

      // Bottom row
      const bottomIdx = ((height - 1) * width + x) * 4;
      dest[bottomIdx] = dest[bottomIdx + 1] = dest[bottomIdx + 2] = 128;
      dest[bottomIdx + 3] = 255;
    }

    for (let y = 0; y < height; y++) {
      // Left column
      const leftIdx = y * width * 4;
      dest[leftIdx] = dest[leftIdx + 1] = dest[leftIdx + 2] = 128;
      dest[leftIdx + 3] = 255;

      // Right column
      const rightIdx = (y * width + width - 1) * 4;
      dest[rightIdx] = dest[rightIdx + 1] = dest[rightIdx + 2] = 128;
      dest[rightIdx + 3] = 255;
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `emboss_${this.style}_${this.direction}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '浮雕圖已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.direction = 'bl';
    this.strength = 5;
    this.style = 'emboss';

    this.strengthSlider.value = 5;
    this.strengthValue.textContent = '5';

    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.direction === 'bl');
    });

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === 'emboss');
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
  new EmbossTool();
});
