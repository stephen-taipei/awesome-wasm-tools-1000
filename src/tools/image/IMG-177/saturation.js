/**
 * IMG-177 圖片飽和度工具
 */
class SaturationTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.saturation = 0;
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

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = this.saturation;
      this.render();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.saturation = parseInt(btn.dataset.value);
        document.getElementById('saturation').value = this.saturation;
        document.getElementById('saturationValue').textContent = this.saturation;
        this.render();
      });
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
        this.saturation = 0;
        document.getElementById('saturation').value = 0;
        document.getElementById('saturationValue').textContent = '0';
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

    if (this.saturation !== 0) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      const factor = 1 + this.saturation / 100;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        data[i] = this.clamp(gray + (r - gray) * factor);
        data[i + 1] = this.clamp(gray + (g - gray) * factor);
        data[i + 2] = this.clamp(gray + (b - gray) * factor);
      }
      this.ctx.putImageData(imageData, 0, 0);
    }
  }

  clamp(val) { return Math.max(0, Math.min(255, Math.round(val))); }

  reset() {
    this.originalImage = null;
    this.saturation = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('saturation').value = 0;
    document.getElementById('saturationValue').textContent = '0';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `saturation_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SaturationTool());
