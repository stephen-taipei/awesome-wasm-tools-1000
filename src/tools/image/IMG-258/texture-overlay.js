/**
 * IMG-258 圖片紋理疊加工具
 */
class TextureOverlayTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      intensity: 50,
      scale: 1,
      blendMode: 'overlay'
    };
    this.texture = 'paper';
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

    document.querySelectorAll('.texture-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.texture = btn.dataset.texture;
        this.render();
      });
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
      this.render();
    });

    document.getElementById('scale').addEventListener('input', (e) => {
      this.settings.scale = parseFloat(e.target.value);
      document.getElementById('scaleValue').textContent = this.settings.scale + 'x';
      this.render();
    });

    document.getElementById('blendMode').addEventListener('change', (e) => {
      this.settings.blendMode = e.target.value;
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

  generateTexture(w, h, type) {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = w;
    textureCanvas.height = h;
    const tCtx = textureCanvas.getContext('2d');
    const imageData = tCtx.createImageData(w, h);
    const data = imageData.data;

    const scale = this.settings.scale;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let value = 128;

        const sx = x / scale;
        const sy = y / scale;

        switch (type) {
          case 'paper':
            // Fine grain paper texture
            value = 128 + (Math.random() - 0.5) * 40;
            value += Math.sin(sx * 0.1) * 5 + Math.sin(sy * 0.1) * 5;
            break;

          case 'canvas':
            // Canvas weave pattern
            const waveX = Math.sin(sx * 0.5) * 10;
            const waveY = Math.sin(sy * 0.5) * 10;
            value = 128 + waveX + waveY + (Math.random() - 0.5) * 20;
            break;

          case 'leather':
            // Leather texture with pores
            const pore = Math.random() < 0.02 ? -40 : 0;
            value = 128 + (Math.random() - 0.5) * 30 + pore;
            value += Math.sin(sx * 0.05 + sy * 0.05) * 10;
            break;

          case 'wood':
            // Wood grain
            const grain = Math.sin(sy * 0.2 + Math.sin(sx * 0.02) * 10) * 30;
            value = 128 + grain + (Math.random() - 0.5) * 15;
            break;

          case 'concrete':
            // Concrete/stone texture
            const rough = (Math.random() - 0.5) * 60;
            const bump = Math.sin(sx * 0.3) * Math.sin(sy * 0.3) * 20;
            value = 128 + rough + bump;
            break;

          case 'fabric':
            // Fabric weave
            const threadX = Math.floor(sx) % 2 === 0 ? 10 : -10;
            const threadY = Math.floor(sy) % 2 === 0 ? 10 : -10;
            value = 128 + threadX + threadY + (Math.random() - 0.5) * 15;
            break;
        }

        value = Math.max(0, Math.min(255, value));
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    }

    tCtx.putImageData(imageData, 0, 0);
    return textureCanvas;
  }

  blendPixel(base, blend, mode) {
    const b = base / 255;
    const l = blend / 255;
    let result;

    switch (mode) {
      case 'multiply':
        result = b * l;
        break;
      case 'screen':
        result = 1 - (1 - b) * (1 - l);
        break;
      case 'overlay':
        result = b < 0.5 ? 2 * b * l : 1 - 2 * (1 - b) * (1 - l);
        break;
      case 'soft-light':
        result = l < 0.5 ? b - (1 - 2 * l) * b * (1 - b) : b + (2 * l - 1) * (this.softLightD(b) - b);
        break;
      case 'hard-light':
        result = l < 0.5 ? 2 * b * l : 1 - 2 * (1 - b) * (1 - l);
        break;
      default:
        result = b;
    }

    return Math.max(0, Math.min(255, result * 255));
  }

  softLightD(x) {
    return x <= 0.25 ? ((16 * x - 12) * x + 4) * x : Math.sqrt(x);
  }

  render() {
    if (!this.originalImage) return;
    const { intensity, blendMode } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const textureCanvas = this.generateTexture(w, h, this.texture);
    const textureCtx = textureCanvas.getContext('2d');
    const textureData = textureCtx.getImageData(0, 0, w, h).data;

    const intensityFactor = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      const blendedR = this.blendPixel(data[i], textureData[i], blendMode);
      const blendedG = this.blendPixel(data[i + 1], textureData[i + 1], blendMode);
      const blendedB = this.blendPixel(data[i + 2], textureData[i + 2], blendMode);

      data[i] = data[i] * (1 - intensityFactor) + blendedR * intensityFactor;
      data[i + 1] = data[i + 1] * (1 - intensityFactor) + blendedG * intensityFactor;
      data[i + 2] = data[i + 2] * (1 - intensityFactor) + blendedB * intensityFactor;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { intensity: 50, scale: 1, blendMode: 'overlay' };
    this.texture = 'paper';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 50;
    document.getElementById('intensityValue').textContent = '50%';
    document.getElementById('scale').value = 1;
    document.getElementById('scaleValue').textContent = '1x';
    document.getElementById('blendMode').value = 'overlay';
    document.querySelectorAll('.texture-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `textured_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new TextureOverlayTool());
