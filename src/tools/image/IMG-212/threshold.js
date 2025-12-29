/**
 * IMG-212 圖片閾值工具
 */
class ThresholdTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { mode: 'manual', threshold: 128, lowColor: '#000000', highColor: '#ffffff' };
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

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mode = btn.dataset.mode;
        document.getElementById('thresholdGroup').style.display =
          this.settings.mode === 'manual' ? 'block' : 'none';
        this.render();
      });
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('lowColor').addEventListener('input', (e) => {
      this.settings.lowColor = e.target.value;
      this.render();
    });

    document.getElementById('highColor').addEventListener('input', (e) => {
      this.settings.highColor = e.target.value;
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  calculateOtsuThreshold(histogram, totalPixels) {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    return threshold;
  }

  render() {
    if (!this.originalImage) return;
    const { mode, threshold, lowColor, highColor } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const lowRgb = this.hexToRgb(lowColor);
    const highRgb = this.hexToRgb(highColor);

    // Build histogram for Otsu
    let actualThreshold = threshold;
    if (mode === 'otsu') {
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogram[lum]++;
      }
      actualThreshold = this.calculateOtsuThreshold(histogram, w * h);
      document.getElementById('thresholdValue').textContent = actualThreshold + ' (auto)';
    }

    if (mode === 'adaptive') {
      // Adaptive thresholding
      const blockSize = 15;
      const C = 5;
      const grayscale = new Uint8Array(w * h);

      // Convert to grayscale
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        grayscale[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Apply adaptive threshold
      const halfBlock = Math.floor(blockSize / 2);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Calculate local mean
          let sum = 0;
          let count = 0;
          for (let dy = -halfBlock; dy <= halfBlock; dy++) {
            for (let dx = -halfBlock; dx <= halfBlock; dx++) {
              const ny = Math.min(Math.max(y + dy, 0), h - 1);
              const nx = Math.min(Math.max(x + dx, 0), w - 1);
              sum += grayscale[ny * w + nx];
              count++;
            }
          }
          const localMean = sum / count;
          const idx = y * w + x;
          const i = idx * 4;
          const isHigh = grayscale[idx] > localMean - C;

          data[i] = isHigh ? highRgb.r : lowRgb.r;
          data[i + 1] = isHigh ? highRgb.g : lowRgb.g;
          data[i + 2] = isHigh ? highRgb.b : lowRgb.b;
        }
      }
    } else {
      // Manual or Otsu threshold
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const isHigh = lum >= actualThreshold;

        data[i] = isHigh ? highRgb.r : lowRgb.r;
        data[i + 1] = isHigh ? highRgb.g : lowRgb.g;
        data[i + 2] = isHigh ? highRgb.b : lowRgb.b;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { mode: 'manual', threshold: 128, lowColor: '#000000', highColor: '#ffffff' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('threshold').value = 128;
    document.getElementById('thresholdValue').textContent = '128';
    document.getElementById('thresholdGroup').style.display = 'block';
    document.getElementById('lowColor').value = '#000000';
    document.getElementById('highColor').value = '#ffffff';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="manual"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `threshold_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ThresholdTool());
