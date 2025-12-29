class GlitchTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      shiftX: 20,
      slices: 10,
      rgbShift: 5,
      scanlines: false,
      noise: false,
      seed: Math.random()
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('shiftX').addEventListener('input', (e) => {
      this.settings.shiftX = parseInt(e.target.value);
      document.getElementById('shiftXValue').textContent = this.settings.shiftX;
      this.render();
    });

    document.getElementById('slices').addEventListener('input', (e) => {
      this.settings.slices = parseInt(e.target.value);
      document.getElementById('slicesValue').textContent = this.settings.slices;
      this.render();
    });

    document.getElementById('rgbShift').addEventListener('input', (e) => {
      this.settings.rgbShift = parseInt(e.target.value);
      document.getElementById('rgbShiftValue').textContent = this.settings.rgbShift;
      this.render();
    });

    // Checkboxes
    document.getElementById('scanlines').addEventListener('change', (e) => {
      this.settings.scanlines = e.target.checked;
      this.render();
    });

    document.getElementById('noise').addEventListener('change', (e) => {
      this.settings.noise = e.target.checked;
      this.render();
    });

    // Random button
    document.getElementById('randomBtn').addEventListener('click', () => {
      this.settings.seed = Math.random();
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'subtle':
        this.settings.shiftX = 10;
        this.settings.slices = 5;
        this.settings.rgbShift = 2;
        break;
      case 'medium':
        this.settings.shiftX = 20;
        this.settings.slices = 10;
        this.settings.rgbShift = 5;
        break;
      case 'heavy':
        this.settings.shiftX = 50;
        this.settings.slices = 20;
        this.settings.rgbShift = 10;
        break;
      case 'vhs':
        this.settings.shiftX = 15;
        this.settings.slices = 30;
        this.settings.rgbShift = 8;
        this.settings.scanlines = true;
        document.getElementById('scanlines').checked = true;
        break;
      case 'digital':
        this.settings.shiftX = 30;
        this.settings.slices = 15;
        this.settings.rgbShift = 12;
        this.settings.noise = true;
        document.getElementById('noise').checked = true;
        break;
      case 'chaos':
        this.settings.shiftX = 80;
        this.settings.slices = 40;
        this.settings.rgbShift = 20;
        break;
    }

    document.getElementById('shiftX').value = this.settings.shiftX;
    document.getElementById('shiftXValue').textContent = this.settings.shiftX;
    document.getElementById('slices').value = this.settings.slices;
    document.getElementById('slicesValue').textContent = this.settings.slices;
    document.getElementById('rgbShift').value = this.settings.rgbShift;
    document.getElementById('rgbShiftValue').textContent = this.settings.rgbShift;

    this.settings.seed = Math.random();
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

  seededRandom() {
    const x = Math.sin(this.settings.seed++) * 10000;
    return x - Math.floor(x);
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;

    // Create output with RGB shift
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    // Copy with RGB channel shifts
    const rgbShift = this.settings.rgbShift;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;

        // Red channel shifted left
        const rX = Math.max(0, Math.min(width - 1, x - rgbShift));
        const rIdx = (y * width + rX) * 4;
        dstData[dstIdx] = srcData[rIdx];

        // Green channel normal
        const gIdx = (y * width + x) * 4;
        dstData[dstIdx + 1] = srcData[gIdx + 1];

        // Blue channel shifted right
        const bX = Math.max(0, Math.min(width - 1, x + rgbShift));
        const bIdx = (y * width + bX) * 4;
        dstData[dstIdx + 2] = srcData[bIdx + 2];

        dstData[dstIdx + 3] = srcData[gIdx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);

    // Apply slice glitches
    this.applySlices();

    // Apply scanlines
    if (this.settings.scanlines) {
      this.applyScanlines();
    }

    // Apply noise
    if (this.settings.noise) {
      this.applyNoise();
    }
  }

  applySlices() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const sliceCount = this.settings.slices;
    const maxShift = this.settings.shiftX;

    // Reset seed for consistent results
    let seed = this.settings.seed * 1000;

    for (let i = 0; i < sliceCount; i++) {
      seed++;
      const random1 = Math.sin(seed) * 10000;
      const r1 = random1 - Math.floor(random1);

      seed++;
      const random2 = Math.sin(seed) * 10000;
      const r2 = random2 - Math.floor(random2);

      seed++;
      const random3 = Math.sin(seed) * 10000;
      const r3 = random3 - Math.floor(random3);

      const y = Math.floor(r1 * height);
      const sliceHeight = Math.floor(r2 * 30) + 5;
      const shift = Math.floor((r3 - 0.5) * maxShift * 2);

      if (shift !== 0) {
        const imageData = this.ctx.getImageData(0, y, width, sliceHeight);
        this.ctx.clearRect(0, y, width, sliceHeight);
        this.ctx.putImageData(imageData, shift, y);
      }
    }
  }

  applyScanlines() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let y = 0; y < height; y += 4) {
      this.ctx.fillRect(0, y, width, 2);
    }
  }

  applyNoise() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.05) {
        const noise = (Math.random() - 0.5) * 100;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'glitch-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      shiftX: 20,
      slices: 10,
      rgbShift: 5,
      scanlines: false,
      noise: false,
      seed: Math.random()
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('shiftX').value = 20;
    document.getElementById('shiftXValue').textContent = '20';
    document.getElementById('slices').value = 10;
    document.getElementById('slicesValue').textContent = '10';
    document.getElementById('rgbShift').value = 5;
    document.getElementById('rgbShiftValue').textContent = '5';
    document.getElementById('scanlines').checked = false;
    document.getElementById('noise').checked = false;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="medium"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GlitchTool();
});
