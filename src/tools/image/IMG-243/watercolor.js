/**
 * IMG-243 圖片水彩效果工具
 */
class WatercolorTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { blur: 5, edge: 30, bleed: 40, texture: 20 };
    this.presets = {
      subtle: { blur: 3, edge: 20, bleed: 30, texture: 15 },
      vibrant: { blur: 5, edge: 40, bleed: 50, texture: 20 },
      wet: { blur: 8, edge: 25, bleed: 70, texture: 10 },
      artistic: { blur: 6, edge: 50, bleed: 60, texture: 30 }
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = this.presets[btn.dataset.preset];
        this.settings = { ...preset };
        this.updateSliders();
        this.render();
      });
    });

    ['blur', 'edge', 'bleed', 'texture'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        const suffix = id === 'blur' ? '' : '%';
        document.getElementById(id + 'Value').textContent = this.settings[id] + suffix;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.render();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('blur').value = this.settings.blur;
    document.getElementById('blurValue').textContent = this.settings.blur;
    document.getElementById('edge').value = this.settings.edge;
    document.getElementById('edgeValue').textContent = this.settings.edge + '%';
    document.getElementById('bleed').value = this.settings.bleed;
    document.getElementById('bleedValue').textContent = this.settings.bleed + '%';
    document.getElementById('texture').value = this.settings.texture;
    document.getElementById('textureValue').textContent = this.settings.texture + '%';
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
    const { blur, edge, bleed, texture } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Create blurred version
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = `blur(${blur}px)`;
    blurCtx.drawImage(this.originalImage, 0, 0);

    // Get blurred data
    const blurData = blurCtx.getImageData(0, 0, w, h);

    // Create edge detection
    this.ctx.drawImage(this.originalImage, 0, 0);
    const srcData = this.ctx.getImageData(0, 0, w, h);
    const edgeData = this.ctx.createImageData(w, h);

    // Sobel edge detection
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gx = 0, gy = 0;

        // Sobel kernels
        const kernelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const kernelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const i = ((y + ky) * w + (x + kx)) * 4;
            const gray = (srcData.data[i] + srcData.data[i + 1] + srcData.data[i + 2]) / 3;
            gx += gray * kernelX[ky + 1][kx + 1];
            gy += gray * kernelY[ky + 1][kx + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * w + x) * 4;
        edgeData.data[idx] = magnitude;
        edgeData.data[idx + 1] = magnitude;
        edgeData.data[idx + 2] = magnitude;
        edgeData.data[idx + 3] = 255;
      }
    }

    // Combine effects
    const resultData = this.ctx.createImageData(w, h);
    const bleedFactor = bleed / 100;
    const edgeFactor = edge / 100;
    const textureFactor = texture / 100;

    for (let i = 0; i < srcData.data.length; i += 4) {
      // Blend original with blur based on bleed
      let r = srcData.data[i] * (1 - bleedFactor) + blurData.data[i] * bleedFactor;
      let g = srcData.data[i + 1] * (1 - bleedFactor) + blurData.data[i + 1] * bleedFactor;
      let b = srcData.data[i + 2] * (1 - bleedFactor) + blurData.data[i + 2] * bleedFactor;

      // Add edge darkening
      const edgeVal = edgeData.data[i] / 255;
      const edgeDarken = 1 - edgeVal * edgeFactor * 0.5;
      r *= edgeDarken;
      g *= edgeDarken;
      b *= edgeDarken;

      // Add paper texture (noise)
      if (textureFactor > 0) {
        const noise = (Math.random() - 0.5) * textureFactor * 50;
        r = Math.max(0, Math.min(255, r + noise));
        g = Math.max(0, Math.min(255, g + noise));
        b = Math.max(0, Math.min(255, b + noise));
      }

      // Slightly desaturate for watercolor look
      const gray = (r + g + b) / 3;
      r = r * 0.9 + gray * 0.1;
      g = g * 0.9 + gray * 0.1;
      b = b * 0.9 + gray * 0.1;

      resultData.data[i] = r;
      resultData.data[i + 1] = g;
      resultData.data[i + 2] = b;
      resultData.data[i + 3] = 255;
    }

    this.ctx.putImageData(resultData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { blur: 5, edge: 30, bleed: 40, texture: 20 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `watercolor_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new WatercolorTool());
