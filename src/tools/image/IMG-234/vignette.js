/**
 * IMG-234 圖片暈影效果工具
 */
class VignetteTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { intensity: 50, size: 70, feather: 50, roundness: 100, color: '#000000' };
    this.presets = {
      subtle: { intensity: 30, size: 80, feather: 60, roundness: 100, color: '#000000' },
      medium: { intensity: 50, size: 70, feather: 50, roundness: 100, color: '#000000' },
      strong: { intensity: 80, size: 50, feather: 40, roundness: 100, color: '#000000' },
      vintage: { intensity: 60, size: 60, feather: 70, roundness: 80, color: '#1a1a00' }
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
        this.settings = { ...preset };
        this.updateSliders();
        this.render();
      });
    });

    ['intensity', 'size', 'feather', 'roundness'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.render();
      });
    });

    document.getElementById('vignetteColor').addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    ['intensity', 'size', 'feather', 'roundness'].forEach(id => {
      document.getElementById(id).value = this.settings[id];
      document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
    });
    document.getElementById('vignetteColor').value = this.settings.color;
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
    const { intensity, size, feather, roundness, color } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const vignetteColor = this.hexToRgb(color);

    const centerX = w / 2;
    const centerY = h / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const sizeRatio = size / 100;
    const featherRatio = feather / 100;
    const intensityRatio = intensity / 100;
    const roundnessRatio = roundness / 100;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Calculate distance from center
        let dx = (x - centerX) / centerX;
        let dy = (y - centerY) / centerY;

        // Adjust for roundness (ellipse vs rectangle)
        if (roundnessRatio < 1) {
          const ellipseDist = Math.sqrt(dx * dx + dy * dy);
          const rectDist = Math.max(Math.abs(dx), Math.abs(dy));
          const dist = ellipseDist * roundnessRatio + rectDist * (1 - roundnessRatio);
          dx = dx !== 0 ? dx * dist / ellipseDist : 0;
          dy = dy !== 0 ? dy * dist / ellipseDist : 0;
        }

        const dist = Math.sqrt(dx * dx + dy * dy);

        // Calculate vignette factor
        let factor = 0;
        const innerRadius = sizeRatio;
        const outerRadius = innerRadius + (1 - innerRadius) * featherRatio;

        if (dist > innerRadius) {
          if (dist >= outerRadius) {
            factor = 1;
          } else {
            factor = (dist - innerRadius) / (outerRadius - innerRadius);
          }
        }

        factor *= intensityRatio;

        if (factor > 0) {
          const i = (y * w + x) * 4;
          data[i] = data[i] * (1 - factor) + vignetteColor.r * factor;
          data[i + 1] = data[i + 1] * (1 - factor) + vignetteColor.g * factor;
          data[i + 2] = data[i + 2] * (1 - factor) + vignetteColor.b * factor;
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { intensity: 50, size: 70, feather: 50, roundness: 100, color: '#000000' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `vignette_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new VignetteTool());
