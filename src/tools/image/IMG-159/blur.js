/**
 * IMG-159 圖片模糊工具
 * Image Blur Tool
 */

class ImageBlur {
  constructor() {
    this.originalImage = null;
    this.scale = 1;
    this.history = [];

    this.settings = {
      mode: 'full',
      blurType: 'gaussian',
      blurIntensity: 10,
      motionAngle: 0,
      brushType: 'blur',
      brushSize: 30,
      brushIntensity: 15
    };

    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Editor
    this.editorSection = document.getElementById('editorSection');
    this.previewArea = document.getElementById('previewArea');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.blurCanvas = document.getElementById('blurCanvas');
    this.blurCtx = this.blurCanvas.getContext('2d');
    this.brushCursor = document.getElementById('brushCursor');

    // Mode tabs
    this.modeTabs = document.querySelectorAll('.mode-tab');
    this.fullSettings = document.getElementById('fullSettings');
    this.brushSettings = document.getElementById('brushSettings');

    // Full mode settings
    this.blurTypeSelect = document.getElementById('blurType');
    this.blurIntensitySlider = document.getElementById('blurIntensity');
    this.blurIntensityValue = document.getElementById('blurIntensityValue');
    this.motionAngleGroup = document.getElementById('motionAngleGroup');
    this.motionAngleSlider = document.getElementById('motionAngle');
    this.motionAngleValue = document.getElementById('motionAngleValue');

    // Brush mode settings
    this.brushTypeSelect = document.getElementById('brushType');
    this.brushSizeSlider = document.getElementById('brushSize');
    this.brushSizeValue = document.getElementById('brushSizeValue');
    this.brushIntensitySlider = document.getElementById('brushIntensity');
    this.brushIntensityValue = document.getElementById('brushIntensityValue');
    this.undoBtn = document.getElementById('undoBtn');
    this.clearBtn = document.getElementById('clearBtn');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.applyBtn = document.getElementById('applyBtn');
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

    // Mode tabs
    this.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.setMode(tab.dataset.mode));
    });

    // Full mode settings
    this.blurTypeSelect.addEventListener('change', (e) => {
      this.settings.blurType = e.target.value;
      this.motionAngleGroup.style.display = e.target.value === 'motion' ? 'block' : 'none';
      this.updatePreview();
    });

    this.blurIntensitySlider.addEventListener('input', (e) => {
      this.settings.blurIntensity = parseInt(e.target.value);
      this.blurIntensityValue.textContent = this.settings.blurIntensity;
      this.updatePreview();
    });

    this.motionAngleSlider.addEventListener('input', (e) => {
      this.settings.motionAngle = parseInt(e.target.value);
      this.motionAngleValue.textContent = `${this.settings.motionAngle}°`;
      this.updatePreview();
    });

    // Brush mode settings
    this.brushTypeSelect.addEventListener('change', (e) => {
      this.settings.brushType = e.target.value;
    });

    this.brushSizeSlider.addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      this.brushSizeValue.textContent = `${this.settings.brushSize}px`;
      this.updateBrushCursor();
    });

    this.brushIntensitySlider.addEventListener('input', (e) => {
      this.settings.brushIntensity = parseInt(e.target.value);
      this.brushIntensityValue.textContent = this.settings.brushIntensity;
    });

    // Brush canvas events
    this.blurCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.blurCanvas.addEventListener('mousemove', (e) => this.draw(e));
    this.blurCanvas.addEventListener('mouseup', () => this.stopDrawing());
    this.blurCanvas.addEventListener('mouseleave', () => this.stopDrawing());

    // Touch events
    this.blurCanvas.addEventListener('touchstart', (e) => this.startDrawing(e));
    this.blurCanvas.addEventListener('touchmove', (e) => this.draw(e));
    this.blurCanvas.addEventListener('touchend', () => this.stopDrawing());

    // Brush cursor
    this.canvasWrapper.addEventListener('mouseenter', () => {
      if (this.settings.mode === 'brush') {
        this.brushCursor.style.display = 'block';
      }
    });

    this.canvasWrapper.addEventListener('mouseleave', () => {
      this.brushCursor.style.display = 'none';
    });

    this.canvasWrapper.addEventListener('mousemove', (e) => {
      if (this.settings.mode === 'brush') {
        const rect = this.canvasWrapper.getBoundingClientRect();
        this.brushCursor.style.left = `${e.clientX - rect.left}px`;
        this.brushCursor.style.top = `${e.clientY - rect.top}px`;
      }
    });

    // Brush actions
    this.undoBtn.addEventListener('click', () => this.undo());
    this.clearBtn.addEventListener('click', () => this.clearBrush());

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyBlur());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
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

        // Calculate scale
        const maxWidth = 800;
        const maxHeight = 600;
        this.scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);

        // Set canvas sizes
        this.previewCanvas.width = img.width * this.scale;
        this.previewCanvas.height = img.height * this.scale;
        this.blurCanvas.width = this.previewCanvas.width;
        this.blurCanvas.height = this.previewCanvas.height;

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.editorSection.classList.add('active');
        this.buttonGroup.style.display = 'flex';

        this.history = [];
        this.updatePreview();
        this.updateBrushCursor();
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setMode(mode) {
    this.settings.mode = mode;
    this.modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    this.fullSettings.style.display = mode === 'full' ? 'block' : 'none';
    this.brushSettings.style.display = mode === 'brush' ? 'block' : 'none';
    this.brushCursor.style.display = mode === 'brush' ? 'block' : 'none';

    // Reset blur canvas for brush mode
    if (mode === 'brush') {
      this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);
      this.previewCtx.drawImage(this.originalImage, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
    } else {
      this.updatePreview();
    }
  }

  updateBrushCursor() {
    const size = this.settings.brushSize;
    this.brushCursor.style.width = `${size}px`;
    this.brushCursor.style.height = `${size}px`;
  }

  updatePreview() {
    if (!this.originalImage || this.settings.mode === 'brush') return;

    // Draw original image
    this.previewCtx.drawImage(this.originalImage, 0, 0, this.previewCanvas.width, this.previewCanvas.height);

    // Apply blur effect
    this.applyBlurEffect(this.previewCtx, this.previewCanvas.width, this.previewCanvas.height);
  }

  applyBlurEffect(ctx, width, height, area = null) {
    const intensity = this.settings.blurIntensity;
    const type = this.settings.mode === 'brush' ? this.settings.brushType : this.settings.blurType;

    const x = area ? area.x : 0;
    const y = area ? area.y : 0;
    const w = area ? area.width : width;
    const h = area ? area.height : height;

    switch (type) {
      case 'gaussian':
      case 'blur':
        this.applyGaussianBlur(ctx, x, y, w, h, intensity);
        break;
      case 'motion':
        this.applyMotionBlur(ctx, x, y, w, h, intensity);
        break;
      case 'radial':
        this.applyRadialBlur(ctx, width, height, intensity);
        break;
      case 'mosaic':
        this.applyMosaic(ctx, x, y, w, h, intensity);
        break;
      case 'pixelate':
        this.applyPixelate(ctx, x, y, w, h, intensity);
        break;
    }
  }

  applyGaussianBlur(ctx, x, y, w, h, intensity) {
    ctx.save();
    ctx.filter = `blur(${intensity}px)`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.drawImage(tempCanvas, x, y, w, h, x, y, w, h);
    ctx.restore();
  }

  applyMotionBlur(ctx, x, y, w, h, intensity) {
    const angle = this.settings.motionAngle * Math.PI / 180;
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    const result = new Uint8ClampedArray(data);

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = -intensity; i <= intensity; i++) {
          const sx = Math.round(px + dx * i);
          const sy = Math.round(py + dy * i);

          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const idx = (sy * w + sx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        const idx = (py * w + px) * 4;
        result[idx] = r / count;
        result[idx + 1] = g / count;
        result[idx + 2] = b / count;
        result[idx + 3] = data[idx + 3];
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = result[i];
    }

    ctx.putImageData(imageData, x, y);
  }

  applyRadialBlur(ctx, width, height, intensity) {
    const centerX = width / 2;
    const centerY = height / 2;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const result = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const blur = Math.min(intensity, distance / 20);

        let r = 0, g = 0, b = 0, count = 0;

        for (let i = -blur; i <= blur; i++) {
          const angle = Math.atan2(dy, dx);
          const sx = Math.round(x + Math.cos(angle) * i);
          const sy = Math.round(y + Math.sin(angle) * i);

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = (sy * width + sx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        if (count > 0) {
          const idx = (y * width + x) * 4;
          result[idx] = r / count;
          result[idx + 1] = g / count;
          result[idx + 2] = b / count;
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = result[i];
    }

    ctx.putImageData(imageData, 0, 0);
  }

  applyMosaic(ctx, x, y, w, h, blockSize) {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;

        // Calculate average color
        for (let py = by; py < by + blockSize && py < h; py++) {
          for (let px = bx; px < bx + blockSize && px < w; px++) {
            const idx = (py * w + px) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Apply average color to block
        for (let py = by; py < by + blockSize && py < h; py++) {
          for (let px = bx; px < bx + blockSize && px < w; px++) {
            const idx = (py * w + px) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, x, y);
  }

  applyPixelate(ctx, x, y, w, h, pixelSize) {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        // Get center pixel color
        const centerX = Math.min(px + Math.floor(pixelSize / 2), w - 1);
        const centerY = Math.min(py + Math.floor(pixelSize / 2), h - 1);
        const centerIdx = (centerY * w + centerX) * 4;

        const r = data[centerIdx];
        const g = data[centerIdx + 1];
        const b = data[centerIdx + 2];

        // Apply to block
        for (let y2 = py; y2 < py + pixelSize && y2 < h; y2++) {
          for (let x2 = px; x2 < px + pixelSize && x2 < w; x2++) {
            const idx = (y2 * w + x2) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, x, y);
  }

  startDrawing(e) {
    if (this.settings.mode !== 'brush') return;

    this.isDrawing = true;
    const pos = this.getEventPos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;

    // Save state for undo
    this.saveState();

    this.applyBrushAt(pos.x, pos.y);
  }

  draw(e) {
    if (!this.isDrawing || this.settings.mode !== 'brush') return;

    const pos = this.getEventPos(e);

    // Draw line from last position to current
    const dx = pos.x - this.lastX;
    const dy = pos.y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const step = this.settings.brushSize / 4;

    for (let i = 0; i < distance; i += step) {
      const x = this.lastX + (dx * i) / distance;
      const y = this.lastY + (dy * i) / distance;
      this.applyBrushAt(x, y);
    }

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  getEventPos(e) {
    const rect = this.blurCanvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  applyBrushAt(x, y) {
    const size = this.settings.brushSize;
    const halfSize = size / 2;

    const startX = Math.max(0, Math.round(x - halfSize));
    const startY = Math.max(0, Math.round(y - halfSize));
    const endX = Math.min(this.previewCanvas.width, Math.round(x + halfSize));
    const endY = Math.min(this.previewCanvas.height, Math.round(y + halfSize));

    const w = endX - startX;
    const h = endY - startY;

    if (w <= 0 || h <= 0) return;

    // Get original image data for the area
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw from original image
    tempCtx.drawImage(
      this.originalImage,
      startX / this.scale, startY / this.scale,
      w / this.scale, h / this.scale,
      0, 0, w, h
    );

    // Apply blur effect
    const intensity = this.settings.brushIntensity;
    switch (this.settings.brushType) {
      case 'blur':
        tempCtx.filter = `blur(${intensity}px)`;
        tempCtx.drawImage(tempCanvas, 0, 0);
        tempCtx.filter = 'none';
        break;
      case 'mosaic':
        this.applyMosaic(tempCtx, 0, 0, w, h, intensity);
        break;
      case 'pixelate':
        this.applyPixelate(tempCtx, 0, 0, w, h, intensity);
        break;
    }

    // Draw circular mask
    this.previewCtx.save();
    this.previewCtx.beginPath();
    this.previewCtx.arc(x, y, halfSize, 0, Math.PI * 2);
    this.previewCtx.clip();
    this.previewCtx.drawImage(tempCanvas, startX, startY);
    this.previewCtx.restore();
  }

  saveState() {
    const imageData = this.previewCtx.getImageData(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.history.push(imageData);

    // Limit history size
    if (this.history.length > 20) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) {
      this.showStatus('沒有可撤銷的操作', 'error');
      return;
    }

    const imageData = this.history.pop();
    this.previewCtx.putImageData(imageData, 0, 0);
    this.showStatus('已撤銷', 'success');
  }

  clearBrush() {
    this.history = [];
    this.previewCtx.drawImage(this.originalImage, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.showStatus('已清除所有筆刷效果', 'success');
  }

  applyBlur() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Create full resolution canvas
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = this.originalImage.width;
    fullCanvas.height = this.originalImage.height;
    const fullCtx = fullCanvas.getContext('2d');

    if (this.settings.mode === 'full') {
      // Draw original image
      fullCtx.drawImage(this.originalImage, 0, 0);

      // Apply blur at full resolution
      const scaledIntensity = this.settings.blurIntensity / this.scale;
      const oldIntensity = this.settings.blurIntensity;
      this.settings.blurIntensity = scaledIntensity;
      this.applyBlurEffect(fullCtx, fullCanvas.width, fullCanvas.height);
      this.settings.blurIntensity = oldIntensity;
    } else {
      // For brush mode, scale up the preview canvas
      fullCtx.drawImage(this.previewCanvas, 0, 0, fullCanvas.width, fullCanvas.height);
    }

    // Store result
    this.resultDataUrl = fullCanvas.toDataURL('image/png');
    this.downloadBtn.disabled = false;

    this.showStatus('效果套用成功！', 'success');
  }

  downloadImage() {
    if (!this.resultDataUrl) {
      this.showStatus('請先套用效果', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = `blurred_${Date.now()}.png`;
    link.href = this.resultDataUrl;
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.originalImage = null;
    this.resultDataUrl = null;
    this.history = [];

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.editorSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset settings
    this.settings = {
      mode: 'full',
      blurType: 'gaussian',
      blurIntensity: 10,
      motionAngle: 0,
      brushType: 'blur',
      brushSize: 30,
      brushIntensity: 15
    };

    this.blurTypeSelect.value = 'gaussian';
    this.blurIntensitySlider.value = 10;
    this.blurIntensityValue.textContent = '10';
    this.motionAngleSlider.value = 0;
    this.motionAngleValue.textContent = '0°';
    this.motionAngleGroup.style.display = 'none';
    this.brushTypeSelect.value = 'blur';
    this.brushSizeSlider.value = 30;
    this.brushSizeValue.textContent = '30px';
    this.brushIntensitySlider.value = 15;
    this.brushIntensityValue.textContent = '15';

    // Reset mode tabs
    this.setMode('full');

    // Clear canvases
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);

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
  new ImageBlur();
});
