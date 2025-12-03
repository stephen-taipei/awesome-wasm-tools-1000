/**
 * IMG-090 馬克筆高亮
 * 在圖片上添加螢光筆高亮效果
 */

class HighlightTool {
  constructor() {
    this.sourceImage = null;
    this.highlightColor = '#ffff00';
    this.brushSize = 30;
    this.brushOpacity = 40;

    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorLayout = document.getElementById('editorLayout');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.colorGrid = document.getElementById('colorGrid');
    this.brushSizeSlider = document.getElementById('brushSize');
    this.brushSizeValue = document.getElementById('brushSizeValue');
    this.brushOpacitySlider = document.getElementById('brushOpacity');
    this.brushOpacityValue = document.getElementById('brushOpacityValue');
    this.brushSample = document.getElementById('brushSample');

    this.undoBtn = document.getElementById('undoBtn');
    this.clearBtn = document.getElementById('clearBtn');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.updateBrushPreview();
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

    // Color selection
    this.colorGrid.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-btn')) {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.highlightColor = e.target.dataset.color;
        this.updateBrushPreview();
      }
    });

    // Brush size
    this.brushSizeSlider.addEventListener('input', () => {
      this.brushSize = parseInt(this.brushSizeSlider.value);
      this.brushSizeValue.textContent = this.brushSize + ' px';
      this.updateBrushPreview();
    });

    // Opacity
    this.brushOpacitySlider.addEventListener('input', () => {
      this.brushOpacity = parseInt(this.brushOpacitySlider.value);
      this.brushOpacityValue.textContent = this.brushOpacity + '%';
      this.updateBrushPreview();
    });

    // Canvas drawing
    this.previewCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.previewCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.previewCanvas.addEventListener('mouseup', () => this.onMouseUp());
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

  updateBrushPreview() {
    const opacity = this.brushOpacity / 100;
    const color = this.hexToRgba(this.highlightColor, opacity);
    this.brushSample.style.background = color;
    this.brushSample.style.width = Math.min(this.brushSize * 3, 200) + 'px';
    this.brushSample.style.height = Math.min(this.brushSize, 40) + 'px';
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

    this.isDrawing = true;
    const coords = this.getCanvasCoords(e);

    this.currentStroke = {
      color: this.highlightColor,
      size: this.brushSize,
      opacity: this.brushOpacity,
      points: [coords]
    };
  }

  onMouseMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;

    const coords = this.getCanvasCoords(e);
    this.currentStroke.points.push(coords);
    this.render();
  }

  onMouseUp() {
    if (this.isDrawing && this.currentStroke && this.currentStroke.points.length > 1) {
      this.strokes.push(this.currentStroke);
    }
    this.isDrawing = false;
    this.currentStroke = null;
    this.render();
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
        this.strokes = [];
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

    // Set multiply blend mode for highlighter effect
    ctx.globalCompositeOperation = 'multiply';

    // Draw all strokes
    const allStrokes = [...this.strokes];
    if (this.currentStroke) {
      allStrokes.push(this.currentStroke);
    }

    allStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = this.hexToRgba(stroke.color, stroke.opacity / 100);
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];

        // Use quadratic curves for smoother lines
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }

      // Draw to the last point
      const lastPoint = stroke.points[stroke.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    this.previewInfo.textContent = `${width} × ${height} px | ${this.strokes.length} 筆高亮`;
  }

  undo() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
      this.render();
    }
  }

  clearAll() {
    this.strokes = [];
    this.render();
  }

  download() {
    this.previewCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `highlighted_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.strokes = [];
    this.currentStroke = null;
    this.highlightColor = '#ffff00';
    this.brushSize = 30;
    this.brushOpacity = 40;

    this.uploadArea.style.display = 'block';
    this.editorLayout.classList.remove('active');
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === '#ffff00');
    });

    this.brushSizeSlider.value = 30;
    this.brushSizeValue.textContent = '30 px';
    this.brushOpacitySlider.value = 40;
    this.brushOpacityValue.textContent = '40%';

    this.updateBrushPreview();
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
  new HighlightTool();
});
