/**
 * IMG-210 圖片自動對比工具
 */
class AutoContrastTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { algorithm: 'stretch', intensity: 100 };
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

    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.algorithm = btn.dataset.algo;
        this.render();
      });
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
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
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const { algorithm, intensity } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const original = new Uint8ClampedArray(data);

    switch (algorithm) {
      case 'stretch':
        this.applyStretch(data, original, intensity);
        break;
      case 'equalize':
        this.applyEqualize(data, original, intensity);
        break;
      case 'clahe':
        this.applyCLAHE(data, original, w, h, intensity);
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  applyStretch(data, original, intensity) {
    let min = 255, max = 0;
    for (let i = 0; i < original.length; i += 4) {
      const lum = 0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2];
      if (lum < min) min = lum;
      if (lum > max) max = lum;
    }

    const range = max - min || 1;
    const factor = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const stretched = ((original[i + c] - min) / range) * 255;
        data[i + c] = original[i + c] * (1 - factor) + stretched * factor;
      }
    }
  }

  applyEqualize(data, original, intensity) {
    // Build histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < original.length; i += 4) {
      const lum = Math.round(0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2]);
      histogram[lum]++;
    }

    // Build CDF
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }

    // Find minimum non-zero CDF
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    const totalPixels = original.length / 4;
    const factor = intensity / 100;

    // Build lookup table
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2]);
      const ratio = lut[lum] / (lum || 1);

      for (let c = 0; c < 3; c++) {
        const equalized = Math.min(255, original[i + c] * ratio);
        data[i + c] = original[i + c] * (1 - factor) + equalized * factor;
      }
    }
  }

  applyCLAHE(data, original, w, h, intensity) {
    // Simplified CLAHE implementation
    const tileSize = 64;
    const factor = intensity / 100;

    for (let ty = 0; ty < h; ty += tileSize) {
      for (let tx = 0; tx < w; tx += tileSize) {
        const tw = Math.min(tileSize, w - tx);
        const th = Math.min(tileSize, h - ty);

        // Build local histogram
        const histogram = new Array(256).fill(0);
        for (let y = ty; y < ty + th; y++) {
          for (let x = tx; x < tx + tw; x++) {
            const i = (y * w + x) * 4;
            const lum = Math.round(0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2]);
            histogram[lum]++;
          }
        }

        // Clip histogram (limit contrast)
        const clipLimit = (tw * th) / 256 * 2;
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (histogram[i] > clipLimit) {
            excess += histogram[i] - clipLimit;
            histogram[i] = clipLimit;
          }
        }
        const increment = excess / 256;
        for (let i = 0; i < 256; i++) {
          histogram[i] += increment;
        }

        // Build CDF
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i];
        }

        const cdfMin = cdf.find(v => v > 0) || 0;
        const totalPixels = tw * th;

        // Apply to tile
        for (let y = ty; y < ty + th; y++) {
          for (let x = tx; x < tx + tw; x++) {
            const i = (y * w + x) * 4;
            const lum = Math.round(0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2]);
            const newLum = Math.round(((cdf[lum] - cdfMin) / (totalPixels - cdfMin)) * 255);
            const ratio = newLum / (lum || 1);

            for (let c = 0; c < 3; c++) {
              const enhanced = Math.min(255, original[i + c] * ratio);
              data[i + c] = original[i + c] * (1 - factor) + enhanced * factor;
            }
          }
        }
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { algorithm: 'stretch', intensity: 100 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.algo-btn[data-algo="stretch"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `autocontrast_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new AutoContrastTool());
