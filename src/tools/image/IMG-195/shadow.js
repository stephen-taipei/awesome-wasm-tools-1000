/**
 * IMG-195 圖片陰影工具
 */
class ShadowTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { blur: 20, offsetX: 10, offsetY: 10, opacity: 50, color: '#000000' };
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

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur + ' px';
      this.render();
    });

    document.getElementById('offsetX').addEventListener('input', (e) => {
      this.settings.offsetX = parseInt(e.target.value);
      document.getElementById('offsetXValue').textContent = this.settings.offsetX + ' px';
      this.render();
    });

    document.getElementById('offsetY').addEventListener('input', (e) => {
      this.settings.offsetY = parseInt(e.target.value);
      document.getElementById('offsetYValue').textContent = this.settings.offsetY + ' px';
      this.render();
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
      this.render();
    });

    document.getElementById('shadowColor').addEventListener('input', (e) => {
      this.settings.color = e.target.value;
      document.getElementById('colorValue').textContent = e.target.value;
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

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  render() {
    if (!this.originalImage) return;
    const { blur, offsetX, offsetY, opacity, color } = this.settings;
    const img = this.originalImage;

    // Calculate canvas size with padding for shadow
    const padding = blur * 2 + Math.max(Math.abs(offsetX), Math.abs(offsetY));
    const w = img.width + padding * 2;
    const h = img.height + padding * 2;
    this.canvas.width = w;
    this.canvas.height = h;

    this.ctx.clearRect(0, 0, w, h);

    // Set shadow properties
    this.ctx.shadowColor = this.hexToRgba(color, opacity / 100);
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = offsetX;
    this.ctx.shadowOffsetY = offsetY;

    // Draw image with shadow
    this.ctx.drawImage(img, padding, padding);

    // Reset shadow and draw image again on top (crisp)
    this.ctx.shadowColor = 'transparent';
    this.ctx.drawImage(img, padding, padding);
  }

  reset() {
    this.originalImage = null;
    this.settings = { blur: 20, offsetX: 10, offsetY: 10, opacity: 50, color: '#000000' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('blur').value = 20;
    document.getElementById('blurValue').textContent = '20 px';
    document.getElementById('offsetX').value = 10;
    document.getElementById('offsetXValue').textContent = '10 px';
    document.getElementById('offsetY').value = 10;
    document.getElementById('offsetYValue').textContent = '10 px';
    document.getElementById('opacity').value = 50;
    document.getElementById('opacityValue').textContent = '50%';
    document.getElementById('shadowColor').value = '#000000';
    document.getElementById('colorValue').textContent = '#000000';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `shadow_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ShadowTool());
