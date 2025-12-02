/**
 * IMG-026 銳化濾鏡
 * 增強圖片銳利度，使細節更清晰
 */

class SharpenFilter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedType = 'standard';
    this.amount = 100;
    this.radius = 1;
    this.threshold = 0;

    this.sharpenTypes = {
      standard: {
        name: '標準銳化',
        kernel: [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ]
      },
      usm: {
        name: 'USM 銳化',
        kernel: null // Uses unsharp mask algorithm
      },
      highpass: {
        name: '高通濾波',
        kernel: [
          -1, -1, -1,
          -1, 9, -1,
          -1, -1, -1
        ]
      },
      soft: {
        name: '柔和銳化',
        kernel: [
          0, -0.5, 0,
          -0.5, 3, -0.5,
          0, -0.5, 0
        ]
      },
      strong: {
        name: '強力銳化',
        kernel: [
          -1, -1, -1,
          -1, 9, -1,
          -1, -1, -1
        ]
      },
      edge: {
        name: '邊緣增強',
        kernel: [
          0, -2, 0,
          -2, 9, -2,
          0, -2, 0
        ]
      }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.sharpenPanel = document.getElementById('sharpenPanel');
    this.adjustPanel = document.getElementById('adjustPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.sharpenCards = document.querySelectorAll('.sharpen-card');

    this.amountSlider = document.getElementById('amountSlider');
    this.amountValue = document.getElementById('amountValue');
    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.thresholdSlider = document.getElementById('thresholdSlider');
    this.thresholdValue = document.getElementById('thresholdValue');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
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

    // Sharpen type selection
    this.sharpenCards.forEach(card => {
      card.addEventListener('click', () => {
        this.sharpenCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedType = card.dataset.type;
        this.updatePreview();
      });
    });

    // Sliders
    this.amountSlider.addEventListener('input', () => {
      this.amount = parseInt(this.amountSlider.value);
      this.amountValue.textContent = `${this.amount}%`;
      this.updatePreview();
    });

    this.radiusSlider.addEventListener('input', () => {
      this.radius = parseFloat(this.radiusSlider.value);
      this.radiusValue.textContent = `${this.radius}px`;
      this.updatePreview();
    });

    this.thresholdSlider.addEventListener('input', () => {
      this.threshold = parseInt(this.thresholdSlider.value);
      this.thresholdValue.textContent = this.threshold;
      this.updatePreview();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyFilter());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
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

        this.sharpenPanel.style.display = 'block';
        this.adjustPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請選擇銳化類型');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
    this.applySharpen(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applySharpen(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const amount = this.amount / 100;

    if (this.selectedType === 'usm') {
      // Unsharp Mask
      this.applyUSM(imageData, amount);
    } else {
      // Convolution kernel
      const kernel = this.sharpenTypes[this.selectedType].kernel;
      this.applyConvolution(imageData, kernel, amount);
    }
  }

  applyConvolution(imageData, kernel, amount) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const kidx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += original[kidx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }

          // Apply threshold
          const diff = Math.abs(sum - original[idx + c]);
          if (diff < this.threshold) {
            data[idx + c] = original[idx + c];
          } else {
            // Blend with original based on amount
            data[idx + c] = Math.max(0, Math.min(255,
              original[idx + c] + (sum - original[idx + c]) * amount
            ));
          }
        }
      }
    }
  }

  applyUSM(imageData, amount) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    // Create blurred version
    const blurred = this.gaussianBlur(original, width, height, this.radius);

    // Unsharp mask: original + amount * (original - blurred)
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = original[i + c] - blurred[i + c];
        if (Math.abs(diff) >= this.threshold) {
          data[i + c] = Math.max(0, Math.min(255,
            original[i + c] + diff * amount
          ));
        }
      }
    }
  }

  gaussianBlur(data, width, height, radius) {
    const result = new Uint8ClampedArray(data.length);
    const size = Math.ceil(radius * 3);
    const kernel = this.createGaussianKernel(size);

    // Horizontal pass
    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = 0, g = 0, b = 0, weight = 0;

        for (let k = -size; k <= size; k++) {
          const xx = Math.min(width - 1, Math.max(0, x + k));
          const kidx = (y * width + xx) * 4;
          const w = kernel[k + size];
          r += data[kidx] * w;
          g += data[kidx + 1] * w;
          b += data[kidx + 2] * w;
          weight += w;
        }

        temp[idx] = r / weight;
        temp[idx + 1] = g / weight;
        temp[idx + 2] = b / weight;
        temp[idx + 3] = data[idx + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = 0, g = 0, b = 0, weight = 0;

        for (let k = -size; k <= size; k++) {
          const yy = Math.min(height - 1, Math.max(0, y + k));
          const kidx = (yy * width + x) * 4;
          const w = kernel[k + size];
          r += temp[kidx] * w;
          g += temp[kidx + 1] * w;
          b += temp[kidx + 2] * w;
          weight += w;
        }

        result[idx] = r / weight;
        result[idx + 1] = g / weight;
        result[idx + 2] = b / weight;
        result[idx + 3] = temp[idx + 3];
      }
    }

    return result;
  }

  createGaussianKernel(size) {
    const kernel = [];
    const sigma = size / 3;
    for (let i = -size; i <= size; i++) {
      kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    }
    return kernel;
  }

  async applyFilter() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用銳化效果...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用銳化效果...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applySharpen(imageData);
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
      this.showStatus('success', `銳化效果套用完成！類型：${this.sharpenTypes[this.selectedType].name}`);

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
    link.download = `${originalName}_sharpen_${this.selectedType}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedType = 'standard';
    this.amount = 100;
    this.radius = 1;
    this.threshold = 0;

    this.fileInput.value = '';
    this.sharpenPanel.style.display = 'none';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    this.amountSlider.value = 100;
    this.amountValue.textContent = '100%';
    this.radiusSlider.value = 1;
    this.radiusValue.textContent = '1px';
    this.thresholdSlider.value = 0;
    this.thresholdValue.textContent = '0';

    this.sharpenCards.forEach(c => c.classList.remove('selected'));
    this.sharpenCards[0].classList.add('selected');
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
  new SharpenFilter();
});
