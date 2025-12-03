/**
 * IMG-089 箭頭/標註繪製
 * 在圖片上繪製箭頭、框線、標註
 */

class AnnotationTool {
  constructor() {
    this.sourceImage = null;
    this.currentTool = 'arrow';
    this.strokeColor = '#ff0000';
    this.lineWidth = 3;
    this.arrowSize = 20;
    this.numberSize = 30;
    this.currentNumber = 1;

    this.drawings = [];
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorLayout = document.getElementById('editorLayout');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.strokeColorPicker = document.getElementById('strokeColor');
    this.lineWidthSlider = document.getElementById('lineWidth');
    this.lineWidthValue = document.getElementById('lineWidthValue');
    this.arrowSizeSlider = document.getElementById('arrowSize');
    this.arrowSizeValue = document.getElementById('arrowSizeValue');
    this.numberSizeSlider = document.getElementById('numberSize');
    this.numberSizeValue = document.getElementById('numberSizeValue');

    this.undoBtn = document.getElementById('undoBtn');
    this.clearBtn = document.getElementById('clearBtn');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Tool selection
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
      });
    });

    // Settings
    this.strokeColorPicker.addEventListener('input', () => {
      this.strokeColor = this.strokeColorPicker.value;
    });

    this.lineWidthSlider.addEventListener('input', () => {
      this.lineWidth = parseInt(this.lineWidthSlider.value);
      this.lineWidthValue.textContent = this.lineWidth + ' px';
    });

    this.arrowSizeSlider.addEventListener('input', () => {
      this.arrowSize = parseInt(this.arrowSizeSlider.value);
      this.arrowSizeValue.textContent = this.arrowSize + ' px';
    });

    this.numberSizeSlider.addEventListener('input', () => {
      this.numberSize = parseInt(this.numberSizeSlider.value);
      this.numberSizeValue.textContent = this.numberSize + ' px';
    });

    // Canvas drawing
    this.previewCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.previewCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.previewCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.previewCanvas.addEventListener('mouseleave', () => this.onMouseUp());

    // Touch support
    this.previewCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.previewCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.previewCanvas.addEventListener('touchend', () => this.onMouseUp());

    // Action buttons
    this.undoBtn.addEventListener('click', () => this.undo());
    this.clearBtn.addEventListener('click', () => this.clearAll());

    // Main buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  getCanvasCoords(e) {
    const rect = this.previewCanvas.getBoundingClientRect();
    const scaleX = this.previewCanvas.width / rect.width;
    const scaleY = this.previewCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  onMouseDown(e) {
    if (!this.sourceImage) return;

    const coords = this.getCanvasCoords(e);
    this.startX = coords.x;
    this.startY = coords.y;

    if (this.currentTool === 'number') {
      // Place number immediately on click
      this.drawings.push({
        type: 'number',
        x: coords.x,
        y: coords.y,
        number: this.currentNumber,
        size: this.numberSize,
        color: this.strokeColor
      });
      this.currentNumber++;
      this.render();
    } else {
      this.isDrawing = true;
    }
  }

  onMouseMove(e) {
    if (!this.isDrawing || !this.sourceImage) return;

    const coords = this.getCanvasCoords(e);
    this.render();
    this.drawShape(this.startX, this.startY, coords.x, coords.y, true);
  }

  onMouseUp(e) {
    if (!this.isDrawing || !this.sourceImage) return;

    if (e) {
      const coords = this.getCanvasCoords(e);
      const dx = coords.x - this.startX;
      const dy = coords.y - this.startY;

      // Only add if there's actual movement
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.drawings.push({
          type: this.currentTool,
          x1: this.startX,
          y1: this.startY,
          x2: coords.x,
          y2: coords.y,
          color: this.strokeColor,
          lineWidth: this.lineWidth,
          arrowSize: this.arrowSize
        });
      }
    }

    this.isDrawing = false;
    this.render();
  }

  drawShape(x1, y1, x2, y2, isPreview = false) {
    const ctx = this.previewCtx;
    ctx.strokeStyle = this.strokeColor;
    ctx.fillStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (this.currentTool) {
      case 'arrow':
        this.drawArrow(ctx, x1, y1, x2, y2);
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
      case 'rect':
        ctx.beginPath();
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'ellipse':
        const rx = Math.abs(x2 - x1);
        const ry = Math.abs(y2 - y1);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx / 2, ry / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  drawArrow(ctx, x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = this.arrowSize;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - size * Math.cos(angle - Math.PI / 6),
      y2 - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - size * Math.cos(angle + Math.PI / 6),
      y2 - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  drawNumber(ctx, x, y, number, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), x, y);
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.drawings = [];
        this.currentNumber = 1;
        this.uploadArea.style.display = 'none';
        this.editorLayout.classList.add('active');
        this.downloadBtn.disabled = false;

        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    const ctx = this.previewCtx;

    // Draw source image
    ctx.drawImage(this.sourceImage, 0, 0);

    // Draw all saved shapes
    this.drawings.forEach(d => {
      if (d.type === 'number') {
        this.drawNumber(ctx, d.x, d.y, d.number, d.size, d.color);
      } else {
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineWidth = d.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (d.type) {
          case 'arrow':
            this.arrowSize = d.arrowSize;
            this.drawArrow(ctx, d.x1, d.y1, d.x2, d.y2);
            break;
          case 'line':
            ctx.beginPath();
            ctx.moveTo(d.x1, d.y1);
            ctx.lineTo(d.x2, d.y2);
            ctx.stroke();
            break;
          case 'rect':
            ctx.beginPath();
            ctx.strokeRect(d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1);
            break;
          case 'circle':
            const radius = Math.sqrt(Math.pow(d.x2 - d.x1, 2) + Math.pow(d.y2 - d.y1, 2));
            ctx.beginPath();
            ctx.arc(d.x1, d.y1, radius, 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'ellipse':
            const rx = Math.abs(d.x2 - d.x1);
            const ry = Math.abs(d.y2 - d.y1);
            const cx = (d.x1 + d.x2) / 2;
            const cy = (d.y1 + d.y2) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx / 2, ry / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
      }
    });

    // Restore current arrowSize
    this.arrowSize = parseInt(this.arrowSizeSlider.value);

    this.previewInfo.textContent = `${width} × ${height} px | ${this.drawings.length} 個標註`;
  }

  undo() {
    if (this.drawings.length > 0) {
      const removed = this.drawings.pop();
      if (removed.type === 'number') {
        this.currentNumber = Math.max(1, this.currentNumber - 1);
      }
      this.render();
    }
  }

  clearAll() {
    this.drawings = [];
    this.currentNumber = 1;
    this.render();
  }

  download() {
    this.previewCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `annotated_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.drawings = [];
    this.currentNumber = 1;
    this.currentTool = 'arrow';
    this.strokeColor = '#ff0000';
    this.lineWidth = 3;
    this.arrowSize = 20;
    this.numberSize = 30;

    this.uploadArea.style.display = 'block';
    this.editorLayout.classList.remove('active');
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === 'arrow');
    });

    this.strokeColorPicker.value = '#ff0000';
    this.lineWidthSlider.value = 3;
    this.lineWidthValue.textContent = '3 px';
    this.arrowSizeSlider.value = 20;
    this.arrowSizeValue.textContent = '20 px';
    this.numberSizeSlider.value = 30;
    this.numberSizeValue.textContent = '30 px';

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewInfo.textContent = '';
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AnnotationTool();
});
