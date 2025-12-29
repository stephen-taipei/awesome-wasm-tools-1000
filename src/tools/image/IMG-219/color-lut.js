/**
 * IMG-219 圖片色彩查找工具
 */
class ColorLutTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentLut = 'none';
    this.intensity = 100;
    this.luts = {
      none: null,
      cinematic: {
        shadows: { r: 0.1, g: 0.15, b: 0.2 },
        midtones: { r: 1.0, g: 0.95, b: 0.85 },
        highlights: { r: 1.1, g: 1.0, b: 0.85 },
        contrast: 1.1,
        saturation: 0.9
      },
      vintage: {
        shadows: { r: 0.15, g: 0.1, b: 0.05 },
        midtones: { r: 1.05, g: 1.0, b: 0.9 },
        highlights: { r: 1.0, g: 0.95, b: 0.85 },
        contrast: 0.95,
        saturation: 0.8,
        fade: 0.1
      },
      cool: {
        shadows: { r: 0.0, g: 0.05, b: 0.15 },
        midtones: { r: 0.95, g: 1.0, b: 1.1 },
        highlights: { r: 0.95, g: 1.0, b: 1.05 },
        contrast: 1.05,
        saturation: 0.95
      },
      warm: {
        shadows: { r: 0.15, g: 0.08, b: 0.0 },
        midtones: { r: 1.1, g: 1.0, b: 0.9 },
        highlights: { r: 1.1, g: 1.0, b: 0.9 },
        contrast: 1.0,
        saturation: 1.05
      },
      matte: {
        shadows: { r: 0.08, g: 0.08, b: 0.08 },
        midtones: { r: 1.0, g: 1.0, b: 1.0 },
        highlights: { r: 0.95, g: 0.95, b: 0.95 },
        contrast: 0.85,
        saturation: 0.85,
        fade: 0.15
      },
      vibrant: {
        shadows: { r: 0.0, g: 0.0, b: 0.0 },
        midtones: { r: 1.0, g: 1.0, b: 1.0 },
        highlights: { r: 1.0, g: 1.0, b: 1.0 },
        contrast: 1.15,
        saturation: 1.4
      },
      moody: {
        shadows: { r: 0.05, g: 0.02, b: 0.1 },
        midtones: { r: 0.95, g: 0.9, b: 1.0 },
        highlights: { r: 1.0, g: 0.95, b: 1.05 },
        contrast: 1.1,
        saturation: 0.85,
        fade: 0.05
      }
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

    document.querySelectorAll('.lut-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.lut-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentLut = card.dataset.lut;
        this.render();
      });
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.intensity + '%';
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

  applyLut(r, g, b, lut) {
    // Get luminance for zone detection
    const lum = (r + g + b) / 3 / 255;

    // Calculate zone weights
    const shadowWeight = Math.max(0, 1 - lum * 3);
    const midtoneWeight = 1 - Math.abs(lum - 0.5) * 2;
    const highlightWeight = Math.max(0, (lum - 0.33) * 1.5);

    // Apply zone-based color grading
    let newR = r, newG = g, newB = b;

    newR += lut.shadows.r * 255 * shadowWeight * 0.3;
    newG += lut.shadows.g * 255 * shadowWeight * 0.3;
    newB += lut.shadows.b * 255 * shadowWeight * 0.3;

    newR *= 1 + (lut.midtones.r - 1) * midtoneWeight;
    newG *= 1 + (lut.midtones.g - 1) * midtoneWeight;
    newB *= 1 + (lut.midtones.b - 1) * midtoneWeight;

    newR *= 1 + (lut.highlights.r - 1) * highlightWeight;
    newG *= 1 + (lut.highlights.g - 1) * highlightWeight;
    newB *= 1 + (lut.highlights.b - 1) * highlightWeight;

    // Apply contrast
    if (lut.contrast) {
      const factor = lut.contrast;
      newR = ((newR / 255 - 0.5) * factor + 0.5) * 255;
      newG = ((newG / 255 - 0.5) * factor + 0.5) * 255;
      newB = ((newB / 255 - 0.5) * factor + 0.5) * 255;
    }

    // Apply saturation
    if (lut.saturation) {
      const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
      newR = gray + (newR - gray) * lut.saturation;
      newG = gray + (newG - gray) * lut.saturation;
      newB = gray + (newB - gray) * lut.saturation;
    }

    // Apply fade (lift blacks)
    if (lut.fade) {
      const fadeAmount = lut.fade * 255;
      newR = newR + (fadeAmount - newR) * lut.fade * 0.5;
      newG = newG + (fadeAmount - newG) * lut.fade * 0.5;
      newB = newB + (fadeAmount - newB) * lut.fade * 0.5;
    }

    return {
      r: Math.max(0, Math.min(255, newR)),
      g: Math.max(0, Math.min(255, newG)),
      b: Math.max(0, Math.min(255, newB))
    };
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (this.currentLut === 'none' || this.intensity === 0) return;

    const lut = this.luts[this.currentLut];
    if (!lut) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const factor = this.intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      const result = this.applyLut(data[i], data[i + 1], data[i + 2], lut);
      data[i] = data[i] * (1 - factor) + result.r * factor;
      data[i + 1] = data[i + 1] * (1 - factor) + result.g * factor;
      data[i + 2] = data[i + 2] * (1 - factor) + result.b * factor;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.currentLut = 'none';
    this.intensity = 100;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    document.querySelectorAll('.lut-card').forEach(c => c.classList.remove('active'));
    document.querySelector('.lut-card[data-lut="none"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `color_lut_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorLutTool());
