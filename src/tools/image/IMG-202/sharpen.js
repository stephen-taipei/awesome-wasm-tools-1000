/**
 * IMG-202 圖片銳利化工具
 */
class SharpenTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { amount: 50, radius: 1 };
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
        this.settings.amount = parseInt(btn.dataset.amount);
        document.getElementById('amount').value = this.settings.amount;
        document.getElementById('amountValue').textContent = this.settings.amount + '%';
        this.render();
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = this.settings.amount + '%';
      this.render();
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.radius + ' px';
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
    const { amount, radius } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (amount === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const strength = amount / 100;

    // Create sharpening kernel based on radius
    const kernelSize = radius * 2 + 1;
    const center = radius;
    const kernel = [];
    let sum = 0;

    for (let y = 0; y < kernelSize; y++) {
      for (let x = 0; x < kernelSize; x++) {
        if (x === center && y === center) {
          kernel.push(0); // Will be set later
        } else {
          kernel.push(-1);
          sum -= 1;
        }
      }
    }
    kernel[center * kernelSize + center] = 1 - sum * strength;

    // Normalize kernel for blending
    for (let i = 0; i < kernel.length; i++) {
      if (i !== center * kernelSize + center) {
        kernel[i] *= strength;
      }
    }

    const output = new Uint8ClampedArray(data);

    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4;
            r += data[idx] * kernel[ki];
            g += data[idx + 1] * kernel[ki];
            b += data[idx + 2] * kernel[ki];
            ki++;
          }
        }

        const idx = (y * w + x) * 4;
        output[idx] = Math.min(255, Math.max(0, r));
        output[idx + 1] = Math.min(255, Math.max(0, g));
        output[idx + 2] = Math.min(255, Math.max(0, b));
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { amount: 50, radius: 1 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('amount').value = 50;
    document.getElementById('amountValue').textContent = '50%';
    document.getElementById('radius').value = 1;
    document.getElementById('radiusValue').textContent = '1 px';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `sharpen_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SharpenTool());
