/**
 * IMG-204 圖片反相工具
 */
class InvertTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { invertR: true, invertG: true, invertB: true, intensity: 100 };
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

    ['invertR', 'invertG', 'invertB'].forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.settings[id] = e.target.checked;
        this.render();
      });
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
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
    const { invertR, invertG, invertB, intensity } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0 || (!invertR && !invertG && !invertB)) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      if (invertR) {
        const inverted = 255 - data[i];
        data[i] = data[i] * (1 - factor) + inverted * factor;
      }
      if (invertG) {
        const inverted = 255 - data[i + 1];
        data[i + 1] = data[i + 1] * (1 - factor) + inverted * factor;
      }
      if (invertB) {
        const inverted = 255 - data[i + 2];
        data[i + 2] = data[i + 2] * (1 - factor) + inverted * factor;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { invertR: true, invertG: true, invertB: true, intensity: 100 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('invertR').checked = true;
    document.getElementById('invertG').checked = true;
    document.getElementById('invertB').checked = true;
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `invert_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new InvertTool());
