/**
 * IMG-235 圖片傾斜校正工具
 */
class DeskewTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gridCanvas = document.getElementById('gridOverlay');
    this.gridCtx = this.gridCanvas.getContext('2d');
    this.settings = { angle: 0, scale: 100, showGrid: true, cropToFit: false };
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

    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.angle = parseFloat(btn.dataset.angle);
        document.getElementById('angle').value = this.settings.angle;
        document.getElementById('angleValue').textContent = this.settings.angle + '°';
        this.render();
      });
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseFloat(e.target.value);
      document.getElementById('angleValue').textContent = this.settings.angle.toFixed(1) + '°';
      this.render();
    });

    document.getElementById('scale').addEventListener('input', (e) => {
      this.settings.scale = parseInt(e.target.value);
      document.getElementById('scaleValue').textContent = this.settings.scale + '%';
      this.render();
    });

    document.getElementById('showGrid').addEventListener('change', (e) => {
      this.settings.showGrid = e.target.checked;
      this.updateGrid();
    });

    document.getElementById('cropToFit').addEventListener('change', (e) => {
      this.settings.cropToFit = e.target.checked;
      this.render();
    });

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
        this.updateGrid();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateGrid() {
    if (!this.originalImage) return;

    const rect = this.canvas.getBoundingClientRect();
    this.gridCanvas.width = rect.width;
    this.gridCanvas.height = rect.height;
    this.gridCanvas.style.width = rect.width + 'px';
    this.gridCanvas.style.height = rect.height + 'px';

    if (this.settings.showGrid) {
      this.gridCanvas.classList.add('active');
      this.gridCtx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
      this.gridCtx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      this.gridCtx.lineWidth = 1;

      // Draw grid lines
      const spacing = 50;
      for (let x = spacing; x < this.gridCanvas.width; x += spacing) {
        this.gridCtx.beginPath();
        this.gridCtx.moveTo(x, 0);
        this.gridCtx.lineTo(x, this.gridCanvas.height);
        this.gridCtx.stroke();
      }
      for (let y = spacing; y < this.gridCanvas.height; y += spacing) {
        this.gridCtx.beginPath();
        this.gridCtx.moveTo(0, y);
        this.gridCtx.lineTo(this.gridCanvas.width, y);
        this.gridCtx.stroke();
      }
    } else {
      this.gridCanvas.classList.remove('active');
    }
  }

  render() {
    if (!this.originalImage) return;
    const { angle, scale, cropToFit } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    const radians = angle * Math.PI / 180;
    const scaleFactor = scale / 100;

    // Calculate new canvas size to fit rotated image
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));

    let newW, newH;
    if (cropToFit) {
      // Keep original size and crop
      newW = w;
      newH = h;
    } else {
      // Expand to fit rotated image
      newW = Math.ceil(w * cos + h * sin);
      newH = Math.ceil(w * sin + h * cos);
    }

    this.canvas.width = newW;
    this.canvas.height = newH;

    // Clear and apply transforms
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, newW, newH);

    this.ctx.save();
    this.ctx.translate(newW / 2, newH / 2);
    this.ctx.rotate(radians);
    this.ctx.scale(scaleFactor, scaleFactor);
    this.ctx.drawImage(this.originalImage, -w / 2, -h / 2);
    this.ctx.restore();

    this.updateGrid();
  }

  reset() {
    this.originalImage = null;
    this.settings = { angle: 0, scale: 100, showGrid: true, cropToFit: false };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    document.getElementById('scale').value = 100;
    document.getElementById('scaleValue').textContent = '100%';
    document.getElementById('showGrid').checked = true;
    document.getElementById('cropToFit').checked = false;
    this.gridCanvas.classList.remove('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `deskew_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DeskewTool());
