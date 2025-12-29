/**
 * IMG-176 圖片亮度工具
 */
class BrightnessTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.brightness = 0;
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

    document.getElementById('brightness').addEventListener('input', (e) => {
      this.brightness = parseInt(e.target.value);
      document.getElementById('brightnessValue').textContent = this.brightness;
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
        this.brightness = 0;
        document.getElementById('brightness').value = 0;
        document.getElementById('brightnessValue').textContent = '0';
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

    if (this.brightness !== 0) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      const adjustment = this.brightness * 2.55;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = this.clamp(data[i] + adjustment);
        data[i + 1] = this.clamp(data[i + 1] + adjustment);
        data[i + 2] = this.clamp(data[i + 2] + adjustment);
      }
      this.ctx.putImageData(imageData, 0, 0);
    }
  }

  clamp(val) { return Math.max(0, Math.min(255, Math.round(val))); }

  reset() {
    this.originalImage = null;
    this.brightness = 0;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('brightness').value = 0;
    document.getElementById('brightnessValue').textContent = '0';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `brightness_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new BrightnessTool());
