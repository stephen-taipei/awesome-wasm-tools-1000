class LiquifyTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.currentImageData = null;
    this.history = [];
    this.settings = {
      tool: 'push',
      brushSize: 50,
      strength: 50
    };
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
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

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.tool = btn.dataset.tool;
      });
    });

    // Brush size slider
    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    });

    // Strength slider
    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
    });

    // Canvas mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.endDraw());
    this.canvas.addEventListener('mouseleave', () => this.endDraw());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDraw(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.endDraw());

    // Undo button
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
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
        this.ctx.drawImage(img, 0, 0);
        this.currentImageData = this.ctx.getImageData(0, 0, img.width, img.height);
        this.history = [];
        document.getElementById('editorSection').classList.add('active');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  startDraw(e) {
    if (!this.currentImageData) return;
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e);
    this.lastX = coords.x;
    this.lastY = coords.y;
    // Save state for undo
    this.history.push(new ImageData(
      new Uint8ClampedArray(this.currentImageData.data),
      this.currentImageData.width,
      this.currentImageData.height
    ));
    if (this.history.length > 20) this.history.shift();
  }

  draw(e) {
    if (!this.isDrawing || !this.currentImageData) return;
    const coords = this.getCanvasCoords(e);
    const dx = coords.x - this.lastX;
    const dy = coords.y - this.lastY;

    this.applyTool(coords.x, coords.y, dx, dy);

    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  endDraw() {
    this.isDrawing = false;
  }

  applyTool(centerX, centerY, dx, dy) {
    const data = this.currentImageData.data;
    const width = this.currentImageData.width;
    const height = this.currentImageData.height;
    const radius = this.settings.brushSize;
    const strength = this.settings.strength / 100;

    const newData = new Uint8ClampedArray(data);

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const distX = x - centerX;
        const distY = y - centerY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < radius) {
          const factor = Math.pow(1 - distance / radius, 2) * strength;
          let srcX = x;
          let srcY = y;

          switch (this.settings.tool) {
            case 'push':
              srcX = x - dx * factor;
              srcY = y - dy * factor;
              break;
            case 'expand':
              srcX = centerX + distX * (1 - factor * 0.3);
              srcY = centerY + distY * (1 - factor * 0.3);
              break;
            case 'contract':
              srcX = centerX + distX * (1 + factor * 0.3);
              srcY = centerY + distY * (1 + factor * 0.3);
              break;
            case 'twistCW':
              const angleCW = factor * 0.3;
              srcX = centerX + distX * Math.cos(angleCW) - distY * Math.sin(angleCW);
              srcY = centerY + distX * Math.sin(angleCW) + distY * Math.cos(angleCW);
              break;
            case 'twistCCW':
              const angleCCW = -factor * 0.3;
              srcX = centerX + distX * Math.cos(angleCCW) - distY * Math.sin(angleCCW);
              srcY = centerY + distX * Math.sin(angleCCW) + distY * Math.cos(angleCCW);
              break;
            case 'smooth':
              // Average with neighbors
              srcX = x;
              srcY = y;
              break;
          }

          // Bilinear interpolation
          if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;

            const dstIdx = (y * width + x) * 4;

            for (let c = 0; c < 4; c++) {
              const v00 = data[(y0 * width + x0) * 4 + c];
              const v10 = data[(y0 * width + x1) * 4 + c];
              const v01 = data[(y1 * width + x0) * 4 + c];
              const v11 = data[(y1 * width + x1) * 4 + c];

              const v0 = v00 * (1 - xFrac) + v10 * xFrac;
              const v1 = v01 * (1 - xFrac) + v11 * xFrac;
              newData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
            }
          }
        }
      }
    }

    this.currentImageData = new ImageData(newData, width, height);
    this.ctx.putImageData(this.currentImageData, 0, 0);
  }

  undo() {
    if (this.history.length > 0) {
      this.currentImageData = this.history.pop();
      this.ctx.putImageData(this.currentImageData, 0, 0);
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'liquify-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    if (this.originalImage) {
      this.ctx.drawImage(this.originalImage, 0, 0);
      this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.history = [];
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LiquifyTool();
});
