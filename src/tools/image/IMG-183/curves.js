/**
 * IMG-183 圖片曲線工具
 */
class CurvesTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.curveCanvas = document.getElementById('curveCanvas');
    this.curveCtx = this.curveCanvas.getContext('2d');
    this.gridCanvas = document.getElementById('curveGrid');
    this.gridCtx = this.gridCanvas.getContext('2d');
    this.points = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    this.draggingPoint = null;
    this.lut = this.buildLUT();
    this.init();
  }

  init() {
    this.drawGrid();
    this.bindEvents();
  }

  drawGrid() {
    const ctx = this.gridCtx;
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = i * 64;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(256, pos); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(256, 0); ctx.stroke();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    this.curveCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.curveCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.curveCanvas.addEventListener('mouseup', () => this.onMouseUp());
    this.curveCanvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.curveCanvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  getMousePos(e) {
    const rect = this.curveCanvas.getBoundingClientRect();
    return { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
  }

  onMouseDown(e) {
    const pos = this.getMousePos(e);
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (Math.abs(p.x - pos.x) < 10 && Math.abs((255 - p.y) - pos.y) < 10) {
        this.draggingPoint = i;
        return;
      }
    }
    // Add new point
    const newPoint = { x: pos.x, y: 255 - pos.y };
    this.points.push(newPoint);
    this.points.sort((a, b) => a.x - b.x);
    this.draggingPoint = this.points.indexOf(newPoint);
    this.updateCurve();
  }

  onMouseMove(e) {
    if (this.draggingPoint === null) return;
    const pos = this.getMousePos(e);
    const p = this.points[this.draggingPoint];
    if (this.draggingPoint === 0) {
      p.x = 0;
    } else if (this.draggingPoint === this.points.length - 1) {
      p.x = 255;
    } else {
      p.x = Math.max(1, Math.min(254, pos.x));
    }
    p.y = Math.max(0, Math.min(255, 255 - pos.y));
    this.points.sort((a, b) => a.x - b.x);
    this.updateCurve();
  }

  onMouseUp() { this.draggingPoint = null; }

  onDoubleClick(e) {
    const pos = this.getMousePos(e);
    for (let i = 1; i < this.points.length - 1; i++) {
      const p = this.points[i];
      if (Math.abs(p.x - pos.x) < 10 && Math.abs((255 - p.y) - pos.y) < 10) {
        this.points.splice(i, 1);
        this.updateCurve();
        return;
      }
    }
  }

  applyPreset(preset) {
    switch (preset) {
      case 'linear': this.points = [{ x: 0, y: 0 }, { x: 255, y: 255 }]; break;
      case 'contrast': this.points = [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 192, y: 208 }, { x: 255, y: 255 }]; break;
      case 'brighten': this.points = [{ x: 0, y: 0 }, { x: 128, y: 160 }, { x: 255, y: 255 }]; break;
      case 'darken': this.points = [{ x: 0, y: 0 }, { x: 128, y: 96 }, { x: 255, y: 255 }]; break;
      case 'sshape': this.points = [{ x: 0, y: 0 }, { x: 64, y: 48 }, { x: 128, y: 128 }, { x: 192, y: 208 }, { x: 255, y: 255 }]; break;
    }
    this.updateCurve();
  }

  buildLUT() {
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = this.interpolate(i);
    }
    return lut;
  }

  interpolate(x) {
    if (x <= this.points[0].x) return this.points[0].y;
    if (x >= this.points[this.points.length - 1].x) return this.points[this.points.length - 1].y;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i], p2 = this.points[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return Math.round(p1.y + t * (p2.y - p1.y));
      }
    }
    return x;
  }

  drawCurve() {
    const ctx = this.curveCtx;
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 256; x++) {
      const y = 255 - this.lut[x];
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#fff';
    this.points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, 255 - p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  updateCurve() {
    this.lut = this.buildLUT();
    this.drawCurve();
    this.render();
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.points = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
        this.lut = this.buildLUT();
        this.drawCurve();
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.lut[data[i]];
      data[i + 1] = this.lut[data[i + 1]];
      data[i + 2] = this.lut[data[i + 2]];
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.points = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    this.lut = this.buildLUT();
    this.drawCurve();
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `curves_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new CurvesTool());
