class CurvesTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.curveCanvas = document.getElementById('curveCanvas');
    this.curveCtx = this.curveCanvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentChannel = 'rgb';
    this.curves = {
      rgb: this.createDefaultCurve(),
      red: this.createDefaultCurve(),
      green: this.createDefaultCurve(),
      blue: this.createDefaultCurve()
    };
    this.luts = {};
    this.isDragging = false;
    this.selectedPoint = -1;
    this.init();
  }

  createDefaultCurve() {
    return [
      { x: 0, y: 0 },
      { x: 255, y: 255 }
    ];
  }

  init() {
    this.resizeCurveCanvas();
    this.bindEvents();
    this.updateAllLUTs();
    this.drawCurve();
  }

  resizeCurveCanvas() {
    const rect = this.curveCanvas.getBoundingClientRect();
    this.curveCanvas.width = rect.width;
    this.curveCanvas.height = rect.height;
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

    document.querySelectorAll('.channel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentChannel = tab.dataset.channel;
        this.drawCurve();
      });
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    this.curveCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.curveCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.curveCanvas.addEventListener('mouseup', () => this.onMouseUp());
    this.curveCanvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.curveCanvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    window.addEventListener('resize', () => {
      this.resizeCurveCanvas();
      this.drawCurve();
    });
  }

  getMousePos(e) {
    const rect = this.curveCanvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / rect.width * 255),
      y: Math.round(255 - (e.clientY - rect.top) / rect.height * 255)
    };
  }

  onMouseDown(e) {
    const pos = this.getMousePos(e);
    const curve = this.curves[this.currentChannel];

    for (let i = 0; i < curve.length; i++) {
      const dx = Math.abs(curve[i].x - pos.x);
      const dy = Math.abs(curve[i].y - pos.y);
      if (dx < 15 && dy < 15) {
        this.selectedPoint = i;
        this.isDragging = true;
        return;
      }
    }
  }

  onMouseMove(e) {
    if (!this.isDragging || this.selectedPoint < 0) return;

    const pos = this.getMousePos(e);
    const curve = this.curves[this.currentChannel];

    // Clamp values
    pos.x = Math.max(0, Math.min(255, pos.x));
    pos.y = Math.max(0, Math.min(255, pos.y));

    // Don't allow moving first/last point horizontally
    if (this.selectedPoint === 0) {
      pos.x = 0;
    } else if (this.selectedPoint === curve.length - 1) {
      pos.x = 255;
    } else {
      // Keep points ordered
      const prev = curve[this.selectedPoint - 1];
      const next = curve[this.selectedPoint + 1];
      pos.x = Math.max(prev.x + 1, Math.min(next.x - 1, pos.x));
    }

    curve[this.selectedPoint] = pos;
    this.updateLUT(this.currentChannel);
    this.drawCurve();
    this.render();
  }

  onMouseUp() {
    this.isDragging = false;
    this.selectedPoint = -1;
  }

  onDoubleClick(e) {
    const pos = this.getMousePos(e);
    const curve = this.curves[this.currentChannel];

    // Check if clicking on existing point to remove
    for (let i = 1; i < curve.length - 1; i++) {
      const dx = Math.abs(curve[i].x - pos.x);
      const dy = Math.abs(curve[i].y - pos.y);
      if (dx < 15 && dy < 15) {
        curve.splice(i, 1);
        this.updateLUT(this.currentChannel);
        this.drawCurve();
        this.render();
        return;
      }
    }

    // Add new point
    pos.x = Math.max(1, Math.min(254, pos.x));
    pos.y = Math.max(0, Math.min(255, pos.y));

    for (let i = 0; i < curve.length - 1; i++) {
      if (curve[i].x < pos.x && curve[i + 1].x > pos.x) {
        curve.splice(i + 1, 0, pos);
        break;
      }
    }

    this.updateLUT(this.currentChannel);
    this.drawCurve();
    this.render();
  }

  applyPreset(preset) {
    const presets = {
      contrast: [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 192, y: 208 }, { x: 255, y: 255 }],
      fade: [{ x: 0, y: 32 }, { x: 255, y: 224 }],
      bright: [{ x: 0, y: 0 }, { x: 64, y: 96 }, { x: 255, y: 255 }],
      dark: [{ x: 0, y: 0 }, { x: 192, y: 160 }, { x: 255, y: 255 }]
    };

    this.curves[this.currentChannel] = presets[preset].map(p => ({ ...p }));
    this.updateLUT(this.currentChannel);
    this.drawCurve();
    this.render();
  }

  interpolateCurve(curve, x) {
    if (x <= curve[0].x) return curve[0].y;
    if (x >= curve[curve.length - 1].x) return curve[curve.length - 1].y;

    for (let i = 0; i < curve.length - 1; i++) {
      if (x >= curve[i].x && x <= curve[i + 1].x) {
        const t = (x - curve[i].x) / (curve[i + 1].x - curve[i].x);
        return curve[i].y + t * (curve[i + 1].y - curve[i].y);
      }
    }
    return x;
  }

  updateLUT(channel) {
    const lut = new Uint8Array(256);
    const curve = this.curves[channel];
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.max(0, Math.min(255, Math.round(this.interpolateCurve(curve, i))));
    }
    this.luts[channel] = lut;
  }

  updateAllLUTs() {
    ['rgb', 'red', 'green', 'blue'].forEach(ch => this.updateLUT(ch));
  }

  drawCurve() {
    const w = this.curveCanvas.width;
    const h = this.curveCanvas.height;
    const ctx = this.curveCtx;

    ctx.clearRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * i / 4, 0);
      ctx.lineTo(w * i / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, h * i / 4);
      ctx.lineTo(w, h * i / 4);
      ctx.stroke();
    }

    // Draw diagonal
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Draw curve
    const colors = { rgb: '#a855f7', red: '#ef4444', green: '#22c55e', blue: '#3b82f6' };
    ctx.strokeStyle = colors[this.currentChannel];
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= 255; x++) {
      const y = this.interpolateCurve(this.curves[this.currentChannel], x);
      const px = x / 255 * w;
      const py = (1 - y / 255) * h;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw points
    const curve = this.curves[this.currentChannel];
    ctx.fillStyle = colors[this.currentChannel];
    curve.forEach(point => {
      const px = point.x / 255 * w;
      const py = (1 - point.y / 255) * h;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    });
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
        this.resizeCurveCanvas();
        this.drawCurve();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    const rgbLUT = this.luts.rgb;
    const redLUT = this.luts.red;
    const greenLUT = this.luts.green;
    const blueLUT = this.luts.blue;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Apply RGB curve first, then individual channels
      r = redLUT[rgbLUT[r]];
      g = greenLUT[rgbLUT[g]];
      b = blueLUT[rgbLUT[b]];

      outputData.data[i] = r;
      outputData.data[i + 1] = g;
      outputData.data[i + 2] = b;
      outputData.data[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'curves-adjusted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.curves = {
      rgb: this.createDefaultCurve(),
      red: this.createDefaultCurve(),
      green: this.createDefaultCurve(),
      blue: this.createDefaultCurve()
    };
    this.updateAllLUTs();
    this.drawCurve();
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CurvesTool();
});
