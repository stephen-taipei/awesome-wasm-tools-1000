/**
 * IMG-248 圖片馬賽克拼貼工具
 */
class MosaicTilesTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      tileSize: 20,
      gap: 2,
      roundness: 0,
      showGrid: false,
      randomRotation: false
    };
    this.mode = 'square';
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

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('tileSize').addEventListener('input', (e) => {
      this.settings.tileSize = parseInt(e.target.value);
      document.getElementById('tileSizeValue').textContent = this.settings.tileSize;
      this.render();
    });

    document.getElementById('gap').addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = this.settings.gap;
      this.render();
    });

    document.getElementById('roundness').addEventListener('input', (e) => {
      this.settings.roundness = parseInt(e.target.value);
      document.getElementById('roundnessValue').textContent = this.settings.roundness + '%';
      this.render();
    });

    document.getElementById('showGrid').addEventListener('change', (e) => {
      this.settings.showGrid = e.target.checked;
      this.render();
    });

    document.getElementById('randomRotation').addEventListener('change', (e) => {
      this.settings.randomRotation = e.target.checked;
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

  getAverageColor(srcData, x, y, w, h, imgW, imgH) {
    let r = 0, g = 0, b = 0, count = 0;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = Math.min(imgW - 1, x + dx);
        const py = Math.min(imgH - 1, y + dy);
        const idx = (py * imgW + px) * 4;
        r += srcData.data[idx];
        g += srcData.data[idx + 1];
        b += srcData.data[idx + 2];
        count++;
      }
    }
    return { r: r / count, g: g / count, b: b / count };
  }

  render() {
    if (!this.originalImage) return;
    const { tileSize, gap, roundness, showGrid, randomRotation } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Get source image data
    this.ctx.drawImage(this.originalImage, 0, 0);
    const srcData = this.ctx.getImageData(0, 0, w, h);

    // Clear canvas with dark background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, w, h);

    const effectiveSize = tileSize - gap;
    const radius = (effectiveSize / 2) * (roundness / 100);

    if (this.mode === 'hexagon') {
      this.renderHexagons(srcData, w, h, tileSize, gap, randomRotation);
    } else if (this.mode === 'diamond') {
      this.renderDiamonds(srcData, w, h, tileSize, gap, randomRotation);
    } else {
      this.renderSquares(srcData, w, h, tileSize, gap, radius, randomRotation, showGrid);
    }
  }

  renderSquares(srcData, w, h, tileSize, gap, radius, randomRotation, showGrid) {
    const effectiveSize = tileSize - gap;

    for (let y = 0; y < h; y += tileSize) {
      for (let x = 0; x < w; x += tileSize) {
        const color = this.getAverageColor(srcData, x, y, tileSize, tileSize, w, h);

        this.ctx.save();
        if (randomRotation) {
          const cx = x + tileSize / 2;
          const cy = y + tileSize / 2;
          this.ctx.translate(cx, cy);
          this.ctx.rotate((Math.random() - 0.5) * 0.2);
          this.ctx.translate(-cx, -cy);
        }

        this.ctx.fillStyle = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
        this.ctx.beginPath();
        if (radius > 0) {
          this.roundRect(x + gap / 2, y + gap / 2, effectiveSize, effectiveSize, radius);
        } else {
          this.ctx.rect(x + gap / 2, y + gap / 2, effectiveSize, effectiveSize);
        }
        this.ctx.fill();

        if (showGrid) {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }

        this.ctx.restore();
      }
    }
  }

  renderHexagons(srcData, w, h, tileSize, gap, randomRotation) {
    const hexHeight = tileSize;
    const hexWidth = tileSize * 0.866;
    const vertSpacing = hexHeight * 0.75;

    for (let row = 0; row * vertSpacing < h + hexHeight; row++) {
      for (let col = 0; col * hexWidth < w + hexWidth; col++) {
        const x = col * hexWidth + (row % 2) * (hexWidth / 2);
        const y = row * vertSpacing;

        const color = this.getAverageColor(srcData, Math.floor(x), Math.floor(y), Math.ceil(hexWidth), Math.ceil(hexHeight), w, h);

        this.ctx.save();
        if (randomRotation) {
          this.ctx.translate(x + hexWidth / 2, y + hexHeight / 2);
          this.ctx.rotate((Math.random() - 0.5) * 0.1);
          this.ctx.translate(-x - hexWidth / 2, -y - hexHeight / 2);
        }

        this.ctx.fillStyle = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
        this.drawHexagon(x + hexWidth / 2, y + hexHeight / 2, (tileSize - gap) / 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  renderDiamonds(srcData, w, h, tileSize, gap, randomRotation) {
    const diamondSize = tileSize * 0.7;

    for (let row = 0; row * diamondSize < h + tileSize; row++) {
      for (let col = 0; col * diamondSize < w + tileSize; col++) {
        const x = col * diamondSize + (row % 2) * (diamondSize / 2);
        const y = row * diamondSize;

        const color = this.getAverageColor(srcData, Math.floor(x), Math.floor(y), Math.ceil(diamondSize), Math.ceil(diamondSize), w, h);

        this.ctx.save();
        if (randomRotation) {
          this.ctx.translate(x + diamondSize / 2, y + diamondSize / 2);
          this.ctx.rotate((Math.random() - 0.5) * 0.15);
          this.ctx.translate(-x - diamondSize / 2, -y - diamondSize / 2);
        }

        this.ctx.fillStyle = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
        this.drawDiamond(x + diamondSize / 2, y + diamondSize / 2, (diamondSize - gap) / 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  drawHexagon(cx, cy, r) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  drawDiamond(cx, cy, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - r);
    this.ctx.lineTo(cx + r, cy);
    this.ctx.lineTo(cx, cy + r);
    this.ctx.lineTo(cx - r, cy);
    this.ctx.closePath();
  }

  roundRect(x, y, w, h, r) {
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
  }

  reset() {
    this.originalImage = null;
    this.settings = { tileSize: 20, gap: 2, roundness: 0, showGrid: false, randomRotation: false };
    this.mode = 'square';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('tileSize').value = 20;
    document.getElementById('tileSizeValue').textContent = '20';
    document.getElementById('gap').value = 2;
    document.getElementById('gapValue').textContent = '2';
    document.getElementById('roundness').value = 0;
    document.getElementById('roundnessValue').textContent = '0%';
    document.getElementById('showGrid').checked = false;
    document.getElementById('randomRotation').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `mosaic_tiles_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new MosaicTilesTool());
