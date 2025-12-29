/**
 * IMG-209 圖片色階自動調整工具
 */
class AutoLevelsTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { intensity: 100, blackClip: 0.1, whiteClip: 0.1 };
    this.stats = { min: 0, max: 255 };
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

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
      this.render();
    });

    document.getElementById('blackClip').addEventListener('input', (e) => {
      this.settings.blackClip = parseFloat(e.target.value);
      document.getElementById('blackClipValue').textContent = this.settings.blackClip + '%';
      this.analyzeImage();
      this.render();
    });

    document.getElementById('whiteClip').addEventListener('input', (e) => {
      this.settings.whiteClip = parseFloat(e.target.value);
      document.getElementById('whiteClipValue').textContent = this.settings.whiteClip + '%';
      this.analyzeImage();
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
        this.analyzeImage();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  analyzeImage() {
    if (!this.originalImage) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Build histogram
    const histogram = new Array(256).fill(0);
    const totalPixels = w * h;

    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[luminance]++;
    }

    // Find clipped min/max
    const blackThreshold = (this.settings.blackClip / 100) * totalPixels;
    const whiteThreshold = (this.settings.whiteClip / 100) * totalPixels;

    let sum = 0;
    let minLevel = 0;
    for (let i = 0; i < 256; i++) {
      sum += histogram[i];
      if (sum > blackThreshold) {
        minLevel = i;
        break;
      }
    }

    sum = 0;
    let maxLevel = 255;
    for (let i = 255; i >= 0; i--) {
      sum += histogram[i];
      if (sum > whiteThreshold) {
        maxLevel = i;
        break;
      }
    }

    this.stats = { min: minLevel, max: maxLevel };
    document.getElementById('minValue').textContent = minLevel;
    document.getElementById('maxValue').textContent = maxLevel;
    document.getElementById('rangeValue').textContent = (maxLevel - minLevel);
  }

  render() {
    if (!this.originalImage) return;
    const { intensity } = this.settings;
    const { min, max } = this.stats;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0 || (min === 0 && max === 255)) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;
    const range = max - min || 1;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c];
        const stretched = ((original - min) / range) * 255;
        const clamped = Math.max(0, Math.min(255, stretched));
        data[i + c] = original * (1 - factor) + clamped * factor;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { intensity: 100, blackClip: 0.1, whiteClip: 0.1 };
    this.stats = { min: 0, max: 255 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.getElementById('blackClip').value = 0.1;
    document.getElementById('blackClipValue').textContent = '0.1%';
    document.getElementById('whiteClip').value = 0.1;
    document.getElementById('whiteClipValue').textContent = '0.1%';
    document.getElementById('minValue').textContent = '-';
    document.getElementById('maxValue').textContent = '-';
    document.getElementById('rangeValue').textContent = '-';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `autolevels_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new AutoLevelsTool());
