/**
 * IMG-029 色彩曲線調整
 * 專業級色彩曲線調整（RGB 各通道）
 */

class CurvesTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.activeChannel = 'rgb';
    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };

    this.lookupTables = {};
    this.selectedPoint = null;
    this.isDragging = false;

    this.presets = {
      linear: { rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }] },
      contrast: { rgb: [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 192, y: 208 }, { x: 255, y: 255 }] },
      brighten: { rgb: [{ x: 0, y: 20 }, { x: 128, y: 148 }, { x: 255, y: 255 }] },
      darken: { rgb: [{ x: 0, y: 0 }, { x: 128, y: 108 }, { x: 255, y: 235 }] },
      film: { rgb: [{ x: 0, y: 20 }, { x: 64, y: 60 }, { x: 192, y: 200 }, { x: 255, y: 240 }] },
      fade: { rgb: [{ x: 0, y: 30 }, { x: 255, y: 225 }] },
      negative: { rgb: [{ x: 0, y: 255 }, { x: 255, y: 0 }] }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.curvePanel = document.getElementById('curvePanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.curveCanvas = document.getElementById('curveCanvas');
    this.ctx = this.curveCanvas.getContext('2d');

    this.channelTabs = document.querySelectorAll('.channel-tab');
    this.presetBtns = document.querySelectorAll('.preset-curve-btn');
    this.resetCurveBtn = document.getElementById('resetCurveBtn');
    this.inputValueEl = document.getElementById('inputValue');
    this.outputValueEl = document.getElementById('outputValue');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
    this.resizeCanvas();
    this.generateLookupTables();
  }

  bindEvents() {
    // File upload
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
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Channel tabs
    this.channelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.channelTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeChannel = tab.dataset.channel;
        this.drawCurve();
      });
    });

    // Presets
    this.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Reset curve
    this.resetCurveBtn.addEventListener('click', () => this.resetCurves());

    // Canvas interactions
    this.curveCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.curveCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.curveCanvas.addEventListener('mouseup', () => this.onMouseUp());
    this.curveCanvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.curveCanvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // Touch events
    this.curveCanvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.curveCanvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.curveCanvas.addEventListener('touchend', () => this.onMouseUp());

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.drawCurve();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyAdjustments());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  resizeCanvas() {
    const rect = this.curveCanvas.getBoundingClientRect();
    this.curveCanvas.width = rect.width * 2;
    this.curveCanvas.height = rect.height * 2;
    this.ctx.scale(2, 2);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;

        this.curvePanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.drawCurve();
        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請編輯曲線');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) return;

    // Reset all curves first
    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };

    // Apply preset to relevant channels
    Object.keys(preset).forEach(channel => {
      this.curves[channel] = JSON.parse(JSON.stringify(preset[channel]));
    });

    this.generateLookupTables();
    this.drawCurve();
    this.updatePreview();
  }

  resetCurves() {
    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };
    this.generateLookupTables();
    this.drawCurve();
    this.updatePreview();
  }

  getCanvasCoords(e) {
    const rect = this.curveCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 255;
    const y = 255 - (e.clientY - rect.top) / rect.height * 255;
    return { x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) };
  }

  onMouseDown(e) {
    const coords = this.getCanvasCoords(e);
    const points = this.curves[this.activeChannel];

    // Check if clicking near existing point
    for (let i = 0; i < points.length; i++) {
      const dist = Math.sqrt(Math.pow(points[i].x - coords.x, 2) + Math.pow(points[i].y - coords.y, 2));
      if (dist < 15) {
        this.selectedPoint = i;
        this.isDragging = true;
        return;
      }
    }

    // Add new point
    const newPoint = { x: Math.round(coords.x), y: Math.round(coords.y) };
    points.push(newPoint);
    points.sort((a, b) => a.x - b.x);
    this.selectedPoint = points.findIndex(p => p.x === newPoint.x && p.y === newPoint.y);
    this.isDragging = true;

    this.generateLookupTables();
    this.drawCurve();
    this.updatePreview();
  }

  onMouseMove(e) {
    const coords = this.getCanvasCoords(e);
    this.inputValueEl.textContent = Math.round(coords.x);
    this.outputValueEl.textContent = Math.round(this.lookupTables[this.activeChannel][Math.round(coords.x)] || coords.y);

    if (!this.isDragging || this.selectedPoint === null) return;

    const points = this.curves[this.activeChannel];

    // Don't move first and last points horizontally
    if (this.selectedPoint === 0) {
      points[0].y = Math.round(coords.y);
    } else if (this.selectedPoint === points.length - 1) {
      points[this.selectedPoint].y = Math.round(coords.y);
    } else {
      // Constrain between neighbors
      const minX = points[this.selectedPoint - 1].x + 1;
      const maxX = points[this.selectedPoint + 1].x - 1;
      points[this.selectedPoint].x = Math.round(Math.max(minX, Math.min(maxX, coords.x)));
      points[this.selectedPoint].y = Math.round(coords.y);
    }

    this.generateLookupTables();
    this.drawCurve();
    this.updatePreview();
  }

  onMouseUp() {
    this.isDragging = false;
    this.selectedPoint = null;
  }

  onDoubleClick(e) {
    const coords = this.getCanvasCoords(e);
    const points = this.curves[this.activeChannel];

    // Find point to delete
    for (let i = 1; i < points.length - 1; i++) {
      const dist = Math.sqrt(Math.pow(points[i].x - coords.x, 2) + Math.pow(points[i].y - coords.y, 2));
      if (dist < 15) {
        points.splice(i, 1);
        this.generateLookupTables();
        this.drawCurve();
        this.updatePreview();
        return;
      }
    }
  }

  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  generateLookupTables() {
    ['rgb', 'red', 'green', 'blue'].forEach(channel => {
      this.lookupTables[channel] = this.interpolateCurve(this.curves[channel]);
    });
  }

  interpolateCurve(points) {
    const lut = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      // Find surrounding points
      let p1 = points[0];
      let p2 = points[points.length - 1];

      for (let j = 0; j < points.length - 1; j++) {
        if (i >= points[j].x && i <= points[j + 1].x) {
          p1 = points[j];
          p2 = points[j + 1];
          break;
        }
      }

      // Linear interpolation
      const t = p2.x === p1.x ? 0 : (i - p1.x) / (p2.x - p1.x);
      lut[i] = Math.max(0, Math.min(255, Math.round(p1.y + t * (p2.y - p1.y))));
    }

    return lut;
  }

  drawCurve() {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w / 4, 0);
      ctx.lineTo(i * w / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * h / 4);
      ctx.lineTo(w, i * h / 4);
      ctx.stroke();
    }

    // Draw diagonal reference
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Draw histogram if image loaded
    if (this.originalImage) {
      this.drawHistogram(ctx, w, h);
    }

    // Draw curve
    const lut = this.lookupTables[this.activeChannel];
    ctx.strokeStyle = this.activeChannel === 'rgb' ? '#fff' :
                      this.activeChannel === 'red' ? '#ff4444' :
                      this.activeChannel === 'green' ? '#44ff44' : '#4444ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = i / 255 * w;
      const y = h - lut[i] / 255 * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw control points
    const points = this.curves[this.activeChannel];
    points.forEach((point, i) => {
      const x = point.x / 255 * w;
      const y = h - point.y / 255 * h;

      ctx.fillStyle = i === this.selectedPoint ? '#00d9ff' : '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  drawHistogram(ctx, w, h) {
    // Get histogram from preview canvas
    const tempCanvas = document.createElement('canvas');
    const tempWidth = Math.min(this.originalImage.naturalWidth, 300);
    const tempHeight = Math.round(tempWidth * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    tempCanvas.width = tempWidth;
    tempCanvas.height = tempHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0, tempWidth, tempHeight);
    const imageData = tempCtx.getImageData(0, 0, tempWidth, tempHeight);

    const hist = new Array(256).fill(0);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      hist[lum]++;
    }

    const maxVal = Math.max(...hist);

    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    for (let i = 0; i < 256; i++) {
      const barHeight = (hist[i] / maxVal) * h * 0.8;
      ctx.fillRect(i / 255 * w, h - barHeight, w / 256 + 1, barHeight);
    }
  }

  updatePreview() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 600);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    this.applyCurves(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyCurves(imageData) {
    const data = imageData.data;
    const rgbLut = this.lookupTables.rgb;
    const rLut = this.lookupTables.red;
    const gLut = this.lookupTables.green;
    const bLut = this.lookupTables.blue;

    for (let i = 0; i < data.length; i += 4) {
      // Apply RGB curve first, then individual channels
      data[i] = rLut[rgbLut[data[i]]];
      data[i + 1] = gLut[rgbLut[data[i + 1]]];
      data[i + 2] = bLut[rgbLut[data[i + 2]]];
    }
  }

  async applyAdjustments() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用曲線調整...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用曲線...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyCurves(imageData);
      ctx.putImageData(imageData, 0, 0);

      this.updateProgress(90, '輸出圖片...');

      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        mimeType = this.originalFile.type;
        ext = this.originalFile.name.split('.').pop();
      } else {
        mimeType = format === 'png' ? 'image/png' :
                   format === 'webp' ? 'image/webp' : 'image/jpeg';
        ext = format;
      }

      const quality = mimeType === 'image/png' ? undefined : 0.92;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.convertedBlob = blob;
      this.outputExt = ext;

      this.updateProgress(100, '完成！');

      this.previewImage.src = URL.createObjectURL(blob);
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', '曲線調整套用完成！');

    } catch (error) {
      this.showStatus('error', `套用失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_curves.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.resetCurves();

    this.fileInput.value = '';
    this.curvePanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';

    this.channelTabs.forEach(t => t.classList.remove('active'));
    this.channelTabs[0].classList.add('active');
    this.activeChannel = 'rgb';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new CurvesTool();
});
