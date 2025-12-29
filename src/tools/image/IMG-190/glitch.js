/**
 * IMG-190 圖片故障藝術工具
 */
class GlitchTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { rgbShift: 10, scanlines: 30, noise: 20, slices: 5 };
    this.seed = Math.random();
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.getElementById('rgbShift').addEventListener('input', (e) => {
      this.settings.rgbShift = parseInt(e.target.value);
      document.getElementById('rgbShiftValue').textContent = this.settings.rgbShift + ' px';
      this.render();
    });

    document.getElementById('scanlines').addEventListener('input', (e) => {
      this.settings.scanlines = parseInt(e.target.value);
      document.getElementById('scanlinesValue').textContent = this.settings.scanlines + '%';
      this.render();
    });

    document.getElementById('noise').addEventListener('input', (e) => {
      this.settings.noise = parseInt(e.target.value);
      document.getElementById('noiseValue').textContent = this.settings.noise + '%';
      this.render();
    });

    document.getElementById('slices').addEventListener('input', (e) => {
      this.settings.slices = parseInt(e.target.value);
      document.getElementById('slicesValue').textContent = this.settings.slices;
      this.render();
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
      this.seed = Math.random();
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.settings = { rgbShift: 10, scanlines: 30, noise: 20, slices: 5 };
        this.seed = Math.random();
        document.getElementById('rgbShift').value = 10;
        document.getElementById('rgbShiftValue').textContent = '10 px';
        document.getElementById('scanlines').value = 30;
        document.getElementById('scanlinesValue').textContent = '30%';
        document.getElementById('noise').value = 20;
        document.getElementById('noiseValue').textContent = '20%';
        document.getElementById('slices').value = 5;
        document.getElementById('slicesValue').textContent = '5';
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  seededRandom() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  render() {
    if (!this.originalImage) return;
    const { rgbShift, scanlines, noise, slices } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Reset seed for consistent results
    const originalSeed = this.seed;

    // Draw base image
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Apply slices
    if (slices > 0) {
      const imageData = this.ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < slices; i++) {
        const y = Math.floor(this.seededRandom() * h);
        const sliceHeight = Math.floor(this.seededRandom() * 30) + 5;
        const offset = Math.floor((this.seededRandom() - 0.5) * 60);

        for (let sy = y; sy < Math.min(y + sliceHeight, h); sy++) {
          for (let x = 0; x < w; x++) {
            const srcX = (x - offset + w) % w;
            const srcI = (sy * w + srcX) * 4;
            const destI = (sy * w + x) * 4;
            imageData.data[destI] = imageData.data[srcI];
            imageData.data[destI + 1] = imageData.data[srcI + 1];
            imageData.data[destI + 2] = imageData.data[srcI + 2];
          }
        }
      }
      this.ctx.putImageData(imageData, 0, 0);
    }

    // RGB shift
    if (rgbShift > 0) {
      const imageData = this.ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const shifted = new Uint8ClampedArray(data);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const rX = Math.min(w - 1, x + rgbShift);
          const bX = Math.max(0, x - rgbShift);
          const rI = (y * w + rX) * 4;
          const bI = (y * w + bX) * 4;
          shifted[i] = data[rI];
          shifted[i + 2] = data[bI + 2];
        }
      }

      for (let i = 0; i < data.length; i++) {
        data[i] = shifted[i];
      }
      this.ctx.putImageData(imageData, 0, 0);
    }

    // Scanlines
    if (scanlines > 0) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${scanlines / 200})`;
      for (let y = 0; y < h; y += 2) {
        this.ctx.fillRect(0, y, w, 1);
      }
    }

    // Noise
    if (noise > 0) {
      const imageData = this.ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const noiseAmount = noise / 100 * 50;

      for (let i = 0; i < data.length; i += 4) {
        const n = (this.seededRandom() - 0.5) * noiseAmount;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
      this.ctx.putImageData(imageData, 0, 0);
    }

    this.seed = originalSeed;
  }

  reset() {
    this.originalImage = null;
    this.settings = { rgbShift: 10, scanlines: 30, noise: 20, slices: 5 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('rgbShift').value = 10;
    document.getElementById('rgbShiftValue').textContent = '10 px';
    document.getElementById('scanlines').value = 30;
    document.getElementById('scanlinesValue').textContent = '30%';
    document.getElementById('noise').value = 20;
    document.getElementById('noiseValue').textContent = '20%';
    document.getElementById('slices').value = 5;
    document.getElementById('slicesValue').textContent = '5';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `glitch_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new GlitchTool());
