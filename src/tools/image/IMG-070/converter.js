/**
 * IMG-070 邊緣偵測
 * 提取圖片邊緣輪廓線（Sobel/Prewitt/Roberts/Laplacian）
 */

class EdgeDetectionTool {
  constructor() {
    this.sourceImage = null;
    this.algorithm = 'sobel';
    this.lowThreshold = 50;
    this.highThreshold = 150;
    this.outputMode = 'white';

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

    this.lowThresholdSlider = document.getElementById('lowThresholdSlider');
    this.lowThresholdValue = document.getElementById('lowThresholdValue');
    this.highThresholdSlider = document.getElementById('highThresholdSlider');
    this.highThresholdValue = document.getElementById('highThresholdValue');

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

    // Algorithm buttons
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.algorithm = btn.dataset.algo;
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Threshold sliders
    this.lowThresholdSlider.addEventListener('input', () => {
      this.lowThreshold = parseInt(this.lowThresholdSlider.value);
      this.lowThresholdValue.textContent = this.lowThreshold;
    });
    this.lowThresholdSlider.addEventListener('change', () => this.processImage());

    this.highThresholdSlider.addEventListener('input', () => {
      this.highThreshold = parseInt(this.highThresholdSlider.value);
      this.highThresholdValue.textContent = this.highThreshold;
    });
    this.highThresholdSlider.addEventListener('change', () => this.processImage());

    // Output mode buttons
    document.querySelectorAll('.output-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.outputMode = btn.dataset.output;
        document.querySelectorAll('.output-btn').forEach(b => b.classList.remove('active'));
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

    // Convert to grayscale
    const gray = this.toGrayscale(srcData.data, width, height);

    // Apply edge detection based on algorithm
    let edges;
    switch (this.algorithm) {
      case 'sobel':
        edges = this.applySobel(gray, width, height);
        break;
      case 'prewitt':
        edges = this.applyPrewitt(gray, width, height);
        break;
      case 'roberts':
        edges = this.applyRoberts(gray, width, height);
        break;
      case 'laplacian':
        edges = this.applyLaplacian(gray, width, height);
        break;
    }

    // Apply thresholding
    const thresholded = this.applyThreshold(edges, width, height, this.lowThreshold, this.highThreshold);

    // Create output based on mode
    const destData = this.resultCtx.createImageData(width, height);
    this.createOutput(srcData.data, thresholded, destData.data, width, height, this.outputMode);

    this.resultCtx.putImageData(destData, 0, 0);

    const algoNames = {
      sobel: 'Sobel',
      prewitt: 'Prewitt',
      roberts: 'Roberts',
      laplacian: 'Laplacian'
    };

    this.previewInfo.textContent = `${width} × ${height} px | ${algoNames[this.algorithm]} | 閾值: ${this.lowThreshold}-${this.highThreshold}`;
    this.showStatus('success', '邊緣偵測完成');
  }

  toGrayscale(data, width, height) {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return gray;
  }

  applySobel(gray, width, height) {
    const edges = new Float32Array(width * height);

    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            gx += gray[idx] * sobelX[ky + 1][kx + 1];
            gy += gray[idx] * sobelY[ky + 1][kx + 1];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  applyPrewitt(gray, width, height) {
    const edges = new Float32Array(width * height);

    const prewittX = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
    const prewittY = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            gx += gray[idx] * prewittX[ky + 1][kx + 1];
            gy += gray[idx] * prewittY[ky + 1][kx + 1];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  applyRoberts(gray, width, height) {
    const edges = new Float32Array(width * height);

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = gray[idx] - gray[(y + 1) * width + (x + 1)];
        const gy = gray[y * width + (x + 1)] - gray[(y + 1) * width + x];

        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  applyLaplacian(gray, width, height) {
    const edges = new Float32Array(width * height);

    const laplacian = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            sum += gray[idx] * laplacian[ky + 1][kx + 1];
          }
        }

        edges[y * width + x] = Math.abs(sum);
      }
    }

    return edges;
  }

  applyThreshold(edges, width, height, low, high) {
    const result = new Uint8Array(width * height);

    // Normalize edges to 0-255
    let maxEdge = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > maxEdge) maxEdge = edges[i];
    }

    if (maxEdge === 0) maxEdge = 1;

    for (let i = 0; i < edges.length; i++) {
      const normalized = (edges[i] / maxEdge) * 255;
      if (normalized >= high) {
        result[i] = 255;
      } else if (normalized >= low) {
        result[i] = 128;
      } else {
        result[i] = 0;
      }
    }

    return result;
  }

  createOutput(src, edges, dest, width, height, mode) {
    for (let i = 0; i < edges.length; i++) {
      const destIdx = i * 4;
      const srcIdx = i * 4;
      const edge = edges[i] > 0 ? 255 : 0;

      switch (mode) {
        case 'white':
          // White background, black edges
          dest[destIdx] = edge > 0 ? 0 : 255;
          dest[destIdx + 1] = edge > 0 ? 0 : 255;
          dest[destIdx + 2] = edge > 0 ? 0 : 255;
          break;

        case 'black':
          // Black background, white edges
          dest[destIdx] = edge;
          dest[destIdx + 1] = edge;
          dest[destIdx + 2] = edge;
          break;

        case 'overlay':
          // Overlay edges on original
          if (edge > 0) {
            dest[destIdx] = 255;
            dest[destIdx + 1] = 0;
            dest[destIdx + 2] = 0;
          } else {
            dest[destIdx] = src[srcIdx];
            dest[destIdx + 1] = src[srcIdx + 1];
            dest[destIdx + 2] = src[srcIdx + 2];
          }
          break;
      }

      dest[destIdx + 3] = 255;
    }
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `edge_${this.algorithm}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '邊緣圖已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.algorithm = 'sobel';
    this.lowThreshold = 50;
    this.highThreshold = 150;
    this.outputMode = 'white';

    this.lowThresholdSlider.value = 50;
    this.highThresholdSlider.value = 150;
    this.lowThresholdValue.textContent = '50';
    this.highThresholdValue.textContent = '150';

    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.algo === 'sobel');
    });

    document.querySelectorAll('.output-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.output === 'white');
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
  new EdgeDetectionTool();
});
