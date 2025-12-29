/**
 * IMG-199 圖片浮水印工具
 */
class WatermarkTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { text: '© My Watermark', position: 'bc', fontSize: 24, opacity: 50, color: '#ffffff' };
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

    document.getElementById('watermarkText').addEventListener('input', (e) => {
      this.settings.text = e.target.value;
      this.render();
    });

    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.position = btn.dataset.pos;
        this.render();
      });
    });

    document.getElementById('fontSize').addEventListener('input', (e) => {
      this.settings.fontSize = parseInt(e.target.value);
      document.getElementById('fontSizeValue').textContent = this.settings.fontSize + ' px';
      this.render();
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
      this.render();
    });

    document.getElementById('textColor').addEventListener('input', (e) => {
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
    const { text, position, fontSize, opacity, color } = this.settings;
    const img = this.originalImage;

    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);

    if (!text) return;

    this.ctx.font = `${fontSize}px Arial, sans-serif`;
    this.ctx.fillStyle = this.hexToRgba(color, opacity / 100);
    this.ctx.textBaseline = 'middle';

    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const padding = 20;

    let x, y;
    switch (position) {
      case 'tl': x = padding; y = padding + fontSize / 2; this.ctx.textAlign = 'left'; break;
      case 'tc': x = img.width / 2; y = padding + fontSize / 2; this.ctx.textAlign = 'center'; break;
      case 'tr': x = img.width - padding; y = padding + fontSize / 2; this.ctx.textAlign = 'right'; break;
      case 'ml': x = padding; y = img.height / 2; this.ctx.textAlign = 'left'; break;
      case 'mc': x = img.width / 2; y = img.height / 2; this.ctx.textAlign = 'center'; break;
      case 'mr': x = img.width - padding; y = img.height / 2; this.ctx.textAlign = 'right'; break;
      case 'bl': x = padding; y = img.height - padding - fontSize / 2; this.ctx.textAlign = 'left'; break;
      case 'bc': x = img.width / 2; y = img.height - padding - fontSize / 2; this.ctx.textAlign = 'center'; break;
      case 'br': x = img.width - padding; y = img.height - padding - fontSize / 2; this.ctx.textAlign = 'right'; break;
      default: x = img.width / 2; y = img.height - padding - fontSize / 2; this.ctx.textAlign = 'center';
    }

    this.ctx.fillText(text, x, y);
  }

  reset() {
    this.originalImage = null;
    this.settings = { text: '© My Watermark', position: 'bc', fontSize: 24, opacity: 50, color: '#ffffff' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('watermarkText').value = '© My Watermark';
    document.getElementById('fontSize').value = 24;
    document.getElementById('fontSizeValue').textContent = '24 px';
    document.getElementById('opacity').value = 50;
    document.getElementById('opacityValue').textContent = '50%';
    document.getElementById('textColor').value = '#ffffff';
    document.getElementById('colorValue').textContent = '#ffffff';
    document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.position-btn[data-pos="bc"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `watermark_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new WatermarkTool());
