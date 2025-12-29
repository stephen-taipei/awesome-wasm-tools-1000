class GaussianBlurTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      radius: 5,
      sigma: 0 // 0 = auto
    };
    this.renderTimeout = null;
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.radius = parseInt(btn.dataset.radius);
        document.getElementById('radius').value = this.settings.radius;
        document.getElementById('radiusValue').textContent = `${this.settings.radius} px`;
        this.debouncedRender();
      });
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${this.settings.radius} px`;
      this.debouncedRender();
    });

    document.getElementById('sigma').addEventListener('input', (e) => {
      this.settings.sigma = parseInt(e.target.value);
      document.getElementById('sigmaValue').textContent = this.settings.sigma === 0 ? '自動' : this.settings.sigma.toFixed(1);
      this.debouncedRender();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  debouncedRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    document.getElementById('processing').classList.add('active');
    this.renderTimeout = setTimeout(() => {
      this.render();
      document.getElementById('processing').classList.remove('active');
    }, 100);
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

  generateKernel(radius, sigma) {
    if (sigma === 0) {
      sigma = radius / 3;
    }
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const radius = this.settings.radius;
    const sigma = this.settings.sigma;

    const kernel = this.generateKernel(radius, sigma);
    const size = radius * 2 + 1;

    // Separable Gaussian blur
    const temp = new Float32Array(width * height * 4);
    const result = new Float32Array(width * height * 4);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;

        for (let k = 0; k < size; k++) {
          const px = Math.max(0, Math.min(width - 1, x + k - radius));
          const idx = (y * width + px) * 4;
          sumR += srcData[idx] * kernel[k];
          sumG += srcData[idx + 1] * kernel[k];
          sumB += srcData[idx + 2] * kernel[k];
          sumA += srcData[idx + 3] * kernel[k];
        }

        const idx = (y * width + x) * 4;
        temp[idx] = sumR;
        temp[idx + 1] = sumG;
        temp[idx + 2] = sumB;
        temp[idx + 3] = sumA;
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;

        for (let k = 0; k < size; k++) {
          const py = Math.max(0, Math.min(height - 1, y + k - radius));
          const idx = (py * width + x) * 4;
          sumR += temp[idx] * kernel[k];
          sumG += temp[idx + 1] * kernel[k];
          sumB += temp[idx + 2] * kernel[k];
          sumA += temp[idx + 3] * kernel[k];
        }

        const idx = (y * width + x) * 4;
        result[idx] = sumR;
        result[idx + 1] = sumG;
        result[idx + 2] = sumB;
        result[idx + 3] = sumA;
      }
    }

    const outputData = this.ctx.createImageData(width, height);
    for (let i = 0; i < result.length; i++) {
      outputData.data[i] = Math.max(0, Math.min(255, Math.round(result[i])));
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'gaussian-blur.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { radius: 5, sigma: 0 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-radius="5"]').classList.add('active');
    document.getElementById('radius').value = 5;
    document.getElementById('radiusValue').textContent = '5 px';
    document.getElementById('sigma').value = 0;
    document.getElementById('sigmaValue').textContent = '自動';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GaussianBlurTool();
});
