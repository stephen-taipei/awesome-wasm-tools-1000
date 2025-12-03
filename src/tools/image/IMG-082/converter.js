/**
 * IMG-082 降噪處理
 * 移除圖片中的噪點雜訊
 */

class DenoiseTool {
  constructor() {
    this.sourceImage = null;
    this.method = 'bilateral';
    this.strength = 50;
    this.detailPreserve = 50;
    this.processing = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');
    this.processingIndicator = document.getElementById('processingIndicator');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.strengthSlider = document.getElementById('strengthSlider');
    this.strengthValue = document.getElementById('strengthValue');
    this.detailSlider = document.getElementById('detailSlider');
    this.detailValue = document.getElementById('detailValue');

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

    // Method buttons
    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.method = btn.dataset.method;
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage && !this.processing) this.processImage();
      });
    });

    // Sliders with debounce
    let debounceTimer;
    const debounceProcess = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this.sourceImage && !this.processing) this.processImage();
      }, 300);
    };

    this.strengthSlider.addEventListener('input', () => {
      this.strength = parseInt(this.strengthSlider.value);
      this.strengthValue.textContent = this.strength + '%';
      debounceProcess();
    });

    this.detailSlider.addEventListener('input', () => {
      this.detailPreserve = parseInt(this.detailSlider.value);
      this.detailValue.textContent = this.detailPreserve + '%';
      debounceProcess();
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

  async processImage() {
    if (!this.sourceImage || this.processing) return;

    this.processing = true;
    this.processingIndicator.classList.add('show');

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Get source data
    const srcData = this.originalCtx.getImageData(0, 0, width, height);

    // Process in chunks to avoid blocking UI
    await new Promise(resolve => setTimeout(resolve, 10));

    let resultData;
    const startTime = performance.now();

    switch (this.method) {
      case 'bilateral':
        resultData = this.bilateralFilter(srcData);
        break;
      case 'median':
        resultData = this.medianFilter(srcData);
        break;
      case 'gaussian':
        resultData = this.gaussianBlur(srcData);
        break;
      case 'nlm':
        resultData = this.nonLocalMeans(srcData);
        break;
      default:
        resultData = srcData;
    }

    const processTime = ((performance.now() - startTime) / 1000).toFixed(2);

    this.resultCtx.putImageData(resultData, 0, 0);

    const methodNames = {
      bilateral: '雙邊濾波',
      median: '中值濾波',
      gaussian: '高斯模糊',
      nlm: '非局部均值'
    };

    this.previewInfo.textContent = `${methodNames[this.method]} | 強度: ${this.strength}% | 處理時間: ${processTime}s`;

    this.processing = false;
    this.processingIndicator.classList.remove('show');
    this.showStatus('success', '降噪處理完成');
  }

  bilateralFilter(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);
    const resultData = result.data;

    // Kernel radius based on strength
    const radius = Math.max(1, Math.floor(this.strength / 15));
    // Sigma values
    const sigmaSpace = radius / 2;
    const sigmaColor = 30 + (100 - this.detailPreserve) * 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;
        const centerR = data[idx];
        const centerG = data[idx + 1];
        const centerB = data[idx + 2];

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = Math.min(height - 1, Math.max(0, y + ky));
            const nx = Math.min(width - 1, Math.max(0, x + kx));
            const nIdx = (ny * width + nx) * 4;

            const nR = data[nIdx];
            const nG = data[nIdx + 1];
            const nB = data[nIdx + 2];

            // Spatial weight
            const spatialDist = Math.sqrt(kx * kx + ky * ky);
            const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));

            // Color weight
            const colorDist = Math.sqrt(
              (nR - centerR) ** 2 + (nG - centerG) ** 2 + (nB - centerB) ** 2
            );
            const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));

            const weight = spatialWeight * colorWeight;
            sumR += nR * weight;
            sumG += nG * weight;
            sumB += nB * weight;
            sumWeight += weight;
          }
        }

        resultData[idx] = Math.round(sumR / sumWeight);
        resultData[idx + 1] = Math.round(sumG / sumWeight);
        resultData[idx + 2] = Math.round(sumB / sumWeight);
        resultData[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  medianFilter(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);
    const resultData = result.data;

    const radius = Math.max(1, Math.floor(this.strength / 20));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const rValues = [], gValues = [], bValues = [];

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = Math.min(height - 1, Math.max(0, y + ky));
            const nx = Math.min(width - 1, Math.max(0, x + kx));
            const nIdx = (ny * width + nx) * 4;

            rValues.push(data[nIdx]);
            gValues.push(data[nIdx + 1]);
            bValues.push(data[nIdx + 2]);
          }
        }

        rValues.sort((a, b) => a - b);
        gValues.sort((a, b) => a - b);
        bValues.sort((a, b) => a - b);

        const mid = Math.floor(rValues.length / 2);

        // Blend with original based on detail preservation
        const blend = this.detailPreserve / 100;
        resultData[idx] = Math.round(rValues[mid] * (1 - blend) + data[idx] * blend);
        resultData[idx + 1] = Math.round(gValues[mid] * (1 - blend) + data[idx + 1] * blend);
        resultData[idx + 2] = Math.round(bValues[mid] * (1 - blend) + data[idx + 2] * blend);
        resultData[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  gaussianBlur(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);
    const resultData = result.data;

    const sigma = this.strength / 20;
    const radius = Math.ceil(sigma * 3);

    // Generate Gaussian kernel
    const kernel = [];
    let kernelSum = 0;
    for (let i = -radius; i <= radius; i++) {
      const val = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel.push(val);
      kernelSum += val;
    }
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= kernelSum;
    }

    // Temporary buffer for horizontal pass
    const temp = new Float32Array(width * height * 4);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = Math.min(width - 1, Math.max(0, x + k));
          const idx = (y * width + nx) * 4;
          const weight = kernel[k + radius];
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
        const idx = (y * width + x) * 4;
        temp[idx] = r;
        temp[idx + 1] = g;
        temp[idx + 2] = b;
        temp[idx + 3] = data[idx + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = Math.min(height - 1, Math.max(0, y + k));
          const idx = (ny * width + x) * 4;
          const weight = kernel[k + radius];
          r += temp[idx] * weight;
          g += temp[idx + 1] * weight;
          b += temp[idx + 2] * weight;
        }
        const idx = (y * width + x) * 4;

        // Blend with original based on detail preservation
        const blend = this.detailPreserve / 100;
        resultData[idx] = Math.round(r * (1 - blend) + data[idx] * blend);
        resultData[idx + 1] = Math.round(g * (1 - blend) + data[idx + 1] * blend);
        resultData[idx + 2] = Math.round(b * (1 - blend) + data[idx + 2] * blend);
        resultData[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  nonLocalMeans(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(width, height);
    const resultData = result.data;

    // NLM parameters
    const searchRadius = Math.max(3, Math.floor(this.strength / 15));
    const patchRadius = 1;
    const h = 10 + (100 - this.detailPreserve);

    // For performance, process every pixel but limit search area
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

        // Search window
        for (let sy = -searchRadius; sy <= searchRadius; sy++) {
          for (let sx = -searchRadius; sx <= searchRadius; sx++) {
            const ny = y + sy;
            const nx = x + sx;

            if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;

            // Calculate patch distance
            let patchDist = 0;
            let patchCount = 0;

            for (let py = -patchRadius; py <= patchRadius; py++) {
              for (let px = -patchRadius; px <= patchRadius; px++) {
                const cy = Math.min(height - 1, Math.max(0, y + py));
                const cx = Math.min(width - 1, Math.max(0, x + px));
                const cny = Math.min(height - 1, Math.max(0, ny + py));
                const cnx = Math.min(width - 1, Math.max(0, nx + px));

                const cIdx = (cy * width + cx) * 4;
                const cnIdx = (cny * width + cnx) * 4;

                patchDist += (data[cIdx] - data[cnIdx]) ** 2;
                patchDist += (data[cIdx + 1] - data[cnIdx + 1]) ** 2;
                patchDist += (data[cIdx + 2] - data[cnIdx + 2]) ** 2;
                patchCount++;
              }
            }

            patchDist /= patchCount;
            const weight = Math.exp(-patchDist / (h * h));

            const nIdx = (ny * width + nx) * 4;
            sumR += data[nIdx] * weight;
            sumG += data[nIdx + 1] * weight;
            sumB += data[nIdx + 2] * weight;
            sumWeight += weight;
          }
        }

        resultData[idx] = Math.round(sumR / sumWeight);
        resultData[idx + 1] = Math.round(sumG / sumWeight);
        resultData[idx + 2] = Math.round(sumB / sumWeight);
        resultData[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `denoised_${this.method}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.method = 'bilateral';
    this.strength = 50;
    this.detailPreserve = 50;

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.processingIndicator.classList.remove('show');
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === 'bilateral');
    });
    this.strengthSlider.value = 50;
    this.strengthValue.textContent = '50%';
    this.detailSlider.value = 50;
    this.detailValue.textContent = '50%';

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
  new DenoiseTool();
});
