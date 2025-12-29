class EdgeDetectionTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      algorithm: 'sobel',
      threshold: 50,
      strength: 100,
      invert: false,
      overlay: false,
      edgeColor: '#00ff00'
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    document.getElementById('algoSelect').addEventListener('change', (e) => {
      this.settings.algorithm = e.target.value;
      this.render();
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
      this.render();
    });

    document.getElementById('invertCheck').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
      this.render();
    });

    document.getElementById('overlayCheck').addEventListener('change', (e) => {
      this.settings.overlay = e.target.checked;
      this.render();
    });

    document.getElementById('edgeColor').addEventListener('input', (e) => {
      this.settings.edgeColor = e.target.value;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  }

  toGrayscale(data, width, height) {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
    return gray;
  }

  convolve(gray, width, height, kernelX, kernelY) {
    const result = new Float32Array(width * height);
    const kSize = Math.sqrt(kernelX.length);
    const half = Math.floor(kSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let gx = 0, gy = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const val = gray[py * width + px];
            gx += val * kernelX[ky * kSize + kx];
            gy += val * kernelY[ky * kSize + kx];
          }
        }
        result[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return result;
  }

  sobel(gray, width, height) {
    const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    return this.convolve(gray, width, height, kx, ky);
  }

  prewitt(gray, width, height) {
    const kx = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
    const ky = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
    return this.convolve(gray, width, height, kx, ky);
  }

  roberts(gray, width, height) {
    const result = new Float32Array(width * height);
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = gray[idx] - gray[(y + 1) * width + x + 1];
        const gy = gray[y * width + x + 1] - gray[(y + 1) * width + x];
        result[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return result;
  }

  laplacian(gray, width, height) {
    const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
    const result = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            sum += gray[py * width + px] * kernel[ky * 3 + kx];
          }
        }
        result[y * width + x] = Math.abs(sum);
      }
    }
    return result;
  }

  gaussianBlur(gray, width, height) {
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const sum = 16;
    const result = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let val = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            val += gray[py * width + px] * kernel[ky * 3 + kx];
          }
        }
        result[y * width + x] = val / sum;
      }
    }
    return result;
  }

  canny(gray, width, height) {
    // Simplified Canny: Gaussian blur -> Sobel -> Non-max suppression -> Threshold
    const blurred = this.gaussianBlur(gray, width, height);
    const edges = this.sobel(blurred, width, height);

    // Gradient direction
    const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    const angles = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        for (let k = 0; k < 9; k++) {
          const kxIdx = k % 3 - 1;
          const kyIdx = Math.floor(k / 3) - 1;
          const val = blurred[(y + kyIdx) * width + x + kxIdx];
          gx += val * kx[k];
          gy += val * ky[k];
        }
        angles[y * width + x] = Math.atan2(gy, gx);
      }
    }

    // Non-maximum suppression
    const result = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = angles[idx];
        const mag = edges[idx];

        let n1, n2;
        const a = ((angle + Math.PI) / Math.PI * 4) % 4;

        if (a < 1 || a >= 3) {
          n1 = edges[y * width + x - 1];
          n2 = edges[y * width + x + 1];
        } else if (a < 2) {
          n1 = edges[(y - 1) * width + x + 1];
          n2 = edges[(y + 1) * width + x - 1];
        } else {
          n1 = edges[(y - 1) * width + x];
          n2 = edges[(y + 1) * width + x];
        }

        result[idx] = (mag >= n1 && mag >= n2) ? mag : 0;
      }
    }

    return result;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;

    const gray = this.toGrayscale(srcData, width, height);
    let edges;

    switch (this.settings.algorithm) {
      case 'sobel':
        edges = this.sobel(gray, width, height);
        break;
      case 'prewitt':
        edges = this.prewitt(gray, width, height);
        break;
      case 'roberts':
        edges = this.roberts(gray, width, height);
        break;
      case 'laplacian':
        edges = this.laplacian(gray, width, height);
        break;
      case 'canny':
        edges = this.canny(gray, width, height);
        break;
    }

    const outputData = this.ctx.createImageData(width, height);
    const threshold = this.settings.threshold;
    const strength = this.settings.strength / 100;
    const edgeColor = this.hexToRgb(this.settings.edgeColor);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      let edgeVal = edges[i] * strength;

      if (edgeVal < threshold) edgeVal = 0;
      edgeVal = Math.min(255, edgeVal);

      if (this.settings.invert) {
        edgeVal = 255 - edgeVal;
      }

      if (this.settings.overlay) {
        const blend = edgeVal / 255;
        outputData.data[idx] = srcData[idx] * (1 - blend) + edgeColor.r * blend;
        outputData.data[idx + 1] = srcData[idx + 1] * (1 - blend) + edgeColor.g * blend;
        outputData.data[idx + 2] = srcData[idx + 2] * (1 - blend) + edgeColor.b * blend;
      } else {
        const intensity = edgeVal / 255;
        outputData.data[idx] = edgeColor.r * intensity;
        outputData.data[idx + 1] = edgeColor.g * intensity;
        outputData.data[idx + 2] = edgeColor.b * intensity;
      }
      outputData.data[idx + 3] = 255;
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'edge-detection.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      algorithm: 'sobel',
      threshold: 50,
      strength: 100,
      invert: false,
      overlay: false,
      edgeColor: '#00ff00'
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('algoSelect').value = 'sobel';
    document.getElementById('threshold').value = 50;
    document.getElementById('thresholdValue').textContent = '50';
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    document.getElementById('invertCheck').checked = false;
    document.getElementById('overlayCheck').checked = false;
    document.getElementById('edgeColor').value = '#00ff00';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EdgeDetectionTool();
});
