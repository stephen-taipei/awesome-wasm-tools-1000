/**
 * IMG-200 圖片濾鏡工具
 */
class FiltersTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentFilter = 'none';
    this.intensity = 100;
    this.filters = [
      { id: 'none', name: '原圖', settings: {} },
      { id: 'grayscale', name: '黑白', settings: { grayscale: 1 } },
      { id: 'sepia', name: '復古', settings: { sepia: 1 } },
      { id: 'warm', name: '暖色', settings: { temperature: 30, saturate: 1.1 } },
      { id: 'cool', name: '冷色', settings: { temperature: -30, saturate: 1.1 } },
      { id: 'vintage', name: '懷舊', settings: { sepia: 0.4, contrast: 1.1, brightness: 0.9 } },
      { id: 'dramatic', name: '戲劇', settings: { contrast: 1.4, saturate: 1.3, brightness: 0.9 } },
      { id: 'fade', name: '褪色', settings: { contrast: 0.9, brightness: 1.1, saturate: 0.8 } },
      { id: 'vivid', name: '鮮艷', settings: { saturate: 1.5, contrast: 1.1 } },
      { id: 'muted', name: '柔和', settings: { saturate: 0.6, brightness: 1.05 } },
      { id: 'noir', name: '黑色電影', settings: { grayscale: 1, contrast: 1.3 } },
      { id: 'chrome', name: '鍍鉻', settings: { contrast: 1.2, saturate: 0.8, brightness: 1.1 } }
    ];
    this.init();
  }

  init() {
    this.createFilterGrid();
    this.bindEvents();
  }

  createFilterGrid() {
    const grid = document.getElementById('filterGrid');
    this.filters.forEach(filter => {
      const item = document.createElement('div');
      item.className = 'filter-item' + (filter.id === 'none' ? ' active' : '');
      item.dataset.filter = filter.id;
      item.innerHTML = `
        <canvas class="filter-thumb" width="80" height="80"></canvas>
        <div class="filter-name">${filter.name}</div>
      `;
      grid.appendChild(item);
    });
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.filter-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentFilter = item.dataset.filter;
        this.render();
      });
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
        this.updateThumbnails();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateThumbnails() {
    const thumbs = document.querySelectorAll('.filter-thumb');
    thumbs.forEach((thumb, i) => {
      const ctx = thumb.getContext('2d');
      const size = 80;
      const scale = Math.max(size / this.originalImage.width, size / this.originalImage.height);
      const w = this.originalImage.width * scale;
      const h = this.originalImage.height * scale;
      ctx.drawImage(this.originalImage, (size - w) / 2, (size - h) / 2, w, h);
      this.applyFilterToCanvas(ctx, this.filters[i].settings, size, size, 100);
    });
  }

  applyFilterToCanvas(ctx, settings, w, h, intensity) {
    if (Object.keys(settings).length === 0) return;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];

      // Temperature
      if (settings.temperature) {
        const temp = settings.temperature * factor;
        r = Math.min(255, Math.max(0, r + temp));
        b = Math.min(255, Math.max(0, b - temp));
      }

      // Grayscale
      if (settings.grayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const amount = settings.grayscale * factor;
        r = r * (1 - amount) + gray * amount;
        g = g * (1 - amount) + gray * amount;
        b = b * (1 - amount) + gray * amount;
      }

      // Sepia
      if (settings.sepia) {
        const amount = settings.sepia * factor;
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r * (1 - amount) + tr * amount;
        g = g * (1 - amount) + tg * amount;
        b = b * (1 - amount) + tb * amount;
      }

      // Brightness
      if (settings.brightness) {
        const bright = 1 + (settings.brightness - 1) * factor;
        r *= bright; g *= bright; b *= bright;
      }

      // Contrast
      if (settings.contrast) {
        const cont = 1 + (settings.contrast - 1) * factor;
        r = ((r / 255 - 0.5) * cont + 0.5) * 255;
        g = ((g / 255 - 0.5) * cont + 0.5) * 255;
        b = ((b / 255 - 0.5) * cont + 0.5) * 255;
      }

      // Saturate
      if (settings.saturate) {
        const sat = 1 + (settings.saturate - 1) * factor;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * sat;
        g = gray + (g - gray) * sat;
        b = gray + (b - gray) * sat;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const filter = this.filters.find(f => f.id === this.currentFilter);
    if (filter) {
      this.applyFilterToCanvas(this.ctx, filter.settings, w, h, this.intensity);
    }
  }

  reset() {
    this.originalImage = null;
    this.currentFilter = 'none';
    this.intensity = 100;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.filter-item[data-filter="none"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `filter_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new FiltersTool());
