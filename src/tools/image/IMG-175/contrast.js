/**
 * IMG-175 圖片對比度工具
 */
class ContrastTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.contrast = 0;
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

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.contrast;
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
        this.contrast = 0;
        document.getElementById('contrast').value = 0;
        document.getElementById('contrastValue').textContent = '0';
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

    if (this.contrast !== 0) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      const factor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = this.clamp(factor * (data[i] - 128) + 128);
        data[i + 1] = this.clamp(factor * (data[i + 1] - 128) + 128);
        data[i + 2] = this.clamp(factor * (data[i + 2] - 128) + 128);
      }
      this.ctx.putImageData(imageData, 0, 0);
    }
  }

  clamp(val) { return Math.max(0, Math.min(255, Math.round(val))); }

  reset() {
    this.originalImage = null;
    this.contrast = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('contrast').value = 0;
    document.getElementById('contrastValue').textContent = '0';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `contrast_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ContrastTool());
