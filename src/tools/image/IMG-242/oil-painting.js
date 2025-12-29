/**
 * IMG-242 圖片油畫效果工具
 */
class OilPaintingTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { brushSize: 4, intensity: 20, saturation: 120 };
    this.presets = {
      light: { brushSize: 2, intensity: 15, saturation: 110 },
      medium: { brushSize: 4, intensity: 20, saturation: 120 },
      strong: { brushSize: 6, intensity: 30, saturation: 130 },
      artistic: { brushSize: 8, intensity: 40, saturation: 140 }
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

    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity;
      this.render();
    });

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = this.settings.saturation + '%';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('brushSize').value = this.settings.brushSize;
    document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    document.getElementById('intensity').value = this.settings.intensity;
    document.getElementById('intensityValue').textContent = this.settings.intensity;
    document.getElementById('saturation').value = this.settings.saturation;
    document.getElementById('saturationValue').textContent = this.settings.saturation + '%';
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
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h, s, l];
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  render() {
    if (!this.originalImage) return;
    const { brushSize, intensity, saturation } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const srcData = this.ctx.getImageData(0, 0, w, h);
    const dstData = this.ctx.createImageData(w, h);
    const levels = intensity;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Oil painting algorithm: find most frequent intensity in neighborhood
        const intensityCount = new Array(levels + 1).fill(0);
        const avgR = new Array(levels + 1).fill(0);
        const avgG = new Array(levels + 1).fill(0);
        const avgB = new Array(levels + 1).fill(0);

        for (let dy = -brushSize; dy <= brushSize; dy++) {
          for (let dx = -brushSize; dx <= brushSize; dx++) {
            const nx = Math.min(w - 1, Math.max(0, x + dx));
            const ny = Math.min(h - 1, Math.max(0, y + dy));
            const i = (ny * w + nx) * 4;

            const r = srcData.data[i];
            const g = srcData.data[i + 1];
            const b = srcData.data[i + 2];

            // Calculate intensity level
            const curIntensity = Math.floor(((r + g + b) / 3) * levels / 255);

            intensityCount[curIntensity]++;
            avgR[curIntensity] += r;
            avgG[curIntensity] += g;
            avgB[curIntensity] += b;
          }
        }

        // Find most frequent intensity
        let maxCount = 0;
        let maxIndex = 0;
        for (let i = 0; i <= levels; i++) {
          if (intensityCount[i] > maxCount) {
            maxCount = intensityCount[i];
            maxIndex = i;
          }
        }

        const idx = (y * w + x) * 4;
        let finalR = avgR[maxIndex] / maxCount;
        let finalG = avgG[maxIndex] / maxCount;
        let finalB = avgB[maxIndex] / maxCount;

        // Enhance saturation
        if (saturation !== 100) {
          let [hue, sat, lit] = this.rgbToHsl(finalR, finalG, finalB);
          sat = Math.min(1, sat * saturation / 100);
          [finalR, finalG, finalB] = this.hslToRgb(hue, sat, lit);
        }

        dstData.data[idx] = finalR;
        dstData.data[idx + 1] = finalG;
        dstData.data[idx + 2] = finalB;
        dstData.data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { brushSize: 4, intensity: 20, saturation: 120 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `oil_painting_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new OilPaintingTool());
