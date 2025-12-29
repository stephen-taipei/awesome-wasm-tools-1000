/**
 * IMG-165 圖片雜訊工具
 * 為圖片添加各種雜訊/顆粒效果
 */

class NoiseTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // History for undo
    this.originalData = null;

    // Settings
    this.settings = {
      type: 'gaussian',
      intensity: 30,
      density: 50,
      monochrome: true
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Type selector
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        this.updateTypeUI();
      });
    });

    // Controls
    this.bindSlider('intensity', '%');
    this.bindSlider('density', '%');

    document.getElementById('monochrome').addEventListener('change', (e) => {
      this.settings.monochrome = e.target.checked;
    });

    // Buttons
    document.getElementById('previewBtn').addEventListener('click', () => this.applyNoise());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindSlider(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
    });
  }

  updateTypeUI() {
    const densityGroup = document.getElementById('densityGroup');
    // Density only makes sense for salt-pepper noise
    densityGroup.style.display = this.settings.type === 'salt-pepper' ? 'block' : 'none';
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.saveOriginal();
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
  }

  saveOriginal() {
    this.originalData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('undoBtn').disabled = true;
  }

  applyNoise() {
    if (!this.originalImage) return;

    // First restore original
    this.ctx.putImageData(this.originalData, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const { type, intensity, density, monochrome } = this.settings;

    switch (type) {
      case 'gaussian':
        this.addGaussianNoise(data, intensity, monochrome);
        break;
      case 'salt-pepper':
        this.addSaltPepperNoise(data, intensity, density);
        break;
      case 'film':
        this.addFilmGrain(data, intensity, monochrome);
        break;
      case 'rgb':
        this.addRGBNoise(data, intensity);
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
    document.getElementById('undoBtn').disabled = false;
    this.showStatus('success', '雜訊效果已套用');
  }

  // Box-Muller transform for Gaussian random
  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  addGaussianNoise(data, intensity, monochrome) {
    const strength = intensity * 2.55; // Scale to 0-255

    for (let i = 0; i < data.length; i += 4) {
      if (monochrome) {
        const noise = this.gaussianRandom() * strength;
        data[i] = this.clamp(data[i] + noise);
        data[i + 1] = this.clamp(data[i + 1] + noise);
        data[i + 2] = this.clamp(data[i + 2] + noise);
      } else {
        data[i] = this.clamp(data[i] + this.gaussianRandom() * strength);
        data[i + 1] = this.clamp(data[i + 1] + this.gaussianRandom() * strength);
        data[i + 2] = this.clamp(data[i + 2] + this.gaussianRandom() * strength);
      }
    }
  }

  addSaltPepperNoise(data, intensity, density) {
    const threshold = density / 100;
    const strength = intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < threshold) {
        const value = Math.random() < 0.5 ? 0 : 255;
        const blend = strength;

        data[i] = Math.round(data[i] * (1 - blend) + value * blend);
        data[i + 1] = Math.round(data[i + 1] * (1 - blend) + value * blend);
        data[i + 2] = Math.round(data[i + 2] * (1 - blend) + value * blend);
      }
    }
  }

  addFilmGrain(data, intensity, monochrome) {
    const strength = intensity * 1.5;

    for (let i = 0; i < data.length; i += 4) {
      // Film grain has a more organic, non-uniform distribution
      const rand = Math.random();
      const grain = (rand * rand - 0.25) * strength * 4;

      if (monochrome) {
        data[i] = this.clamp(data[i] + grain);
        data[i + 1] = this.clamp(data[i + 1] + grain);
        data[i + 2] = this.clamp(data[i + 2] + grain);
      } else {
        // Slight color variation for film grain
        data[i] = this.clamp(data[i] + grain * (0.9 + Math.random() * 0.2));
        data[i + 1] = this.clamp(data[i + 1] + grain * (0.9 + Math.random() * 0.2));
        data[i + 2] = this.clamp(data[i + 2] + grain * (0.9 + Math.random() * 0.2));
      }
    }
  }

  addRGBNoise(data, intensity) {
    const strength = intensity * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      // Each channel gets independent noise
      data[i] = this.clamp(data[i] + (Math.random() - 0.5) * strength);
      data[i + 1] = this.clamp(data[i + 1] + (Math.random() - 0.5) * strength);
      data[i + 2] = this.clamp(data[i + 2] + (Math.random() - 0.5) * strength);
    }
  }

  clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  undo() {
    if (!this.originalData) return;
    this.ctx.putImageData(this.originalData, 0, 0);
    document.getElementById('undoBtn').disabled = true;
    this.showStatus('success', '已復原');
  }

  reset() {
    this.originalImage = null;
    this.originalData = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      type: 'gaussian',
      intensity: 30,
      density: 50,
      monochrome: true
    };

    // Reset controls
    document.getElementById('intensity').value = 30;
    document.getElementById('intensityValue').textContent = '30%';
    document.getElementById('density').value = 50;
    document.getElementById('densityValue').textContent = '50%';
    document.getElementById('monochrome').checked = true;

    // Reset type
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="gaussian"]').classList.add('active');
    document.getElementById('densityGroup').style.display = 'none';

    document.getElementById('undoBtn').disabled = true;
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `noise_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NoiseTool();
});
