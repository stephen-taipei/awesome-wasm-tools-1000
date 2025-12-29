/**
 * IMG-171 圖片旋轉工具
 * 自由旋轉圖片角度
 */
class RotateTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.angle = 0;
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.loadImage(e.target.files[0]);
    });

    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.angle);
        this.angle = (this.angle + delta) % 360;
        document.getElementById('angle').value = this.angle;
        document.getElementById('angleValue').textContent = this.angle + '°';
        this.render();
      });
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = this.angle + '°';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.angle = 0;
        document.getElementById('angle').value = 0;
        document.getElementById('angleValue').textContent = '0°';
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
    const radians = this.angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    const newW = Math.ceil(w * cos + h * sin);
    const newH = Math.ceil(w * sin + h * cos);

    this.canvas.width = newW;
    this.canvas.height = newH;
    this.ctx.clearRect(0, 0, newW, newH);
    this.ctx.save();
    this.ctx.translate(newW / 2, newH / 2);
    this.ctx.rotate(radians);
    this.ctx.drawImage(this.originalImage, -w / 2, -h / 2);
    this.ctx.restore();
  }

  reset() {
    this.originalImage = null;
    this.angle = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `rotate_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => new RotateTool());
