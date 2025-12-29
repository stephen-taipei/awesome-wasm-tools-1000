class TiltShiftTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.blurredData = null;
    this.settings = {
      orientation: 'horizontal',
      focus: 50,
      range: 20,
      blur: 15,
      saturation: 120,
      vignette: true
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

    document.querySelectorAll('.orientation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.orientation-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.orientation = btn.dataset.orientation;
        this.debouncedRender();
      });
    });

    document.getElementById('focus').addEventListener('input', (e) => {
      this.settings.focus = parseInt(e.target.value);
      document.getElementById('focusValue').textContent = `${this.settings.focus}%`;
      this.debouncedRender();
    });

    document.getElementById('range').addEventListener('input', (e) => {
      this.settings.range = parseInt(e.target.value);
      document.getElementById('rangeValue').textContent = `${this.settings.range}%`;
      this.debouncedRender();
    });

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.blurredData = null; // Force recalculation
      this.debouncedRender();
    });

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = `${this.settings.saturation}%`;
      this.debouncedRender();
    });

    document.getElementById('vignetteCheck').addEventListener('change', (e) => {
      this.settings.vignette = e.target.checked;
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
    }, 50);
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
        this.blurredData = null;

        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  generateBlurred() {
    if (this.blurredData) return this.blurredData;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const radius = this.settings.blur;

    // Generate Gaussian kernel
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    const sigma = radius / 3;
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;

    // Separable blur
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

    this.blurredData = result;
    return result;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const blurredData = this.generateBlurred();
    const outputData = this.ctx.createImageData(width, height);

    const focusPos = this.settings.focus / 100;
    const focusRange = this.settings.range / 100;
    const satFactor = this.settings.saturation / 100;

    const isHorizontal = this.settings.orientation === 'horizontal';
    const size = isHorizontal ? height : width;
    const focusCenter = focusPos * size;
    const focusWidth = focusRange * size;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Calculate distance from focus line
        const pos = isHorizontal ? y : x;
        const dist = Math.abs(pos - focusCenter);
        let blendFactor = Math.max(0, (dist - focusWidth / 2) / (focusWidth / 2));
        blendFactor = Math.min(1, blendFactor);

        // Smooth transition
        blendFactor = blendFactor * blendFactor * (3 - 2 * blendFactor);

        // Blend original and blurred
        let r = srcData[idx] * (1 - blendFactor) + blurredData[idx] * blendFactor;
        let g = srcData[idx + 1] * (1 - blendFactor) + blurredData[idx + 1] * blendFactor;
        let b = srcData[idx + 2] * (1 - blendFactor) + blurredData[idx + 2] * blendFactor;

        // Apply saturation boost
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * satFactor;
        g = gray + (g - gray) * satFactor;
        b = gray + (b - gray) * satFactor;

        // Apply vignette
        if (this.settings.vignette) {
          const cx = x / width - 0.5;
          const cy = y / height - 0.5;
          const vignette = 1 - Math.sqrt(cx * cx + cy * cy) * 0.8;
          r *= vignette;
          g *= vignette;
          b *= vignette;
        }

        outputData.data[idx] = Math.max(0, Math.min(255, r));
        outputData.data[idx + 1] = Math.max(0, Math.min(255, g));
        outputData.data[idx + 2] = Math.max(0, Math.min(255, b));
        outputData.data[idx + 3] = srcData[idx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'tilt-shift.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.blurredData = null;
    this.settings = {
      orientation: 'horizontal',
      focus: 50,
      range: 20,
      blur: 15,
      saturation: 120,
      vignette: true
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.orientation-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.orientation-btn[data-orientation="horizontal"]').classList.add('active');
    document.getElementById('focus').value = 50;
    document.getElementById('focusValue').textContent = '50%';
    document.getElementById('range').value = 20;
    document.getElementById('rangeValue').textContent = '20%';
    document.getElementById('blur').value = 15;
    document.getElementById('blurValue').textContent = '15';
    document.getElementById('saturation').value = 120;
    document.getElementById('saturationValue').textContent = '120%';
    document.getElementById('vignetteCheck').checked = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TiltShiftTool();
});
