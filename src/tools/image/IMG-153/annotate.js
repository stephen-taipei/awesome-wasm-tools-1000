/**
 * IMG-153 圖片標註工具
 * Image Annotation Tool
 */

class ImageAnnotate {
  constructor() {
    this.originalImage = null;
    this.canvas = null;
    this.ctx = null;
    this.annotations = [];
    this.currentTool = 'arrow';
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    this.settings = {
      strokeWidth: 3,
      strokeColor: '#ef4444',
      fontSize: 24,
      blurSize: 10
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Canvas
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.mainCanvas = document.getElementById('mainCanvas');
    this.ctx = this.mainCanvas.getContext('2d');

    // Toolbar
    this.toolbar = document.getElementById('toolbar');
    this.toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    this.undoBtn = document.getElementById('undoBtn');
    this.clearBtn = document.getElementById('clearBtn');

    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.strokeWidthInput = document.getElementById('strokeWidth');
    this.strokeColorPicker = document.getElementById('strokeColor');
    this.strokeColorValue = document.getElementById('strokeColorValue');
    this.colorPresets = document.querySelectorAll('.color-preset');
    this.textInput = document.getElementById('textInput');
    this.fontSize = document.getElementById('fontSize');
    this.blurSize = document.getElementById('blurSize');
    this.textSettingsGroup = document.getElementById('textSettingsGroup');
    this.fontSizeGroup = document.getElementById('fontSizeGroup');
    this.blurSizeGroup = document.getElementById('blurSizeGroup');

    // Annotations list
    this.annotationsList = document.getElementById('annotationsList');
    this.annotationCount = document.getElementById('annotationCount');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Tool selection
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
      });
    });

    // Settings
    this.strokeWidthInput.addEventListener('input', (e) => {
      this.settings.strokeWidth = parseInt(e.target.value);
    });

    this.strokeColorPicker.addEventListener('input', (e) => {
      this.setColor(e.target.value);
    });

    this.colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        this.setColor(preset.dataset.color);
      });
    });

    this.fontSize.addEventListener('change', (e) => {
      this.settings.fontSize = parseInt(e.target.value);
    });

    this.blurSize.addEventListener('input', (e) => {
      this.settings.blurSize = parseInt(e.target.value);
    });

    // Canvas events
    this.mainCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.mainCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.mainCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.mainCanvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

    // Touch events
    this.mainCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.mainCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.mainCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Buttons
    this.undoBtn.addEventListener('click', () => this.undo());
    this.clearBtn.addEventListener('click', () => this.clearAnnotations());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // Set canvas size
        this.mainCanvas.width = img.width;
        this.mainCanvas.height = img.height;

        // Draw original image
        this.ctx.drawImage(img, 0, 0);

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.canvasWrapper.classList.add('active');
        this.toolbar.style.display = 'flex';
        this.sidebar.style.display = 'flex';
        this.buttonGroup.style.display = 'flex';

        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setTool(tool) {
    this.currentTool = tool;

    this.toolButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // Show/hide tool-specific settings
    this.textSettingsGroup.style.display = tool === 'text' ? 'block' : 'none';
    this.fontSizeGroup.style.display = tool === 'text' ? 'block' : 'none';
    this.blurSizeGroup.style.display = tool === 'blur' ? 'block' : 'none';
  }

  setColor(color) {
    this.settings.strokeColor = color;
    this.strokeColorPicker.value = color;
    this.strokeColorValue.value = color;

    this.colorPresets.forEach(preset => {
      preset.classList.toggle('active', preset.dataset.color === color);
    });
  }

  getCanvasCoords(e) {
    const rect = this.mainCanvas.getBoundingClientRect();
    const scaleX = this.mainCanvas.width / rect.width;
    const scaleY = this.mainCanvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleMouseDown(e) {
    const coords = this.getCanvasCoords(e);
    this.startDrawing(coords.x, coords.y);
  }

  handleMouseMove(e) {
    if (!this.isDrawing) return;
    const coords = this.getCanvasCoords(e);
    this.continueDrawing(coords.x, coords.y);
  }

  handleMouseUp(e) {
    if (!this.isDrawing) return;
    const coords = this.getCanvasCoords(e);
    this.finishDrawing(coords.x, coords.y);
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch);
    this.startDrawing(coords.x, coords.y);
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch);
    this.continueDrawing(coords.x, coords.y);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    this.finishDrawing(this.currentX, this.currentY);
  }

  startDrawing(x, y) {
    this.isDrawing = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;

    if (this.currentTool === 'text') {
      this.addTextAnnotation(x, y);
      this.isDrawing = false;
    }
  }

  continueDrawing(x, y) {
    this.currentX = x;
    this.currentY = y;

    // Redraw canvas with preview
    this.redraw();
    this.drawPreview(x, y);
  }

  finishDrawing(x, y) {
    this.isDrawing = false;

    if (this.currentTool === 'text') return;

    // Create annotation
    const annotation = {
      type: this.currentTool,
      startX: this.startX,
      startY: this.startY,
      endX: x,
      endY: y,
      strokeWidth: this.settings.strokeWidth,
      strokeColor: this.settings.strokeColor,
      blurSize: this.settings.blurSize
    };

    // Skip if too small
    const dist = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
    if (dist < 5 && this.currentTool !== 'blur') return;

    this.annotations.push(annotation);
    this.redraw();
    this.updateAnnotationsList();
  }

  addTextAnnotation(x, y) {
    const text = this.textInput.value.trim();
    if (!text) {
      this.showStatus('請輸入文字內容', 'error');
      return;
    }

    const annotation = {
      type: 'text',
      x: x,
      y: y,
      text: text,
      fontSize: this.settings.fontSize,
      strokeColor: this.settings.strokeColor
    };

    this.annotations.push(annotation);
    this.redraw();
    this.updateAnnotationsList();
  }

  drawPreview(x, y) {
    this.ctx.save();
    this.ctx.strokeStyle = this.settings.strokeColor;
    this.ctx.fillStyle = this.settings.strokeColor;
    this.ctx.lineWidth = this.settings.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (this.currentTool) {
      case 'arrow':
        this.drawArrow(this.startX, this.startY, x, y);
        break;
      case 'rect':
        this.ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
        break;
      case 'circle':
        this.drawEllipse(this.startX, this.startY, x, y);
        break;
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        break;
      case 'highlight':
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
        break;
      case 'blur':
        this.drawBlurPreview(this.startX, this.startY, x, y);
        break;
    }

    this.ctx.restore();
  }

  drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15 + this.settings.strokeWidth * 2;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawEllipse(x1, y1, x2, y2) {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radiusX = Math.abs(x2 - x1) / 2;
    const radiusY = Math.abs(y2 - y1) / 2;

    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawBlurPreview(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (width < 5 || height < 5) return;

    // Draw outline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(minX, minY, width, height);
    this.ctx.setLineDash([]);
  }

  applyBlur(x1, y1, x2, y2, blurSize) {
    const minX = Math.floor(Math.min(x1, x2));
    const minY = Math.floor(Math.min(y1, y2));
    const width = Math.floor(Math.abs(x2 - x1));
    const height = Math.floor(Math.abs(y2 - y1));

    if (width < 5 || height < 5) return;

    const imageData = this.ctx.getImageData(minX, minY, width, height);
    const data = imageData.data;

    // Pixelate effect
    for (let y = 0; y < height; y += blurSize) {
      for (let x = 0; x < width; x += blurSize) {
        // Get average color of block
        let r = 0, g = 0, b = 0, count = 0;

        for (let dy = 0; dy < blurSize && y + dy < height; dy++) {
          for (let dx = 0; dx < blurSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Apply average color to block
        for (let dy = 0; dy < blurSize && y + dy < height; dy++) {
          for (let dx = 0; dx < blurSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, minX, minY);
  }

  redraw() {
    // Draw original image
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Draw all annotations
    this.annotations.forEach(ann => {
      this.drawAnnotation(ann);
    });
  }

  drawAnnotation(ann) {
    this.ctx.save();
    this.ctx.strokeStyle = ann.strokeColor;
    this.ctx.fillStyle = ann.strokeColor;
    this.ctx.lineWidth = ann.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (ann.type) {
      case 'arrow':
        this.drawArrow(ann.startX, ann.startY, ann.endX, ann.endY);
        break;
      case 'rect':
        this.ctx.strokeRect(ann.startX, ann.startY, ann.endX - ann.startX, ann.endY - ann.startY);
        break;
      case 'circle':
        this.drawEllipse(ann.startX, ann.startY, ann.endX, ann.endY);
        break;
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(ann.startX, ann.startY);
        this.ctx.lineTo(ann.endX, ann.endY);
        this.ctx.stroke();
        break;
      case 'highlight':
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillRect(ann.startX, ann.startY, ann.endX - ann.startX, ann.endY - ann.startY);
        break;
      case 'blur':
        this.applyBlur(ann.startX, ann.startY, ann.endX, ann.endY, ann.blurSize);
        break;
      case 'text':
        this.ctx.font = `bold ${ann.fontSize}px sans-serif`;
        this.ctx.fillText(ann.text, ann.x, ann.y);
        break;
    }

    this.ctx.restore();
  }

  updateAnnotationsList() {
    const typeIcons = {
      arrow: '➡️',
      rect: '⬜',
      circle: '⭕',
      line: '📏',
      text: '🔤',
      highlight: '🖍️',
      blur: '🌫️'
    };

    const typeNames = {
      arrow: '箭頭',
      rect: '矩形',
      circle: '圓形',
      line: '直線',
      text: '文字',
      highlight: '螢光筆',
      blur: '馬賽克'
    };

    this.annotationsList.innerHTML = this.annotations.map((ann, index) => `
      <div class="annotation-item">
        <span class="annotation-type">${typeIcons[ann.type]}</span>
        <span class="annotation-info">${typeNames[ann.type]}${ann.type === 'text' ? ': ' + ann.text : ''}</span>
        <button class="annotation-delete" data-index="${index}">&times;</button>
      </div>
    `).join('');

    this.annotationCount.textContent = this.annotations.length;

    // Bind delete buttons
    this.annotationsList.querySelectorAll('.annotation-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteAnnotation(parseInt(btn.dataset.index));
      });
    });
  }

  deleteAnnotation(index) {
    this.annotations.splice(index, 1);
    this.redraw();
    this.updateAnnotationsList();
  }

  undo() {
    if (this.annotations.length === 0) return;
    this.annotations.pop();
    this.redraw();
    this.updateAnnotationsList();
    this.showStatus('已復原', 'success');
  }

  clearAnnotations() {
    if (this.annotations.length === 0) return;
    this.annotations = [];
    this.redraw();
    this.updateAnnotationsList();
    this.showStatus('已清除所有標註', 'success');
  }

  download() {
    const link = document.createElement('a');
    link.download = `annotated_${Date.now()}.png`;
    link.href = this.mainCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.annotations = [];

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.canvasWrapper.classList.remove('active');
    this.toolbar.style.display = 'none';
    this.sidebar.style.display = 'none';
    this.buttonGroup.style.display = 'none';
    this.fileInput.value = '';

    // Clear canvas
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    // Reset settings
    this.setTool('arrow');
    this.setColor('#ef4444');
    this.strokeWidthInput.value = 3;
    this.settings.strokeWidth = 3;
    this.textInput.value = '';

    this.updateAnnotationsList();
    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageAnnotate();
});
