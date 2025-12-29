class WarpGridTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.gridPoints = [];
    this.settings = {
      gridSize: 4,
      strength: 50,
      showGrid: true
    };
    this.draggingPoint = null;
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Grid size slider
    document.getElementById('gridSize').addEventListener('input', (e) => {
      this.settings.gridSize = parseInt(e.target.value);
      document.getElementById('gridSizeValue').textContent = this.settings.gridSize;
      this.initGrid();
      this.render();
    });

    // Strength slider
    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
    });

    // Show grid checkbox
    document.getElementById('showGrid').addEventListener('change', (e) => {
      this.settings.showGrid = e.target.checked;
      this.render();
    });

    // Canvas mouse events for dragging points
    this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.canvas.addEventListener('mousemove', (e) => this.drag(e));
    this.canvas.addEventListener('mouseup', () => this.endDrag());
    this.canvas.addEventListener('mouseleave', () => this.endDrag());

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

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

        document.getElementById('editorSection').classList.add('active');
        this.initGrid();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initGrid() {
    const size = this.settings.gridSize + 1;
    this.gridPoints = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        this.gridPoints.push({
          x: (x / this.settings.gridSize) * this.canvas.width,
          y: (y / this.settings.gridSize) * this.canvas.height,
          origX: (x / this.settings.gridSize) * this.canvas.width,
          origY: (y / this.settings.gridSize) * this.canvas.height
        });
      }
    }
  }

  applyPreset(preset) {
    this.initGrid();
    const strength = this.settings.strength / 100;
    const size = this.settings.gridSize + 1;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.gridPoints.forEach((point, i) => {
      const gridX = i % size;
      const gridY = Math.floor(i / size);
      const normalizedX = gridX / this.settings.gridSize;
      const normalizedY = gridY / this.settings.gridSize;

      switch (preset) {
        case 'wave':
          point.x = point.origX + Math.sin(normalizedY * Math.PI * 2) * 30 * strength;
          point.y = point.origY + Math.sin(normalizedX * Math.PI * 2) * 30 * strength;
          break;
        case 'bulge':
          const distX1 = point.origX - centerX;
          const distY1 = point.origY - centerY;
          const dist1 = Math.sqrt(distX1 * distX1 + distY1 * distY1);
          const maxDist1 = Math.sqrt(centerX * centerX + centerY * centerY);
          const factor1 = 1 + (1 - dist1 / maxDist1) * strength * 0.5;
          point.x = centerX + distX1 * factor1;
          point.y = centerY + distY1 * factor1;
          break;
        case 'pinch':
          const distX2 = point.origX - centerX;
          const distY2 = point.origY - centerY;
          const dist2 = Math.sqrt(distX2 * distX2 + distY2 * distY2);
          const maxDist2 = Math.sqrt(centerX * centerX + centerY * centerY);
          const factor2 = 1 - (1 - dist2 / maxDist2) * strength * 0.5;
          point.x = centerX + distX2 * factor2;
          point.y = centerY + distY2 * factor2;
          break;
        case 'flag':
          point.x = point.origX;
          point.y = point.origY + Math.sin(normalizedX * Math.PI * 2) * 40 * strength * (1 - normalizedX * 0.5);
          break;
        case 'twist':
          const distX3 = point.origX - centerX;
          const distY3 = point.origY - centerY;
          const dist3 = Math.sqrt(distX3 * distX3 + distY3 * distY3);
          const maxDist3 = Math.sqrt(centerX * centerX + centerY * centerY);
          const angle = (1 - dist3 / maxDist3) * Math.PI * strength;
          point.x = centerX + distX3 * Math.cos(angle) - distY3 * Math.sin(angle);
          point.y = centerY + distX3 * Math.sin(angle) + distY3 * Math.cos(angle);
          break;
        case 'reset':
          point.x = point.origX;
          point.y = point.origY;
          break;
      }
    });

    this.render();
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

  startDrag(e) {
    const coords = this.getCanvasCoords(e);
    const threshold = 15;

    for (let i = 0; i < this.gridPoints.length; i++) {
      const point = this.gridPoints[i];
      const dist = Math.sqrt(
        Math.pow(coords.x - point.x, 2) + Math.pow(coords.y - point.y, 2)
      );
      if (dist < threshold) {
        this.draggingPoint = i;
        break;
      }
    }
  }

  drag(e) {
    if (this.draggingPoint === null) return;
    const coords = this.getCanvasCoords(e);
    this.gridPoints[this.draggingPoint].x = coords.x;
    this.gridPoints[this.draggingPoint].y = coords.y;
    this.render();
  }

  endDrag() {
    this.draggingPoint = null;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const dstData = outputData.data;
    const size = this.settings.gridSize + 1;

    // For each pixel, find which grid cell it's in and interpolate
    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        // Find source coordinates using inverse bilinear interpolation
        const srcCoords = this.inverseWarp(x, y);

        if (srcCoords) {
          const dstIdx = (y * this.canvas.width + x) * 4;

          // Bilinear interpolation from source
          const srcX = srcCoords.x;
          const srcY = srcCoords.y;

          if (srcX >= 0 && srcX < this.canvas.width - 1 && srcY >= 0 && srcY < this.canvas.height - 1) {
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;

            for (let c = 0; c < 4; c++) {
              const v00 = srcData[(y0 * this.canvas.width + x0) * 4 + c];
              const v10 = srcData[(y0 * this.canvas.width + x1) * 4 + c];
              const v01 = srcData[(y1 * this.canvas.width + x0) * 4 + c];
              const v11 = srcData[(y1 * this.canvas.width + x1) * 4 + c];

              const v0 = v00 * (1 - xFrac) + v10 * xFrac;
              const v1 = v01 * (1 - xFrac) + v11 * xFrac;
              dstData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
            }
          }
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);

    // Draw grid if enabled
    if (this.settings.showGrid) {
      this.drawGrid();
    }
  }

  inverseWarp(destX, destY) {
    const size = this.settings.gridSize + 1;
    const cellWidth = this.canvas.width / this.settings.gridSize;
    const cellHeight = this.canvas.height / this.settings.gridSize;

    // Find which grid cell contains this point
    for (let gy = 0; gy < this.settings.gridSize; gy++) {
      for (let gx = 0; gx < this.settings.gridSize; gx++) {
        const tl = this.gridPoints[gy * size + gx];
        const tr = this.gridPoints[gy * size + gx + 1];
        const bl = this.gridPoints[(gy + 1) * size + gx];
        const br = this.gridPoints[(gy + 1) * size + gx + 1];

        // Check if point is in this quad (approximate)
        const minX = Math.min(tl.x, tr.x, bl.x, br.x);
        const maxX = Math.max(tl.x, tr.x, bl.x, br.x);
        const minY = Math.min(tl.y, tr.y, bl.y, br.y);
        const maxY = Math.max(tl.y, tr.y, bl.y, br.y);

        if (destX >= minX && destX <= maxX && destY >= minY && destY <= maxY) {
          // Simple inverse bilinear approximation
          const u = (destX - tl.x) / (tr.x - tl.x + 0.001);
          const v = (destY - tl.y) / (bl.y - tl.y + 0.001);

          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            const srcX = gx * cellWidth + u * cellWidth;
            const srcY = gy * cellHeight + v * cellHeight;
            return { x: srcX, y: srcY };
          }
        }
      }
    }

    return { x: destX, y: destY };
  }

  drawGrid() {
    const size = this.settings.gridSize + 1;

    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    this.ctx.lineWidth = 1;

    // Draw horizontal lines
    for (let y = 0; y < size; y++) {
      this.ctx.beginPath();
      for (let x = 0; x < size; x++) {
        const point = this.gridPoints[y * size + x];
        if (x === 0) this.ctx.moveTo(point.x, point.y);
        else this.ctx.lineTo(point.x, point.y);
      }
      this.ctx.stroke();
    }

    // Draw vertical lines
    for (let x = 0; x < size; x++) {
      this.ctx.beginPath();
      for (let y = 0; y < size; y++) {
        const point = this.gridPoints[y * size + x];
        if (y === 0) this.ctx.moveTo(point.x, point.y);
        else this.ctx.lineTo(point.x, point.y);
      }
      this.ctx.stroke();
    }

    // Draw control points
    this.ctx.fillStyle = '#a855f7';
    this.gridPoints.forEach(point => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  download() {
    // Render without grid for download
    const showGrid = this.settings.showGrid;
    this.settings.showGrid = false;
    this.render();

    const link = document.createElement('a');
    link.download = 'warp-grid-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();

    this.settings.showGrid = showGrid;
    this.render();
  }

  reset() {
    if (this.originalImage) {
      this.initGrid();
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WarpGridTool();
});
