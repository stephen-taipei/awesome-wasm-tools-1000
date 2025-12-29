/**
 * IMG-232 圖片柔焦效果工具
 */
class SoftFocusTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { blurAmount: 5, blend: 50, glow: 30, highlight: 50 };
    this.presets = {
      subtle: { blurAmount: 3, blend: 30, glow: 20, highlight: 60 },
      portrait: { blurAmount: 5, blend: 50, glow: 30, highlight: 50 },
      dreamy: { blurAmount: 10, blend: 60, glow: 50, highlight: 40 },
      glow: { blurAmount: 8, blend: 40, glow: 70, highlight: 30 }
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

    document.getElementById('blurAmount').addEventListener('input', (e) => {
      this.settings.blurAmount = parseInt(e.target.value);
      document.getElementById('blurAmountValue').textContent = this.settings.blurAmount;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('blend').addEventListener('input', (e) => {
      this.settings.blend = parseInt(e.target.value);
      document.getElementById('blendValue').textContent = this.settings.blend + '%';
      this.render();
    });

    document.getElementById('glow').addEventListener('input', (e) => {
      this.settings.glow = parseInt(e.target.value);
      document.getElementById('glowValue').textContent = this.settings.glow + '%';
      this.render();
    });

    document.getElementById('highlight').addEventListener('input', (e) => {
      this.settings.highlight = parseInt(e.target.value);
      document.getElementById('highlightValue').textContent = this.settings.highlight + '%';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('blurAmount').value = this.settings.blurAmount;
    document.getElementById('blurAmountValue').textContent = this.settings.blurAmount;
    document.getElementById('blend').value = this.settings.blend;
    document.getElementById('blendValue').textContent = this.settings.blend + '%';
    document.getElementById('glow').value = this.settings.glow;
    document.getElementById('glowValue').textContent = this.settings.glow + '%';
    document.getElementById('highlight').value = this.settings.highlight;
    document.getElementById('highlightValue').textContent = this.settings.highlight + '%';
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
    const { blurAmount, blend, glow, highlight } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw original
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (blurAmount === 0 && glow === 0) return;

    // Create blurred version
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = `blur(${blurAmount}px)`;
    blurCtx.drawImage(this.originalImage, 0, 0);
    blurCtx.filter = 'none';

    // Get image data
    const originalData = this.ctx.getImageData(0, 0, w, h);
    const blurData = blurCtx.getImageData(0, 0, w, h);
    const blendFactor = blend / 100;
    const glowFactor = glow / 100;
    const highlightProtect = highlight / 100;

    for (let i = 0; i < originalData.data.length; i += 4) {
      const oR = originalData.data[i];
      const oG = originalData.data[i + 1];
      const oB = originalData.data[i + 2];

      const bR = blurData.data[i];
      const bG = blurData.data[i + 1];
      const bB = blurData.data[i + 2];

      // Calculate luminosity
      const lum = (0.299 * oR + 0.587 * oG + 0.114 * oB) / 255;

      // Protect highlights - reduce effect on bright areas
      const protection = lum > 0.7 ? (1 - (lum - 0.7) / 0.3 * highlightProtect) : 1;
      const adjustedBlend = blendFactor * protection;

      // Blend original with blur
      let newR = oR * (1 - adjustedBlend) + bR * adjustedBlend;
      let newG = oG * (1 - adjustedBlend) + bG * adjustedBlend;
      let newB = oB * (1 - adjustedBlend) + bB * adjustedBlend;

      // Add glow (screen blend mode)
      if (glowFactor > 0) {
        const glowR = 255 - (255 - newR) * (255 - bR * glowFactor) / 255;
        const glowG = 255 - (255 - newG) * (255 - bG * glowFactor) / 255;
        const glowB = 255 - (255 - newB) * (255 - bB * glowFactor) / 255;
        newR = newR * (1 - glowFactor) + glowR * glowFactor;
        newG = newG * (1 - glowFactor) + glowG * glowFactor;
        newB = newB * (1 - glowFactor) + glowB * glowFactor;
      }

      originalData.data[i] = Math.min(255, newR);
      originalData.data[i + 1] = Math.min(255, newG);
      originalData.data[i + 2] = Math.min(255, newB);
    }

    this.ctx.putImageData(originalData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { blurAmount: 5, blend: 50, glow: 30, highlight: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `soft_focus_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SoftFocusTool());
