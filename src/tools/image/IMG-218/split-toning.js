/**
 * IMG-218 圖片分割色調工具
 */
class SplitToningTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      highlightColor: '#ffd43b',
      highlightSat: 25,
      shadowColor: '#339af0',
      shadowSat: 25,
      balance: 50
    };
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

    document.getElementById('highlightColor').addEventListener('input', (e) => {
      this.settings.highlightColor = e.target.value;
      this.render();
    });

    document.getElementById('highlightSat').addEventListener('input', (e) => {
      this.settings.highlightSat = parseInt(e.target.value);
      document.getElementById('highlightSatValue').textContent = this.settings.highlightSat + '%';
      this.render();
    });

    document.getElementById('shadowColor').addEventListener('input', (e) => {
      this.settings.shadowColor = e.target.value;
      this.render();
    });

    document.getElementById('shadowSat').addEventListener('input', (e) => {
      this.settings.shadowSat = parseInt(e.target.value);
      document.getElementById('shadowSatValue').textContent = this.settings.shadowSat + '%';
      this.render();
    });

    document.getElementById('balance').addEventListener('input', (e) => {
      this.settings.balance = parseInt(e.target.value);
      document.getElementById('balanceValue').textContent = this.settings.balance;
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  render() {
    if (!this.originalImage) return;
    const { highlightColor, highlightSat, shadowColor, shadowSat, balance } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (highlightSat === 0 && shadowSat === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const highlight = this.hexToRgb(highlightColor);
    const shadow = this.hexToRgb(shadowColor);
    const balancePoint = balance * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      let toneR = r, toneG = g, toneB = b;

      if (lum > balancePoint && highlightSat > 0) {
        // Apply highlight toning
        const strength = ((lum - balancePoint) / (255 - balancePoint)) * (highlightSat / 100);
        toneR = r + (highlight.r - r) * strength;
        toneG = g + (highlight.g - g) * strength;
        toneB = b + (highlight.b - b) * strength;
      } else if (lum <= balancePoint && shadowSat > 0) {
        // Apply shadow toning
        const strength = ((balancePoint - lum) / balancePoint) * (shadowSat / 100);
        toneR = r + (shadow.r - r) * strength;
        toneG = g + (shadow.g - g) * strength;
        toneB = b + (shadow.b - b) * strength;
      }

      data[i] = Math.max(0, Math.min(255, toneR));
      data[i + 1] = Math.max(0, Math.min(255, toneG));
      data[i + 2] = Math.max(0, Math.min(255, toneB));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      highlightColor: '#ffd43b',
      highlightSat: 25,
      shadowColor: '#339af0',
      shadowSat: 25,
      balance: 50
    };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('highlightColor').value = '#ffd43b';
    document.getElementById('highlightSat').value = 25;
    document.getElementById('highlightSatValue').textContent = '25%';
    document.getElementById('shadowColor').value = '#339af0';
    document.getElementById('shadowSat').value = 25;
    document.getElementById('shadowSatValue').textContent = '25%';
    document.getElementById('balance').value = 50;
    document.getElementById('balanceValue').textContent = '50';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `split_toning_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SplitToningTool());
