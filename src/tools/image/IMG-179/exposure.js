/**
 * IMG-179 圖片曝光工具
 */
class ExposureTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { exposure: 0, highlights: 0, shadows: 0 };
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

    ['exposure', 'highlights', 'shadows'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        const suffix = id === 'exposure' ? ' EV' : '';
        document.getElementById(id + 'Value').textContent = (this.settings[id] / 100).toFixed(2) + suffix;
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
        this.settings = { exposure: 0, highlights: 0, shadows: 0 };
        ['exposure', 'highlights', 'shadows'].forEach(id => {
          document.getElementById(id).value = 0;
          document.getElementById(id + 'Value').textContent = id === 'exposure' ? '0 EV' : '0';
        });
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

    const { exposure, highlights, shadows } = this.settings;
    if (exposure === 0 && highlights === 0 && shadows === 0) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const expFactor = Math.pow(2, exposure / 100);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i+1], b = data[i+2];

      // Apply exposure
      r *= expFactor; g *= expFactor; b *= expFactor;

      // Apply highlights/shadows
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance > 128 && highlights !== 0) {
        const factor = 1 + (highlights / 100) * ((luminance - 128) / 127);
        r *= factor; g *= factor; b *= factor;
      }
      if (luminance < 128 && shadows !== 0) {
        const factor = 1 + (shadows / 100) * ((128 - luminance) / 128);
        r *= factor; g *= factor; b *= factor;
      }

      data[i] = this.clamp(r);
      data[i+1] = this.clamp(g);
      data[i+2] = this.clamp(b);
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  reset() {
    this.originalImage = null;
    this.settings = { exposure: 0, highlights: 0, shadows: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    ['exposure', 'highlights', 'shadows'].forEach(id => {
      document.getElementById(id).value = 0;
      document.getElementById(id + 'Value').textContent = id === 'exposure' ? '0 EV' : '0';
    });
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `exposure_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ExposureTool());
