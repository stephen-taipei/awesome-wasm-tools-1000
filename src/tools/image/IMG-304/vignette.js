class VignetteTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      amount: 50,
      size: 50,
      roundness: 0,
      feather: 50,
      color: '#000000'
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = `${this.settings.amount}%`;
      this.render();
    });

    document.getElementById('size').addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value);
      document.getElementById('sizeValue').textContent = `${this.settings.size}%`;
      this.render();
    });

    document.getElementById('roundness').addEventListener('input', (e) => {
      this.settings.roundness = parseInt(e.target.value);
      document.getElementById('roundnessValue').textContent = this.settings.roundness;
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = `${this.settings.feather}%`;
      this.render();
    });

    document.getElementById('vignetteColor').addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    const presets = {
      subtle: { amount: 30, size: 70, roundness: 0, feather: 60 },
      normal: { amount: 50, size: 50, roundness: 0, feather: 50 },
      strong: { amount: 80, size: 30, roundness: 0, feather: 40 }
    };

    const p = presets[preset];
    this.settings.amount = p.amount;
    this.settings.size = p.size;
    this.settings.roundness = p.roundness;
    this.settings.feather = p.feather;

    document.getElementById('amount').value = p.amount;
    document.getElementById('amountValue').textContent = `${p.amount}%`;
    document.getElementById('size').value = p.size;
    document.getElementById('sizeValue').textContent = `${p.size}%`;
    document.getElementById('roundness').value = p.roundness;
    document.getElementById('roundnessValue').textContent = p.roundness;
    document.getElementById('feather').value = p.feather;
    document.getElementById('featherValue').textContent = `${p.feather}%`;

    this.render();
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
    } : { r: 0, g: 0, b: 0 };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const amount = this.settings.amount / 100;
    const size = this.settings.size / 100;
    const roundness = this.settings.roundness / 100;
    const feather = this.settings.feather / 100;

    const vignetteColor = this.hexToRgb(this.settings.color);

    // Calculate ellipse dimensions
    const aspectRatio = width / height;
    let radiusX, radiusY;

    if (roundness >= 0) {
      // More circular
      const avg = (width + height) / 2;
      radiusX = (width * (1 - roundness) + avg * roundness) / 2 * size;
      radiusY = (height * (1 - roundness) + avg * roundness) / 2 * size;
    } else {
      // More elliptical
      const r = Math.abs(roundness);
      radiusX = width / 2 * size * (1 + r);
      radiusY = height / 2 * size * (1 - r * 0.5);
    }

    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Calculate normalized distance from center (ellipse)
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate vignette factor with feathering
        let vignette = 0;
        if (dist > 1) {
          const fadeStart = 1;
          const fadeEnd = 1 + feather;
          vignette = Math.min(1, (dist - fadeStart) / (fadeEnd - fadeStart));
        }

        vignette *= amount;

        // Apply vignette
        outputData.data[idx] = srcData[idx] * (1 - vignette) + vignetteColor.r * vignette;
        outputData.data[idx + 1] = srcData[idx + 1] * (1 - vignette) + vignetteColor.g * vignette;
        outputData.data[idx + 2] = srcData[idx + 2] * (1 - vignette) + vignetteColor.b * vignette;
        outputData.data[idx + 3] = srcData[idx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'vignette-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { amount: 50, size: 50, roundness: 0, feather: 50, color: '#000000' };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="normal"]').classList.add('active');
    document.getElementById('amount').value = 50;
    document.getElementById('amountValue').textContent = '50%';
    document.getElementById('size').value = 50;
    document.getElementById('sizeValue').textContent = '50%';
    document.getElementById('roundness').value = 0;
    document.getElementById('roundnessValue').textContent = '0';
    document.getElementById('feather').value = 50;
    document.getElementById('featherValue').textContent = '50%';
    document.getElementById('vignetteColor').value = '#000000';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VignetteTool();
});
