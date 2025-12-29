/**
 * IMG-216 圖片漸變映射工具
 */
class GradientMapTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.presets = {
      sunset: ['#000000', '#ff6b35', '#f7c59f'],
      ocean: ['#0d1b2a', '#1b4965', '#5fa8d3'],
      forest: ['#1a1a0a', '#4a5a2a', '#8db580'],
      fire: ['#1a0000', '#ff4500', '#ffd700'],
      purple: ['#0d001a', '#9b59b6', '#e8b4f8'],
      bw: ['#000000', '#888888', '#ffffff']
    };
    this.colors = ['#000000', '#ff6b35', '#f7c59f'];
    this.intensity = 100;
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

    document.querySelectorAll('.gradient-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        document.querySelectorAll('.gradient-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        this.colors = [...this.presets[preset.dataset.preset]];
        document.getElementById('color1').value = this.colors[0];
        document.getElementById('color2').value = this.colors[1];
        document.getElementById('color3').value = this.colors[2];
        this.render();
      });
    });

    document.getElementById('color1').addEventListener('input', (e) => {
      this.colors[0] = e.target.value;
      this.render();
    });

    document.getElementById('color2').addEventListener('input', (e) => {
      this.colors[1] = e.target.value;
      this.render();
    });

    document.getElementById('color3').addEventListener('input', (e) => {
      this.colors[2] = e.target.value;
      this.render();
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.intensity + '%';
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

  interpolateColor(t) {
    const colors = this.colors.map(c => this.hexToRgb(c));

    if (t <= 0.5) {
      const localT = t * 2;
      return {
        r: colors[0].r + (colors[1].r - colors[0].r) * localT,
        g: colors[0].g + (colors[1].g - colors[0].g) * localT,
        b: colors[0].b + (colors[1].b - colors[0].b) * localT
      };
    } else {
      const localT = (t - 0.5) * 2;
      return {
        r: colors[1].r + (colors[2].r - colors[1].r) * localT,
        g: colors[1].g + (colors[2].g - colors[1].g) * localT,
        b: colors[1].b + (colors[2].b - colors[1].b) * localT
      };
    }
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (this.intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = this.intensity / 100;

    // Build lookup table for performance
    const lut = [];
    for (let i = 0; i < 256; i++) {
      lut[i] = this.interpolateColor(i / 255);
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
    this.colors = ['#000000', '#ff6b35', '#f7c59f'];
    this.intensity = 100;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('color1').value = '#000000';
    document.getElementById('color2').value = '#ff6b35';
    document.getElementById('color3').value = '#f7c59f';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.querySelectorAll('.gradient-preset').forEach(p => p.classList.remove('active'));
    document.querySelector('.gradient-preset[data-preset="sunset"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `gradient_map_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new GradientMapTool());
