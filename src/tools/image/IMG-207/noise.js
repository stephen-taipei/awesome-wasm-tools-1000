/**
 * IMG-207 圖片噪點工具
 */
class NoiseTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { type: 'gaussian', amount: 25, size: 1, mono: false };
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

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        this.render();
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = this.settings.amount;
      this.render();
    });

    document.getElementById('size').addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value);
      document.getElementById('sizeValue').textContent = this.settings.size;
      this.render();
    });

    document.getElementById('mono').addEventListener('input', (e) => {
      this.settings.mono = parseInt(e.target.value) === 1;
      document.getElementById('monoValue').textContent = this.settings.mono ? '開啟' : '關閉';
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

  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  render() {
    if (!this.originalImage) return;
    const { type, amount, size, mono } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (amount === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const intensity = amount * 2.55;

    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        let noiseR, noiseG, noiseB;

        if (type === 'gaussian') {
          if (mono) {
            const n = this.gaussianRandom() * intensity;
            noiseR = noiseG = noiseB = n;
          } else {
            noiseR = this.gaussianRandom() * intensity;
            noiseG = this.gaussianRandom() * intensity;
            noiseB = this.gaussianRandom() * intensity;
          }
        } else if (type === 'uniform') {
          if (mono) {
            const n = (Math.random() - 0.5) * 2 * intensity;
            noiseR = noiseG = noiseB = n;
          } else {
            noiseR = (Math.random() - 0.5) * 2 * intensity;
            noiseG = (Math.random() - 0.5) * 2 * intensity;
            noiseB = (Math.random() - 0.5) * 2 * intensity;
          }
        } else if (type === 'salt') {
          const prob = amount / 200;
          if (Math.random() < prob) {
            noiseR = noiseG = noiseB = Math.random() > 0.5 ? 255 : -255;
          } else {
            noiseR = noiseG = noiseB = 0;
          }
        }

        for (let dy = 0; dy < size && y + dy < h; dy++) {
          for (let dx = 0; dx < size && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            data[i] = Math.max(0, Math.min(255, data[i] + noiseR));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseG));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseB));
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { type: 'gaussian', amount: 25, size: 1, mono: false };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('amount').value = 25;
    document.getElementById('amountValue').textContent = '25';
    document.getElementById('size').value = 1;
    document.getElementById('sizeValue').textContent = '1';
    document.getElementById('mono').value = 0;
    document.getElementById('monoValue').textContent = '關閉';
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="gaussian"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `noise_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new NoiseTool());
