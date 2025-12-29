class MosaicTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      shape: 'square',
      size: 20,
      gap: 2,
      gapColor: '#1a1a2e',
      outline: false
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.shape = btn.dataset.shape;
        this.render();
      });
    });

    document.getElementById('size').addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value);
      document.getElementById('sizeValue').textContent = `${this.settings.size} px`;
      this.render();
    });

    document.getElementById('gap').addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = `${this.settings.gap} px`;
      this.render();
    });

    document.getElementById('gapColor').addEventListener('input', (e) => {
      this.settings.gapColor = e.target.value;
      this.render();
    });

    document.getElementById('outlineCheck').addEventListener('change', (e) => {
      this.settings.outline = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getAverageColor(x, y, size) {
    const srcData = this.imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    let sumR = 0, sumG = 0, sumB = 0, count = 0;

    for (let dy = 0; dy < size && y + dy < height; dy++) {
      for (let dx = 0; dx < size && x + dx < width; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        sumR += srcData[idx];
        sumG += srcData[idx + 1];
        sumB += srcData[idx + 2];
        count++;
      }
    }

    return {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count)
    };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const size = this.settings.size;
    const gap = this.settings.gap;

    // Fill background
    this.ctx.fillStyle = this.settings.gapColor;
    this.ctx.fillRect(0, 0, width, height);

    const step = size + gap;

    switch (this.settings.shape) {
      case 'square':
        this.renderSquares(width, height, size, step);
        break;
      case 'circle':
        this.renderCircles(width, height, size, step);
        break;
      case 'hexagon':
        this.renderHexagons(width, height, size);
        break;
      case 'diamond':
        this.renderDiamonds(width, height, size, step);
        break;
      case 'triangle':
        this.renderTriangles(width, height, size, step);
        break;
      case 'brick':
        this.renderBricks(width, height, size, step);
        break;
    }
  }

  renderSquares(width, height, size, step) {
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const color = this.getAverageColor(x, y, size);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(x, y, size, size);

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.strokeRect(x, y, size, size);
        }
      }
    }
  }

  renderCircles(width, height, size, step) {
    const radius = size / 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const color = this.getAverageColor(x, y, size);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.beginPath();
        this.ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
        this.ctx.fill();

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.stroke();
        }
      }
    }
  }

  renderHexagons(width, height, size) {
    const h = size;
    const w = size * Math.sqrt(3) / 2;
    const gap = this.settings.gap;

    for (let row = 0; row * h * 0.75 < height; row++) {
      const offsetX = (row % 2) * w;
      for (let col = 0; col * w * 2 < width + w; col++) {
        const cx = col * w * 2 + offsetX;
        const cy = row * h * 0.75;

        const color = this.getAverageColor(Math.floor(cx - w/2), Math.floor(cy - h/2), size);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i - Math.PI / 6;
          const px = cx + (w - gap/2) * Math.cos(angle);
          const py = cy + (h/2 - gap/2) * Math.sin(angle);
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.stroke();
        }
      }
    }
  }

  renderDiamonds(width, height, size, step) {
    const half = size / 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const color = this.getAverageColor(x, y, size);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

        const cx = x + half;
        const cy = y + half;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - half);
        this.ctx.lineTo(cx + half, cy);
        this.ctx.lineTo(cx, cy + half);
        this.ctx.lineTo(cx - half, cy);
        this.ctx.closePath();
        this.ctx.fill();

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.stroke();
        }
      }
    }
  }

  renderTriangles(width, height, size, step) {
    const h = size * Math.sqrt(3) / 2;
    for (let row = 0; row * h < height; row++) {
      for (let col = 0; col * size / 2 < width; col++) {
        const x = col * size / 2;
        const y = row * h;
        const up = (row + col) % 2 === 0;

        const color = this.getAverageColor(Math.floor(x), Math.floor(y), size);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

        this.ctx.beginPath();
        if (up) {
          this.ctx.moveTo(x, y + h);
          this.ctx.lineTo(x + size / 2, y);
          this.ctx.lineTo(x + size, y + h);
        } else {
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x + size, y);
          this.ctx.lineTo(x + size / 2, y + h);
        }
        this.ctx.closePath();
        this.ctx.fill();

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.stroke();
        }
      }
    }
  }

  renderBricks(width, height, size, step) {
    const brickWidth = size * 2;
    const brickHeight = size;
    const gap = this.settings.gap;

    for (let row = 0; row * (brickHeight + gap) < height; row++) {
      const offsetX = (row % 2) * (brickWidth / 2 + gap / 2);
      for (let col = -1; col * (brickWidth + gap) < width + brickWidth; col++) {
        const x = col * (brickWidth + gap) + offsetX;
        const y = row * (brickHeight + gap);

        const color = this.getAverageColor(Math.max(0, Math.floor(x)), Math.floor(y), brickWidth);
        this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.fillRect(x, y, brickWidth, brickHeight);

        if (this.settings.outline) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          this.ctx.strokeRect(x, y, brickWidth, brickHeight);
        }
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'mosaic-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { shape: 'square', size: 20, gap: 2, gapColor: '#1a1a2e', outline: false };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.shape-btn[data-shape="square"]').classList.add('active');
    document.getElementById('size').value = 20;
    document.getElementById('sizeValue').textContent = '20 px';
    document.getElementById('gap').value = 2;
    document.getElementById('gapValue').textContent = '2 px';
    document.getElementById('gapColor').value = '#1a1a2e';
    document.getElementById('outlineCheck').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MosaicTool();
});
