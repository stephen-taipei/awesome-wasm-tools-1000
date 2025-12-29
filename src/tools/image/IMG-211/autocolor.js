/**
 * IMG-211 圖片自動色彩工具
 */
class AutoColorTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { intensity: 100, target: 128 };
    this.channelAvg = { r: 0, g: 0, b: 0 };
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

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
      this.render();
    });

    document.getElementById('target').addEventListener('input', (e) => {
      this.settings.target = parseInt(e.target.value);
      document.getElementById('targetValue').textContent = this.settings.target;
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
        this.analyzeImage();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  analyzeImage() {
    if (!this.originalImage) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const totalPixels = w * h;

    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
    }

    this.channelAvg = {
      r: Math.round(sumR / totalPixels),
      g: Math.round(sumG / totalPixels),
      b: Math.round(sumB / totalPixels)
    };

    document.getElementById('redAvg').textContent = this.channelAvg.r;
    document.getElementById('greenAvg').textContent = this.channelAvg.g;
    document.getElementById('blueAvg').textContent = this.channelAvg.b;
  }

  render() {
    if (!this.originalImage) return;
    const { intensity, target } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (intensity === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = intensity / 100;

    // Calculate correction factors to shift each channel's average to target
    const rFactor = target / (this.channelAvg.r || 1);
    const gFactor = target / (this.channelAvg.g || 1);
    const bFactor = target / (this.channelAvg.b || 1);

    for (let i = 0; i < data.length; i += 4) {
      const originalR = data[i];
      const originalG = data[i + 1];
      const originalB = data[i + 2];

      const correctedR = Math.min(255, originalR * rFactor);
      const correctedG = Math.min(255, originalG * gFactor);
      const correctedB = Math.min(255, originalB * bFactor);

      data[i] = originalR * (1 - factor) + correctedR * factor;
      data[i + 1] = originalG * (1 - factor) + correctedG * factor;
      data[i + 2] = originalB * (1 - factor) + correctedB * factor;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { intensity: 100, target: 128 };
    this.channelAvg = { r: 0, g: 0, b: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.getElementById('target').value = 128;
    document.getElementById('targetValue').textContent = '128';
    document.getElementById('redAvg').textContent = '-';
    document.getElementById('greenAvg').textContent = '-';
    document.getElementById('blueAvg').textContent = '-';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `autocolor_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new AutoColorTool());
