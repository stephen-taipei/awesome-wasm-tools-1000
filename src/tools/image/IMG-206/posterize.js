/**
 * IMG-206 圖片色調分離工具
 */
class PosterizeTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { levels: 5, intensity: 100 };
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.levels = parseInt(btn.dataset.levels);
        document.getElementById('levels').value = this.settings.levels;
        document.getElementById('levelsValue').textContent = this.settings.levels;
        this.render();
      });
    });

    document.getElementById('levels').addEventListener('input', (e) => {
      this.settings.levels = parseInt(e.target.value);
      document.getElementById('levelsValue').textContent = this.settings.levels;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      const matchBtn = document.querySelector(`.preset-btn[data-levels="${this.settings.levels}"]`);
      if (matchBtn) matchBtn.classList.add('active');
      this.render();
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
    const { levels, intensity } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const original = data[i + c];
        const posterized = Math.round(Math.round(original / step) * step);
        data[i + c] = original * (1 - factor) + posterized * factor;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { levels: 5, intensity: 100 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('levels').value = 5;
    document.getElementById('levelsValue').textContent = '5';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-levels="5"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `posterize_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new PosterizeTool());
