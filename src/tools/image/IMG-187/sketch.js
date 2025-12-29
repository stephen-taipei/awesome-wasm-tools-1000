/**
 * IMG-187 圖片素描效果工具
 */
class SketchTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { style: 'pencil', intensity: 50, contrast: 50 };
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

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.style = btn.dataset.style;
        this.render();
      });
    });

    ['intensity', 'contrast'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
        this.render();
      });
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
        this.settings = { style: 'pencil', intensity: 50, contrast: 50 };
        document.getElementById('intensity').value = 50;
        document.getElementById('intensityValue').textContent = '50%';
        document.getElementById('contrast').value = 50;
        document.getElementById('contrastValue').textContent = '50%';
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
    const { style, intensity, contrast } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw original
    this.ctx.drawImage(this.originalImage, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Convert to grayscale first
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Invert
    const inverted = gray.map(v => 255 - v);

    // Apply Gaussian blur to inverted
    const blurred = this.blur(inverted, w, h, 3 + intensity / 20);

    // Color dodge blend
    const result = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) {
      const base = gray[i];
      const blend = blurred[i];
      if (blend >= 255) {
        result[i] = 255;
      } else {
        result[i] = Math.min(255, (base * 256) / (256 - blend));
      }
    }

    // Apply contrast
    const contrastFactor = (contrast - 50) / 50;
    for (let i = 0; i < result.length; i++) {
      let v = result[i];
      v = ((v / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      result[i] = Math.max(0, Math.min(255, v));
    }

    // Apply to canvas
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      if (style === 'color') {
        const factor = result[idx] / 255;
        data[i] = data[i] * factor + (1 - factor) * 255;
        data[i + 1] = data[i + 1] * factor + (1 - factor) * 255;
        data[i + 2] = data[i + 2] * factor + (1 - factor) * 255;
      } else if (style === 'charcoal') {
        const v = result[idx] < 128 ? result[idx] * 0.8 : result[idx];
        data[i] = data[i + 1] = data[i + 2] = v;
      } else {
        data[i] = data[i + 1] = data[i + 2] = result[idx];
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  blur(data, w, h, radius) {
    const result = new Float32Array(data.length);
    const r = Math.ceil(radius);
    const weights = [];
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const weight = Math.exp(-(i * i) / (2 * radius * radius));
      weights.push(weight);
      sum += weight;
    }
    weights.forEach((w, i) => weights[i] = w / sum);

    // Horizontal pass
    const temp = new Float32Array(data.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        for (let i = -r; i <= r; i++) {
          const sx = Math.min(w - 1, Math.max(0, x + i));
          val += data[y * w + sx] * weights[i + r];
        }
        temp[y * w + x] = val;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = 0;
        for (let i = -r; i <= r; i++) {
          const sy = Math.min(h - 1, Math.max(0, y + i));
          val += temp[sy * w + x] * weights[i + r];
        }
        result[y * w + x] = val;
      }
    }

    return result;
  }

  reset() {
    this.originalImage = null;
    this.settings = { style: 'pencil', intensity: 50, contrast: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 50;
    document.getElementById('intensityValue').textContent = '50%';
    document.getElementById('contrast').value = 50;
    document.getElementById('contrastValue').textContent = '50%';
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.style-btn[data-style="pencil"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `sketch_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SketchTool());
