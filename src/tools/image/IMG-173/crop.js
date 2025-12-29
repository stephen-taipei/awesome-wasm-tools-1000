/**
 * IMG-173 圖片裁切工具
 */
class CropTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = document.getElementById('cropOverlay');
    this.overlayCtx = this.overlay.getContext('2d');
    this.selection = null;
    this.isSelecting = false;
    this.startX = 0; this.startY = 0;
    this.ratio = null;
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

    this.overlay.addEventListener('mousedown', (e) => this.startSelection(e));
    this.overlay.addEventListener('mousemove', (e) => this.updateSelection(e));
    this.overlay.addEventListener('mouseup', () => this.endSelection());
    this.overlay.addEventListener('mouseleave', () => this.endSelection());

    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const r = btn.dataset.ratio;
        if (r === 'free') { this.ratio = null; }
        else { const [w, h] = r.split(':').map(Number); this.ratio = w / h; }
        this.clearSelection();
      });
    });

    document.getElementById('cropBtn').addEventListener('click', () => this.crop());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearSelection());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
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
    this.overlay.width = this.originalImage.width;
    this.overlay.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.drawSelection();
  }

  startSelection(e) {
    const rect = this.overlay.getBoundingClientRect();
    const scaleX = this.overlay.width / rect.width;
    const scaleY = this.overlay.height / rect.height;
    this.isSelecting = true;
    this.startX = (e.clientX - rect.left) * scaleX;
    this.startY = (e.clientY - rect.top) * scaleY;
    this.selection = null;
  }

  updateSelection(e) {
    if (!this.isSelecting) return;
    const rect = this.overlay.getBoundingClientRect();
    const scaleX = this.overlay.width / rect.width;
    const scaleY = this.overlay.height / rect.height;
    let currentX = (e.clientX - rect.left) * scaleX;
    let currentY = (e.clientY - rect.top) * scaleY;
    let width = currentX - this.startX;
    let height = currentY - this.startY;

    if (this.ratio) {
      const absW = Math.abs(width);
      const absH = Math.abs(height);
      if (absW / this.ratio > absH) { height = (width > 0 ? 1 : -1) * absW / this.ratio; }
      else { width = (height > 0 ? 1 : -1) * absH * this.ratio; }
    }

    this.selection = {
      x: width > 0 ? this.startX : this.startX + width,
      y: height > 0 ? this.startY : this.startY + height,
      width: Math.abs(width), height: Math.abs(height)
    };
    this.drawSelection();
  }

  endSelection() {
    this.isSelecting = false;
    if (this.selection && (this.selection.width < 10 || this.selection.height < 10)) {
      this.selection = null; this.drawSelection();
    }
    document.getElementById('cropBtn').disabled = !this.selection;
  }

  drawSelection() {
    this.overlayCtx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (!this.selection) {
      document.getElementById('cropInfo').textContent = '尚未選取區域';
      return;
    }
    const { x, y, width, height } = this.selection;
    this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.overlayCtx.fillRect(0, 0, this.overlay.width, this.overlay.height);
    this.overlayCtx.clearRect(x, y, width, height);
    this.overlayCtx.strokeStyle = '#a855f7';
    this.overlayCtx.lineWidth = 2;
    this.overlayCtx.setLineDash([5, 5]);
    this.overlayCtx.strokeRect(x, y, width, height);
    document.getElementById('cropInfo').textContent = `${Math.round(width)} x ${Math.round(height)} px`;
  }

  clearSelection() {
    this.selection = null;
    this.drawSelection();
    document.getElementById('cropBtn').disabled = true;
  }

  crop() {
    if (!this.selection) return;
    const { x, y, width, height } = this.selection;
    const imageData = this.ctx.getImageData(x, y, width, height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.overlay.width = width;
    this.overlay.height = height;
    this.ctx.putImageData(imageData, 0, 0);
    this.originalImage = null;
    const img = new Image();
    img.onload = () => { this.originalImage = img; };
    img.src = this.canvas.toDataURL();
    this.clearSelection();
  }

  reset() {
    this.originalImage = null; this.selection = null; this.ratio = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.ratio-btn[data-ratio="free"]').classList.add('active');
    document.getElementById('cropBtn').disabled = true;
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `crop_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new CropTool());
