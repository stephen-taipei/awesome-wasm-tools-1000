/**
 * IMG-220 圖片色彩提取工具
 */
class ColorExtractionTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.colors = [];
    this.colorCount = 8;
    this.selectedColor = null;
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

    document.getElementById('colorCount').addEventListener('input', (e) => {
      this.colorCount = parseInt(e.target.value);
      document.getElementById('countValue').textContent = this.colorCount;
      this.extractColors();
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      this.showColorInfo({ r: pixel[0], g: pixel[1], b: pixel[2] });
    });

    document.querySelectorAll('.code-value').forEach(el => {
      el.addEventListener('click', () => {
        navigator.clipboard.writeText(el.textContent);
        this.showCopied();
      });
    });

    document.getElementById('exportBtn').addEventListener('click', () => this.exportPalette());
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
        this.extractColors();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);
  }

  extractColors() {
    if (!this.originalImage) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Sample pixels and quantize
    const colorMap = new Map();
    const step = Math.max(1, Math.floor(Math.sqrt(w * h / 10000)));

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 128) continue; // Skip transparent

        // Quantize to reduce colors
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;

        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }
    }

    // Sort by frequency and get top colors
    const sorted = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.colorCount * 3);

    // Filter similar colors
    this.colors = [];
    for (const [key] of sorted) {
      const [r, g, b] = key.split(',').map(Number);
      const color = { r, g, b };

      const isSimilar = this.colors.some(c => this.colorDistance(c, color) < 50);
      if (!isSimilar) {
        this.colors.push(color);
        if (this.colors.length >= this.colorCount) break;
      }
    }

    this.renderPalette();
  }

  colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  renderPalette() {
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';

    this.colors.forEach((color, i) => {
      const div = document.createElement('div');
      div.className = 'palette-color';
      div.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
      div.addEventListener('click', () => {
        document.querySelectorAll('.palette-color').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        this.showColorInfo(color);
      });
      palette.appendChild(div);
    });
  }

  showColorInfo(color) {
    this.selectedColor = color;
    document.getElementById('colorInfo').style.display = 'block';
    document.getElementById('selectedColor').style.backgroundColor =
      `rgb(${color.r}, ${color.g}, ${color.b})`;

    const hex = this.rgbToHex(color.r, color.g, color.b);
    const hsl = this.rgbToHsl(color.r, color.g, color.b);

    document.getElementById('hexCode').textContent = hex;
    document.getElementById('rgbCode').textContent = `rgb(${color.r}, ${color.g}, ${color.b})`;
    document.getElementById('hslCode').textContent =
      `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  showCopied() {
    const el = document.getElementById('copied');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
  }

  exportPalette() {
    const hexColors = this.colors.map(c => this.rgbToHex(c.r, c.g, c.b));
    const text = hexColors.join('\n');
    navigator.clipboard.writeText(text);
    this.showCopied();
  }

  reset() {
    this.originalImage = null;
    this.colors = [];
    this.selectedColor = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('colorPalette').innerHTML = '';
    document.getElementById('colorInfo').style.display = 'none';
    document.getElementById('colorCount').value = 8;
    document.getElementById('countValue').textContent = '8';
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorExtractionTool());
