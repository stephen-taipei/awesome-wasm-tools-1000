/**
 * IMG-257 圖片雜訊生成工具
 */
class NoiseGeneratorTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      amount: 30,
      density: 50,
      scale: 1,
      colorNoise: false,
      animateNoise: false
    };
    this.mode = 'gaussian';
    this.animationId = null;
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

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = this.settings.amount + '%';
      this.render();
    });

    document.getElementById('density').addEventListener('input', (e) => {
      this.settings.density = parseInt(e.target.value);
      document.getElementById('densityValue').textContent = this.settings.density + '%';
      this.render();
    });

    document.getElementById('scale').addEventListener('input', (e) => {
      this.settings.scale = parseInt(e.target.value);
      document.getElementById('scaleValue').textContent = this.settings.scale + 'x';
      this.render();
    });

    document.getElementById('colorNoise').addEventListener('change', (e) => {
      this.settings.colorNoise = e.target.checked;
      this.render();
    });

    document.getElementById('animateNoise').addEventListener('change', (e) => {
      this.settings.animateNoise = e.target.checked;
      if (e.target.checked) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
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

  perlinNoise(x, y, scale) {
    const freq = 0.05 / scale;
    return (Math.sin(x * freq) + Math.sin(y * freq) + Math.sin((x + y) * freq * 0.5)) / 3;
  }

  render() {
    if (!this.originalImage) return;
    const { amount, density, scale, colorNoise } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const noiseAmount = amount * 2.55;
    const densityFactor = density / 100;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        if (this.mode === 'salt') {
          // Salt and pepper noise
          if (Math.random() < densityFactor * 0.1) {
            const val = Math.random() > 0.5 ? 255 : 0;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
          }
        } else if (this.mode === 'film') {
          // Film grain noise
          const grain = this.gaussianRandom() * noiseAmount * 0.5;
          const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const grainFactor = 1 - (lum / 255) * 0.5; // More grain in shadows

          if (colorNoise) {
            data[idx] = Math.max(0, Math.min(255, data[idx] + grain * grainFactor + (Math.random() - 0.5) * 10));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + grain * grainFactor + (Math.random() - 0.5) * 10));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + grain * grainFactor + (Math.random() - 0.5) * 10));
          } else {
            data[idx] = Math.max(0, Math.min(255, data[idx] + grain * grainFactor));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + grain * grainFactor));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + grain * grainFactor));
          }
        } else if (this.mode === 'perlin') {
          // Perlin noise
          const noise = this.perlinNoise(x, y, scale) * noiseAmount;

          if (colorNoise) {
            data[idx] = Math.max(0, Math.min(255, data[idx] + noise + this.perlinNoise(x + 100, y, scale) * noiseAmount * 0.3));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise + this.perlinNoise(x, y + 100, scale) * noiseAmount * 0.3));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise + this.perlinNoise(x + 50, y + 50, scale) * noiseAmount * 0.3));
          } else {
            data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
          }
        } else {
          // Gaussian noise
          if (colorNoise) {
            data[idx] = Math.max(0, Math.min(255, data[idx] + this.gaussianRandom() * noiseAmount));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + this.gaussianRandom() * noiseAmount));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + this.gaussianRandom() * noiseAmount));
          } else {
            const noise = this.gaussianRandom() * noiseAmount;
            data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  startAnimation() {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.stopAnimation();
    this.originalImage = null;
    this.settings = { amount: 30, density: 50, scale: 1, colorNoise: false, animateNoise: false };
    this.mode = 'gaussian';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('amount').value = 30;
    document.getElementById('amountValue').textContent = '30%';
    document.getElementById('density').value = 50;
    document.getElementById('densityValue').textContent = '50%';
    document.getElementById('scale').value = 1;
    document.getElementById('scaleValue').textContent = '1x';
    document.getElementById('colorNoise').checked = false;
    document.getElementById('animateNoise').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `noise_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new NoiseGeneratorTool());
