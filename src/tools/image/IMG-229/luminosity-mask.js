/**
 * IMG-229 圖片亮度遮罩工具
 */
class LuminosityMaskTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { minLum: 0, maxLum: 255, feather: 20, invert: false };
    this.mode = 'mask';
    this.presets = {
      highlights: { minLum: 170, maxLum: 255 },
      midtones: { minLum: 85, maxLum: 170 },
      shadows: { minLum: 0, maxLum: 85 },
      all: { minLum: 0, maxLum: 255 }
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = this.presets[btn.dataset.preset];
        this.settings.minLum = preset.minLum;
        this.settings.maxLum = preset.maxLum;
        this.updateSliders();
        this.render();
      });
    });

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('minLum').addEventListener('input', (e) => {
      this.settings.minLum = parseInt(e.target.value);
      document.getElementById('minLumValue').textContent = this.settings.minLum;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('maxLum').addEventListener('input', (e) => {
      this.settings.maxLum = parseInt(e.target.value);
      document.getElementById('maxLumValue').textContent = this.settings.maxLum;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather;
      this.render();
    });

    document.getElementById('invertMask').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('minLum').value = this.settings.minLum;
    document.getElementById('minLumValue').textContent = this.settings.minLum;
    document.getElementById('maxLum').value = this.settings.maxLum;
    document.getElementById('maxLumValue').textContent = this.settings.maxLum;
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

  calculateMaskValue(luminosity) {
    const { minLum, maxLum, feather, invert } = this.settings;
    let value = 0;

    if (luminosity >= minLum && luminosity <= maxLum) {
      value = 1;

      // Feather at edges
      if (feather > 0) {
        if (luminosity < minLum + feather) {
          value = (luminosity - minLum) / feather;
        } else if (luminosity > maxLum - feather) {
          value = (maxLum - luminosity) / feather;
        }
      }
    } else if (feather > 0) {
      if (luminosity < minLum && luminosity >= minLum - feather) {
        value = (luminosity - (minLum - feather)) / feather;
      } else if (luminosity > maxLum && luminosity <= maxLum + feather) {
        value = ((maxLum + feather) - luminosity) / feather;
      }
    }

    value = Math.max(0, Math.min(1, value));
    return invert ? 1 - value : value;
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminosity
      const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
      const maskValue = this.calculateMaskValue(luminosity);

      if (this.mode === 'mask') {
        // Show mask as grayscale
        const gray = Math.round(maskValue * 255);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else {
        // Overlay mode - show selected areas in color, others in red tint
        if (maskValue < 0.5) {
          const blend = maskValue * 2;
          data[i] = r * blend + 255 * (1 - blend) * 0.3 + r * (1 - blend) * 0.7;
          data[i + 1] = g * blend + g * (1 - blend) * 0.5;
          data[i + 2] = b * blend + b * (1 - blend) * 0.5;
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { minLum: 0, maxLum: 255, feather: 20, invert: false };
    this.mode = 'mask';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('minLum').value = 0;
    document.getElementById('minLumValue').textContent = '0';
    document.getElementById('maxLum').value = 255;
    document.getElementById('maxLumValue').textContent = '255';
    document.getElementById('feather').value = 20;
    document.getElementById('featherValue').textContent = '20';
    document.getElementById('invertMask').checked = false;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `luminosity_mask_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new LuminosityMaskTool());
