/**
 * IMG-185 圖片馬賽克藝術工具
 */
class MosaicArtTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { size: 10, gap: 1, style: 'square' };
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

    ['size', 'gap'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id] + ' px';
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
        this.settings = { size: 10, gap: 1, style: 'square' };
        document.getElementById('size').value = 10;
        document.getElementById('sizeValue').textContent = '10 px';
        document.getElementById('gap').value = 1;
        document.getElementById('gapValue').textContent = '1 px';
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
    const { size, gap, style } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw original to get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, w, h);

    // Clear and set background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, w, h);

    const step = size + gap;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const color = this.getAverageColor(imageData, x, y, size, w, h);
        this.ctx.fillStyle = color;
        this.drawShape(x, y, size, style);
      }
    }
  }

  getAverageColor(imageData, startX, startY, size, w, h) {
    let r = 0, g = 0, b = 0, count = 0;
    for (let y = startY; y < startY + size && y < h; y++) {
      for (let x = startX; x < startX + size && x < w; x++) {
        const i = (y * w + x) * 4;
        r += imageData.data[i];
        g += imageData.data[i + 1];
        b += imageData.data[i + 2];
        count++;
      }
    }
    return `rgb(${Math.round(r/count)}, ${Math.round(g/count)}, ${Math.round(b/count)})`;
  }

  drawShape(x, y, size, style) {
    const half = size / 2;
    const cx = x + half;
    const cy = y + half;

    switch (style) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, half * 0.9, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'diamond':
        this.ctx.beginPath();
        this.ctx.moveTo(cx, y);
        this.ctx.lineTo(x + size, cy);
        this.ctx.lineTo(cx, y + size);
        this.ctx.lineTo(x, cy);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 'hexagon':
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * Math.PI / 180;
          const px = cx + half * 0.9 * Math.cos(angle);
          const py = cy + half * 0.9 * Math.sin(angle);
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        break;
      default: // square
        this.ctx.fillRect(x, y, size, size);
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { size: 10, gap: 1, style: 'square' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('size').value = 10;
    document.getElementById('sizeValue').textContent = '10 px';
    document.getElementById('gap').value = 1;
    document.getElementById('gapValue').textContent = '1 px';
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.style-btn[data-style="square"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `mosaic_art_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new MosaicArtTool());
