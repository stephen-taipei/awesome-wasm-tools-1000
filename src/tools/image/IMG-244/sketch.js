/**
 * IMG-244 圖片素描效果工具
 */
class SketchTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { lineStrength: 50, contrast: 50, blur: 3, invert: false };
    this.mode = 'pencil';
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

    document.getElementById('lineStrength').addEventListener('input', (e) => {
      this.settings.lineStrength = parseInt(e.target.value);
      document.getElementById('lineStrengthValue').textContent = this.settings.lineStrength + '%';
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.settings.contrast + '%';
      this.render();
    });

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    document.getElementById('invertColors').addEventListener('change', (e) => {
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

  render() {
    if (!this.originalImage) return;
    const { lineStrength, contrast, blur, invert } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Draw grayscale original
    this.ctx.drawImage(this.originalImage, 0, 0);
    const srcData = this.ctx.getImageData(0, 0, w, h);

    // Convert to grayscale
    for (let i = 0; i < srcData.data.length; i += 4) {
      const gray = 0.299 * srcData.data[i] + 0.587 * srcData.data[i + 1] + 0.114 * srcData.data[i + 2];
      srcData.data[i] = gray;
      srcData.data[i + 1] = gray;
      srcData.data[i + 2] = gray;
    }

    // Create inverted and blurred version
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.putImageData(srcData, 0, 0);

    // Invert
    const blurData = blurCtx.getImageData(0, 0, w, h);
    for (let i = 0; i < blurData.data.length; i += 4) {
      blurData.data[i] = 255 - blurData.data[i];
      blurData.data[i + 1] = 255 - blurData.data[i + 1];
      blurData.data[i + 2] = 255 - blurData.data[i + 2];
    }
    blurCtx.putImageData(blurData, 0, 0);

    // Blur
    blurCtx.filter = `blur(${blur}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0);
    const blurredData = blurCtx.getImageData(0, 0, w, h);

    // Color dodge blend
    const resultData = this.ctx.createImageData(w, h);
    const strengthFactor = lineStrength / 50;
    const contrastFactor = 1 + (contrast - 50) / 50;

    for (let i = 0; i < srcData.data.length; i += 4) {
      const base = srcData.data[i];
      const blend = blurredData.data[i];

      // Color dodge: result = base / (1 - blend)
      let result;
      if (blend >= 255) {
        result = 255;
      } else {
        result = Math.min(255, (base * 256) / (256 - blend));
      }

      // Apply strength
      result = base * (1 - strengthFactor) + result * strengthFactor;

      // Apply contrast
      result = ((result - 128) * contrastFactor) + 128;
      result = Math.max(0, Math.min(255, result));

      // Charcoal mode: add texture
      if (this.mode === 'charcoal') {
        const noise = (Math.random() - 0.5) * 20;
        result = Math.max(0, Math.min(255, result + noise));
        // Make darker overall
        result *= 0.9;
      }

      // Invert if needed
      if (invert) {
        result = 255 - result;
      }

      resultData.data[i] = result;
      resultData.data[i + 1] = result;
      resultData.data[i + 2] = result;
      resultData.data[i + 3] = 255;
    }

    this.ctx.putImageData(resultData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { lineStrength: 50, contrast: 50, blur: 3, invert: false };
    this.mode = 'pencil';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('lineStrength').value = 50;
    document.getElementById('lineStrengthValue').textContent = '50%';
    document.getElementById('contrast').value = 50;
    document.getElementById('contrastValue').textContent = '50%';
    document.getElementById('blur').value = 3;
    document.getElementById('blurValue').textContent = '3';
    document.getElementById('invertColors').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `sketch_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SketchTool());
