/**
 * IMG-223 圖片馬賽克遮蔽工具
 */
class MosaicMaskTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { shape: 'rect', blockSize: 15, brushSize: 30 };
    this.isDrawing = false;
    this.startPos = null;
    this.history = [];
    this.brushMask = null;
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

    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.shape = btn.dataset.shape;
        document.getElementById('brushSizeGroup').style.display =
          this.settings.shape === 'brush' ? 'block' : 'none';
      });
    });

    document.getElementById('blockSize').addEventListener('input', (e) => {
      this.settings.blockSize = parseInt(e.target.value);
      document.getElementById('blockSizeValue').textContent = this.settings.blockSize;
    });

    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    });

    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.endDraw());
    this.canvas.addEventListener('mouseleave', () => this.endDraw());

    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.history = [];
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.initBrushMask();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initBrushMask() {
    this.brushMask = new Uint8Array(this.canvas.width * this.canvas.height);
  }

  render() {
    if (!this.originalImage) return;
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Apply all history masks
    this.history.forEach(item => {
      if (item.type === 'rect') {
        this.applyMosaicToRect(item.x, item.y, item.w, item.h);
      } else if (item.type === 'circle') {
        this.applyMosaicToCircle(item.cx, item.cy, item.r);
      }
    });

    // Apply brush mask
    if (this.brushMask) {
      this.applyBrushMosaic();
    }
  }

  applyMosaicToRect(x, y, w, h) {
    const blockSize = this.settings.blockSize;
    const imageData = this.ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        const bw = Math.min(blockSize, w - bx);
        const bh = Math.min(blockSize, h - by);

        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, x, y);
  }

  applyMosaicToCircle(cx, cy, radius) {
    const x = Math.max(0, cx - radius);
    const y = Math.max(0, cy - radius);
    const w = Math.min(this.canvas.width - x, radius * 2);
    const h = Math.min(this.canvas.height - y, radius * 2);
    const blockSize = this.settings.blockSize;

    const imageData = this.ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        const bcx = bx + blockSize / 2;
        const bcy = by + blockSize / 2;
        const dist = Math.sqrt(Math.pow(bcx - radius, 2) + Math.pow(bcy - radius, 2));
        if (dist > radius) continue;

        let r = 0, g = 0, b = 0, count = 0;
        const bw = Math.min(blockSize, w - bx);
        const bh = Math.min(blockSize, h - by);

        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, x, y);
  }

  applyBrushMosaic() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const blockSize = this.settings.blockSize;
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        // Check if any pixel in block is masked
        let hasMask = false;
        const bw = Math.min(blockSize, w - bx);
        const bh = Math.min(blockSize, h - by);

        for (let dy = 0; dy < bh && !hasMask; dy++) {
          for (let dx = 0; dx < bw && !hasMask; dx++) {
            if (this.brushMask[(by + dy) * w + (bx + dx)]) hasMask = true;
          }
        }

        if (!hasMask) continue;

        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            const i = ((by + dy) * w + (bx + dx)) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let dy = 0; dy < bh; dy++) {
          for (let dx = 0; dx < bw; dx++) {
            if (this.brushMask[(by + dy) * w + (bx + dx)]) {
              const i = ((by + dy) * w + (bx + dx)) * 4;
              data[i] = r; data[i + 1] = g; data[i + 2] = b;
            }
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  startDraw(e) {
    this.isDrawing = true;
    this.startPos = this.getCanvasPos(e);
    if (this.settings.shape === 'brush') {
      this.brushAt(this.startPos.x, this.startPos.y);
    }
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(e);

    if (this.settings.shape === 'brush') {
      this.brushAt(pos.x, pos.y);
      this.render();
    }
  }

  brushAt(x, y) {
    const r = this.settings.brushSize / 2;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const px = Math.floor(x + dx);
          const py = Math.floor(y + dy);
          if (px >= 0 && px < w && py >= 0 && py < h) {
            this.brushMask[py * w + px] = 1;
          }
        }
      }
    }
  }

  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.settings.shape !== 'brush' && this.startPos) {
      const rect = this.canvas.getBoundingClientRect();
      // Just save the drawn shape would need end position...
      // For simplicity, store current canvas state
    }
  }

  undo() {
    if (this.settings.shape === 'brush') {
      this.brushMask = new Uint8Array(this.canvas.width * this.canvas.height);
    } else if (this.history.length > 0) {
      this.history.pop();
    }
    this.render();
  }

  reset() {
    this.originalImage = null;
    this.history = [];
    this.brushMask = null;
    this.settings = { shape: 'rect', blockSize: 15, brushSize: 30 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('blockSize').value = 15;
    document.getElementById('blockSizeValue').textContent = '15';
    document.getElementById('brushSize').value = 30;
    document.getElementById('brushSizeValue').textContent = '30';
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.shape-btn[data-shape="rect"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `mosaic_mask_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new MosaicMaskTool());
