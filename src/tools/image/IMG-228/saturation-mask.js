/**
 * IMG-228 圖片飽和度遮罩工具
 */
class SaturationMaskTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { minSat: 0, maxSat: 100, feather: 10, invert: false };
    this.mode = 'mask';
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

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('minSat').addEventListener('input', (e) => {
      this.settings.minSat = parseInt(e.target.value);
      document.getElementById('minSatValue').textContent = this.settings.minSat + '%';
      this.render();
    });

    document.getElementById('maxSat').addEventListener('input', (e) => {
      this.settings.maxSat = parseInt(e.target.value);
      document.getElementById('maxSatValue').textContent = this.settings.maxSat + '%';
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather + '%';
      this.render();
    });

    document.getElementById('invertMask').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
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

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let s, l = (max + min) / 2;

    if (max === min) {
      s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    }
    return s * 100;
  }

  calculateMaskValue(saturation) {
    const { minSat, maxSat, feather, invert } = this.settings;
    let value = 0;
    const featherAmount = feather / 100 * 50;

    if (saturation >= minSat && saturation <= maxSat) {
      value = 1;

      // Feather at edges
      if (featherAmount > 0) {
        if (saturation < minSat + featherAmount) {
          value = (saturation - minSat) / featherAmount;
        } else if (saturation > maxSat - featherAmount) {
          value = (maxSat - saturation) / featherAmount;
        }
      }
    } else if (featherAmount > 0) {
      if (saturation < minSat && saturation >= minSat - featherAmount) {
        value = (saturation - (minSat - featherAmount)) / featherAmount;
      } else if (saturation > maxSat && saturation <= maxSat + featherAmount) {
        value = ((maxSat + featherAmount) - saturation) / featherAmount;
      }
    }

    value = Math.max(0, Math.min(1, value));
    return invert ? 1 - value : value;
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const saturation = this.rgbToHsl(r, g, b);
      const maskValue = this.calculateMaskValue(saturation);

      if (this.mode === 'mask') {
        // Show mask as grayscale
        const gray = Math.round(maskValue * 255);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else {
        // Overlay mode - desaturate non-selected areas
        if (maskValue < 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = r * maskValue + gray * (1 - maskValue);
          data[i + 1] = g * maskValue + gray * (1 - maskValue);
          data[i + 2] = b * maskValue + gray * (1 - maskValue);
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { minSat: 0, maxSat: 100, feather: 10, invert: false };
    this.mode = 'mask';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('minSat').value = 0;
    document.getElementById('minSatValue').textContent = '0%';
    document.getElementById('maxSat').value = 100;
    document.getElementById('maxSatValue').textContent = '100%';
    document.getElementById('feather').value = 10;
    document.getElementById('featherValue').textContent = '10%';
    document.getElementById('invertMask').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `saturation_mask_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SaturationMaskTool());
