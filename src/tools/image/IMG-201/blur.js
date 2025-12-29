/**
 * IMG-201 圖片模糊工具
 */
class BlurTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { type: 'gaussian', amount: 5, angle: 0 };
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

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        document.getElementById('angleGroup').style.display = this.settings.type === 'motion' ? 'block' : 'none';
        this.render();
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = this.settings.amount + ' px';
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = this.settings.angle + '°';
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
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const { type, amount, angle } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    switch (type) {
      case 'gaussian':
        this.ctx.filter = `blur(${amount}px)`;
        this.ctx.drawImage(this.originalImage, 0, 0);
        this.ctx.filter = 'none';
        break;
      case 'motion':
        this.applyMotionBlur(amount, angle);
        break;
      case 'radial':
        this.applyRadialBlur(amount);
        break;
    }
  }

  applyMotionBlur(amount, angle) {
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad) * amount;
    const dy = Math.sin(rad) * amount;
    const steps = Math.max(1, Math.floor(amount));

    this.ctx.globalAlpha = 1 / steps;
    for (let i = 0; i < steps; i++) {
      const offsetX = (i - steps / 2) * dx / steps;
      const offsetY = (i - steps / 2) * dy / steps;
      this.ctx.drawImage(this.originalImage, offsetX, offsetY);
    }
    this.ctx.globalAlpha = 1;
  }

  applyRadialBlur(amount) {
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    const cx = w / 2;
    const cy = h / 2;
    const steps = Math.max(1, Math.floor(amount / 2));

    this.ctx.globalAlpha = 1 / steps;
    for (let i = 0; i < steps; i++) {
      const scale = 1 + (i * amount / 500);
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-cx, -cy);
      this.ctx.drawImage(this.originalImage, 0, 0);
      this.ctx.restore();
    }
    this.ctx.globalAlpha = 1;
  }

  reset() {
    this.originalImage = null;
    this.settings = { type: 'gaussian', amount: 5, angle: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('amount').value = 5;
    document.getElementById('amountValue').textContent = '5 px';
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    document.getElementById('angleGroup').style.display = 'none';
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="gaussian"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `blur_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new BlurTool());
