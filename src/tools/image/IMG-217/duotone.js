/**
 * IMG-217 圖片雙色調工具
 */
class DuotoneTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      darkColor: '#1a1a2e',
      lightColor: '#a855f7',
      intensity: 100,
      contrast: 0
    };
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

    document.querySelectorAll('.duotone-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        document.querySelectorAll('.duotone-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        this.settings.darkColor = preset.dataset.dark;
        this.settings.lightColor = preset.dataset.light;
        document.getElementById('darkColor').value = this.settings.darkColor;
        document.getElementById('lightColor').value = this.settings.lightColor;
        this.render();
      });
    });

    document.getElementById('darkColor').addEventListener('input', (e) => {
      this.settings.darkColor = e.target.value;
      this.render();
    });

    document.getElementById('lightColor').addEventListener('input', (e) => {
      this.settings.lightColor = e.target.value;
      this.render();
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.settings.contrast;
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  render() {
    if (!this.originalImage) return;
    const { darkColor, lightColor, intensity, contrast } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;

    const dark = this.hexToRgb(darkColor);
    const light = this.hexToRgb(lightColor);

    // Build lookup table
    const lut = [];
    for (let i = 0; i < 256; i++) {
      // Apply contrast
      let adjusted = i;
      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        adjusted = Math.max(0, Math.min(255, factor * (i - 128) + 128));
      }

      const t = adjusted / 255;
      lut[i] = {
        r: dark.r + (light.r - dark.r) * t,
        g: dark.g + (light.g - dark.g) * t,
        b: dark.b + (light.b - dark.b) * t
      };
    }

    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const mapped = lut[lum];

      data[i] = data[i] * (1 - factor) + mapped.r * factor;
      data[i + 1] = data[i + 1] * (1 - factor) + mapped.g * factor;
      data[i + 2] = data[i + 2] * (1 - factor) + mapped.b * factor;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { darkColor: '#1a1a2e', lightColor: '#a855f7', intensity: 100, contrast: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('darkColor').value = '#1a1a2e';
    document.getElementById('lightColor').value = '#a855f7';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.getElementById('contrast').value = 0;
    document.getElementById('contrastValue').textContent = '0';
    document.querySelectorAll('.duotone-preset').forEach(p => p.classList.remove('active'));
    document.querySelector('.duotone-preset').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `duotone_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DuotoneTool());
