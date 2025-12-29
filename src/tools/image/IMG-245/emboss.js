/**
 * IMG-245 圖片浮雕效果工具
 */
class EmbossTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { strength: 100, angle: 135, depth: 1, grayscale: true, blendOriginal: false };
    this.presets = {
      subtle: { strength: 80, angle: 135, depth: 1, grayscale: true, blendOriginal: false },
      strong: { strength: 150, angle: 135, depth: 2, grayscale: true, blendOriginal: false },
      metal: { strength: 120, angle: 45, depth: 1, grayscale: true, blendOriginal: true },
      stone: { strength: 180, angle: 225, depth: 3, grayscale: true, blendOriginal: false }
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

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = this.settings.angle + '°';
      this.render();
    });

    document.getElementById('depth').addEventListener('input', (e) => {
      this.settings.depth = parseInt(e.target.value);
      document.getElementById('depthValue').textContent = this.settings.depth;
      this.render();
    });

    document.getElementById('grayscale').addEventListener('change', (e) => {
      this.settings.grayscale = e.target.checked;
      this.render();
    });

    document.getElementById('blendOriginal').addEventListener('change', (e) => {
      this.settings.blendOriginal = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('strength').value = this.settings.strength;
    document.getElementById('strengthValue').textContent = this.settings.strength + '%';
    document.getElementById('angle').value = this.settings.angle;
    document.getElementById('angleValue').textContent = this.settings.angle + '°';
    document.getElementById('depth').value = this.settings.depth;
    document.getElementById('depthValue').textContent = this.settings.depth;
    document.getElementById('grayscale').checked = this.settings.grayscale;
    document.getElementById('blendOriginal').checked = this.settings.blendOriginal;
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
    const { strength, angle, depth, grayscale, blendOriginal } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const srcData = this.ctx.getImageData(0, 0, w, h);
    const dstData = this.ctx.createImageData(w, h);

    // Calculate emboss direction from angle
    const rad = angle * Math.PI / 180;
    const dx = Math.round(Math.cos(rad) * depth);
    const dy = Math.round(Math.sin(rad) * depth);

    const strengthFactor = strength / 100;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        // Get pixel and offset pixel
        const x1 = Math.min(w - 1, Math.max(0, x - dx));
        const y1 = Math.min(h - 1, Math.max(0, y - dy));
        const x2 = Math.min(w - 1, Math.max(0, x + dx));
        const y2 = Math.min(h - 1, Math.max(0, y + dy));

        const idx1 = (y1 * w + x1) * 4;
        const idx2 = (y2 * w + x2) * 4;

        // Calculate emboss for each channel
        let r = 128 + (srcData.data[idx1] - srcData.data[idx2]) * strengthFactor;
        let g = 128 + (srcData.data[idx1 + 1] - srcData.data[idx2 + 1]) * strengthFactor;
        let b = 128 + (srcData.data[idx1 + 2] - srcData.data[idx2 + 2]) * strengthFactor;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        if (grayscale) {
          const gray = (r + g + b) / 3;
          r = g = b = gray;
        }

        if (blendOriginal) {
          // Overlay blend
          const or = srcData.data[idx];
          const og = srcData.data[idx + 1];
          const ob = srcData.data[idx + 2];
          r = (r / 255) * (r + 2 * or * (255 - r) / 255);
          g = (g / 255) * (g + 2 * og * (255 - g) / 255);
          b = (b / 255) * (b + 2 * ob * (255 - b) / 255);
        }

        dstData.data[idx] = r;
        dstData.data[idx + 1] = g;
        dstData.data[idx + 2] = b;
        dstData.data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { strength: 100, angle: 135, depth: 1, grayscale: true, blendOriginal: false };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `emboss_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new EmbossTool());
