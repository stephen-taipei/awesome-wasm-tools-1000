/**
 * IMG-192 圖片拼貼工具
 */
class CollageTool {
  constructor() {
    this.images = [];
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { layout: 'grid-2x2', gap: 10, radius: 0 };
    this.outputSize = 800;
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); this.loadImages(e.dataTransfer.files); });
    fileInput.addEventListener('change', (e) => this.loadImages(e.target.files));

    document.getElementById('addMoreBtn').addEventListener('click', () => fileInput.click());

    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.layout = btn.dataset.layout;
        this.render();
      });
    });

    document.getElementById('gap').addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = this.settings.gap + ' px';
      this.render();
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.radius + ' px';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImages(files) {
    const validFiles = Array.from(files).filter(f => f.type.match(/^image\/(png|jpeg|webp|gif)$/)).slice(0, 9 - this.images.length);
    if (!validFiles.length) return;

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push(img);
          loaded++;
          if (loaded === validFiles.length) {
            this.updateThumbnails();
            document.getElementById('uploadZone').style.display = 'none';
            document.getElementById('editorSection').classList.add('active');
            this.render();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateThumbnails() {
    const container = document.getElementById('thumbnails');
    container.innerHTML = '';
    this.images.forEach((img, i) => {
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.className = 'thumb';
      thumb.onclick = () => {
        this.images.splice(i, 1);
        this.updateThumbnails();
        this.render();
      };
      container.appendChild(thumb);
    });
    document.getElementById('imageCount').textContent = `已選擇 ${this.images.length} 張圖片（點擊縮圖可移除）`;
  }

  render() {
    if (!this.images.length) return;
    const { layout, gap, radius } = this.settings;
    const size = this.outputSize;

    let cols, rows;
    switch (layout) {
      case 'grid-2x2': cols = 2; rows = 2; break;
      case 'grid-3x3': cols = 3; rows = 3; break;
      case 'horizontal': cols = this.images.length; rows = 1; break;
      case 'vertical': cols = 1; rows = this.images.length; break;
      case 'grid-2x1': cols = 2; rows = 1; break;
      case 'grid-1x2': cols = 1; rows = 2; break;
      default: cols = 2; rows = 2;
    }

    const w = layout === 'vertical' ? size / 2 : size;
    const h = layout === 'horizontal' ? size / 2 : size;
    this.canvas.width = w;
    this.canvas.height = h;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, w, h);

    const cellW = (w - gap * (cols + 1)) / cols;
    const cellH = (h - gap * (rows + 1)) / rows;

    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (idx >= this.images.length) break;
        const img = this.images[idx];
        const x = gap + col * (cellW + gap);
        const y = gap + row * (cellH + gap);

        this.ctx.save();
        if (radius > 0) {
          this.roundRect(x, y, cellW, cellH, radius);
          this.ctx.clip();
        }

        // Cover fit
        const scale = Math.max(cellW / img.width, cellH / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        const sx = x + (cellW - sw) / 2;
        const sy = y + (cellH - sh) / 2;
        this.ctx.drawImage(img, sx, sy, sw, sh);
        this.ctx.restore();
        idx++;
      }
    }
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  reset() {
    this.images = [];
    this.settings = { layout: 'grid-2x2', gap: 10, radius: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('thumbnails').innerHTML = '';
    document.getElementById('imageCount').textContent = '已選擇 0 張圖片';
    document.getElementById('gap').value = 10;
    document.getElementById('gapValue').textContent = '10 px';
    document.getElementById('radius').value = 0;
    document.getElementById('radiusValue').textContent = '0 px';
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.layout-btn[data-layout="grid-2x2"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `collage_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new CollageTool());
