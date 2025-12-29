/**
 * IMG-181 圖片色溫工具
 */
class TemperatureTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { temperature: 0, tint: 0 };
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

    ['temperature', 'tint'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id];
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
        this.settings = { temperature: 0, tint: 0 };
        ['temperature', 'tint'].forEach(id => {
          document.getElementById(id).value = 0;
          document.getElementById(id + 'Value').textContent = '0';
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

    const { temperature, tint } = this.settings;
    if (temperature === 0 && tint === 0) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Temperature: positive = warmer (more orange), negative = cooler (more blue)
    // Tint: positive = more magenta, negative = more green
    const tempAdjust = temperature * 1.5;
    const tintAdjust = tint * 1.5;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];

      // Apply temperature
      if (temperature > 0) {
        r = this.clamp(r + tempAdjust);
        b = this.clamp(b - tempAdjust * 0.5);
      } else {
        r = this.clamp(r + tempAdjust * 0.5);
        b = this.clamp(b - tempAdjust);
      }

      // Apply tint
      if (tint > 0) {
        r = this.clamp(r + tintAdjust * 0.3);
        g = this.clamp(g - tintAdjust * 0.3);
        b = this.clamp(b + tintAdjust * 0.3);
      } else {
        g = this.clamp(g - tintAdjust * 0.5);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  reset() {
    this.originalImage = null;
    this.settings = { temperature: 0, tint: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    ['temperature', 'tint'].forEach(id => {
      document.getElementById(id).value = 0;
      document.getElementById(id + 'Value').textContent = '0';
    });
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `temperature_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new TemperatureTool());
