/**
 * IMG-253 圖片色調分離工具
 */
class PosterizeTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      levels: 8,
      smooth: 0,
      contrast: 100,
      perChannel: false,
      preserveEdges: false
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
        this.settings.levels = parseInt(btn.dataset.levels);
        document.getElementById('levels').value = this.settings.levels;
        document.getElementById('levelsValue').textContent = this.settings.levels;
        this.render();
      });
    });

    document.getElementById('levels').addEventListener('input', (e) => {
      this.settings.levels = parseInt(e.target.value);
      document.getElementById('levelsValue').textContent = this.settings.levels;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('smooth').addEventListener('input', (e) => {
      this.settings.smooth = parseInt(e.target.value);
      document.getElementById('smoothValue').textContent = this.settings.smooth;
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.settings.contrast + '%';
      this.render();
    });

    document.getElementById('perChannel').addEventListener('change', (e) => {
      this.settings.perChannel = e.target.checked;
      this.render();
    });

    document.getElementById('preserveEdges').addEventListener('change', (e) => {
      this.settings.preserveEdges = e.target.checked;
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

  posterizeValue(value, levels) {
    const step = 256 / levels;
    return Math.floor(value / step) * step + step / 2;
  }

  detectEdges(data, w, h) {
    const edges = new Float32Array(w * h);
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            gx += gray * sobelX[ky + 1][kx + 1];
            gy += gray * sobelY[ky + 1][kx + 1];
          }
        }

        edges[y * w + x] = Math.sqrt(gx * gx + gy * gy) / 255;
      }
    }

    return edges;
  }

  render() {
    if (!this.originalImage) return;
    const { levels, smooth, contrast, perChannel, preserveEdges } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Apply smoothing if needed
    if (smooth > 0) {
      this.ctx.filter = `blur(${smooth}px)`;
    }
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Detect edges if preserving them
    let edges = null;
    if (preserveEdges) {
      // Get original image data for edge detection
      this.ctx.drawImage(this.originalImage, 0, 0);
      const origData = this.ctx.getImageData(0, 0, w, h);
      edges = this.detectEdges(origData.data, w, h);
    }

    const contrastFactor = contrast / 100;
    const usedColors = new Set();

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply contrast
      r = ((r - 128) * contrastFactor) + 128;
      g = ((g - 128) * contrastFactor) + 128;
      b = ((b - 128) * contrastFactor) + 128;

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      if (perChannel) {
        // Posterize each channel independently
        r = this.posterizeValue(r, levels);
        g = this.posterizeValue(g, levels);
        b = this.posterizeValue(b, levels);
      } else {
        // Posterize based on luminance
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        const posterizedGray = this.posterizeValue(gray, levels);
        const factor = gray > 0 ? posterizedGray / gray : 1;

        r = Math.min(255, r * factor);
        g = Math.min(255, g * factor);
        b = Math.min(255, b * factor);
      }

      // Preserve edges if enabled
      if (preserveEdges && edges) {
        const pixelIdx = i / 4;
        const edgeStrength = edges[pixelIdx];
        if (edgeStrength > 0.2) {
          // Blend with original at edges
          const origR = data[i];
          const origG = data[i + 1];
          const origB = data[i + 2];
          const blend = Math.min(1, edgeStrength * 2);
          r = r * (1 - blend) + origR * blend;
          g = g * (1 - blend) + origG * blend;
          b = b * (1 - blend) + origB * blend;
        }
      }

      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);

      usedColors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.updateColorPreview(usedColors);
  }

  updateColorPreview(usedColors) {
    const colorPreview = document.getElementById('colorPreview');
    const colors = Array.from(usedColors).slice(0, 16);

    colorPreview.innerHTML = colors.map(color => {
      const [r, g, b] = color.split(',');
      return `<div class="color-swatch" style="background: rgb(${r}, ${g}, ${b})"></div>`;
    }).join('');

    if (usedColors.size > 16) {
      colorPreview.innerHTML += `<span style="font-size: 0.7rem; color: #888;">+${usedColors.size - 16} 色</span>`;
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { levels: 8, smooth: 0, contrast: 100, perChannel: false, preserveEdges: false };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('levels').value = 8;
    document.getElementById('levelsValue').textContent = '8';
    document.getElementById('smooth').value = 0;
    document.getElementById('smoothValue').textContent = '0';
    document.getElementById('contrast').value = 100;
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('perChannel').checked = false;
    document.getElementById('preserveEdges').checked = false;
    document.getElementById('colorPreview').innerHTML = '';
    document.querySelectorAll('.preset-btn').forEach((b, i) => b.classList.toggle('active', i === 2));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `posterize_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new PosterizeTool());
