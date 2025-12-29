/**
 * IMG-174 圖片縮放工具
 */
class ResizeTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.linked = true;
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

    document.getElementById('linkBtn').addEventListener('click', () => {
      this.linked = !this.linked;
      document.getElementById('linkBtn').classList.toggle('linked', this.linked);
    });

    document.getElementById('newWidth').addEventListener('input', (e) => {
      if (this.linked && this.originalWidth) {
        const ratio = this.originalHeight / this.originalWidth;
        document.getElementById('newHeight').value = Math.round(parseInt(e.target.value) * ratio);
      }
      this.updateInfo();
    });

    document.getElementById('newHeight').addEventListener('input', (e) => {
      if (this.linked && this.originalHeight) {
        const ratio = this.originalWidth / this.originalHeight;
        document.getElementById('newWidth').value = Math.round(parseInt(e.target.value) * ratio);
      }
      this.updateInfo();
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const scale = parseFloat(btn.dataset.scale);
        document.getElementById('newWidth').value = Math.round(this.originalWidth * scale);
        document.getElementById('newHeight').value = Math.round(this.originalHeight * scale);
        this.updateInfo();
      });
    });

    document.getElementById('resizeBtn').addEventListener('click', () => this.resize());
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
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        document.getElementById('originalSize').textContent = `${img.width} x ${img.height}`;
        document.getElementById('newWidth').value = img.width;
        document.getElementById('newHeight').value = img.height;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.updateInfo();
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
  }

  updateInfo() {
    const newW = parseInt(document.getElementById('newWidth').value) || 0;
    const newH = parseInt(document.getElementById('newHeight').value) || 0;
    const scaleW = ((newW / this.originalWidth) * 100).toFixed(1);
    const scaleH = ((newH / this.originalHeight) * 100).toFixed(1);
    document.getElementById('resultInfo').textContent = `縮放: ${scaleW}% x ${scaleH}%`;
  }

  resize() {
    if (!this.originalImage) return;
    const newW = parseInt(document.getElementById('newWidth').value);
    const newH = parseInt(document.getElementById('newHeight').value);
    if (newW < 1 || newH < 1) return;

    this.canvas.width = newW;
    this.canvas.height = newH;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(this.originalImage, 0, 0, newW, newH);

    // Update original reference
    const img = new Image();
    img.onload = () => {
      this.originalImage = img;
      this.originalWidth = newW;
      this.originalHeight = newH;
      document.getElementById('originalSize').textContent = `${newW} x ${newH}`;
    };
    img.src = this.canvas.toDataURL();
  }

  reset() {
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.linked = true;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('linkBtn').classList.add('linked');
    document.getElementById('originalSize').textContent = '-';
    document.getElementById('resultInfo').textContent = '-';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `resize_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ResizeTool());
