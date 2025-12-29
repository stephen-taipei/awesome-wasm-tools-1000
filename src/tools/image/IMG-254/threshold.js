/**
 * IMG-254 圖片閾值處理工具
 */
class ThresholdTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      threshold: 128,
      blockSize: 11,
      constant: 2,
      fgColor: '#000000',
      bgColor: '#ffffff',
      invertColors: false
    };
    this.mode = 'global';
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateModeUI();
  }

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
        this.updateModeUI();
        this.render();
      });
    });

    document.getElementById('autoThreshold').addEventListener('click', () => {
      this.calculateOptimalThreshold();
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('blockSize').addEventListener('input', (e) => {
      this.settings.blockSize = parseInt(e.target.value);
      document.getElementById('blockSizeValue').textContent = this.settings.blockSize;
      this.render();
    });

    document.getElementById('constant').addEventListener('input', (e) => {
      this.settings.constant = parseInt(e.target.value);
      document.getElementById('constantValue').textContent = this.settings.constant;
      this.render();
    });

    document.getElementById('fgColor').addEventListener('input', (e) => {
      this.settings.fgColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('invertColors').addEventListener('change', (e) => {
      this.settings.invertColors = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateModeUI() {
    const blockSizeGroup = document.getElementById('blockSizeGroup');
    const constantGroup = document.getElementById('constantGroup');
    const thresholdSlider = document.getElementById('threshold');
    const autoBtn = document.getElementById('autoThreshold');

    if (this.mode === 'adaptive') {
      blockSizeGroup.style.display = 'block';
      constantGroup.style.display = 'block';
      thresholdSlider.parentElement.style.display = 'none';
      autoBtn.style.display = 'none';
    } else if (this.mode === 'otsu') {
      blockSizeGroup.style.display = 'none';
      constantGroup.style.display = 'none';
      thresholdSlider.parentElement.style.display = 'none';
      autoBtn.style.display = 'none';
    } else {
      blockSizeGroup.style.display = 'none';
      constantGroup.style.display = 'none';
      thresholdSlider.parentElement.style.display = 'block';
      autoBtn.style.display = 'block';
    }
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

  calculateOptimalThreshold() {
    if (!this.originalImage) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.ctx.drawImage(this.originalImage, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Build histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[gray]++;
    }

    // Find optimal threshold using Otsu's method
    const total = w * h;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      const wF = total - wB;
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

    this.settings.threshold = threshold;
    document.getElementById('threshold').value = threshold;
    document.getElementById('thresholdValue').textContent = threshold;
    this.render();
  }

  render() {
    if (!this.originalImage) return;
    const { threshold, blockSize, constant, fgColor, bgColor, invertColors } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const fg = this.hexToRgb(fgColor);
    const bg = this.hexToRgb(bgColor);

    // Convert to grayscale array
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    let thresholdMap;

    if (this.mode === 'adaptive') {
      thresholdMap = this.adaptiveThreshold(gray, w, h, blockSize, constant);
    } else if (this.mode === 'otsu') {
      // Calculate Otsu threshold
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < gray.length; i++) {
        histogram[Math.round(gray[i])]++;
      }

      const total = w * h;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];

      let sumB = 0, wB = 0, maxVar = 0, otsuThresh = 0;
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVar) { maxVar = variance; otsuThresh = t; }
      }

      thresholdMap = new Float32Array(w * h).fill(otsuThresh);
    } else {
      thresholdMap = new Float32Array(w * h).fill(threshold);
    }

    // Apply threshold
    for (let i = 0; i < gray.length; i++) {
      let isAbove = gray[i] > thresholdMap[i];
      if (invertColors) isAbove = !isAbove;

      const color = isAbove ? bg : fg;
      const idx = i * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  adaptiveThreshold(gray, w, h, blockSize, constant) {
    const thresholdMap = new Float32Array(w * h);
    const halfBlock = Math.floor(blockSize / 2);

    // Create integral image for fast box filtering
    const integral = new Float32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        integral[(y + 1) * (w + 1) + (x + 1)] = gray[y * w + x] +
          integral[y * (w + 1) + (x + 1)] +
          integral[(y + 1) * (w + 1) + x] -
          integral[y * (w + 1) + x];
      }
    }

    // Calculate local mean threshold
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - halfBlock);
        const y1 = Math.max(0, y - halfBlock);
        const x2 = Math.min(w - 1, x + halfBlock);
        const y2 = Math.min(h - 1, y + halfBlock);

        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
                   integral[y1 * (w + 1) + (x2 + 1)] -
                   integral[(y2 + 1) * (w + 1) + x1] +
                   integral[y1 * (w + 1) + x1];

        thresholdMap[y * w + x] = (sum / count) - constant;
      }
    }

    return thresholdMap;
  }

  reset() {
    this.originalImage = null;
    this.settings = { threshold: 128, blockSize: 11, constant: 2, fgColor: '#000000', bgColor: '#ffffff', invertColors: false };
    this.mode = 'global';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('threshold').value = 128;
    document.getElementById('thresholdValue').textContent = '128';
    document.getElementById('blockSize').value = 11;
    document.getElementById('blockSizeValue').textContent = '11';
    document.getElementById('constant').value = 2;
    document.getElementById('constantValue').textContent = '2';
    document.getElementById('fgColor').value = '#000000';
    document.getElementById('bgColor').value = '#ffffff';
    document.getElementById('invertColors').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    this.updateModeUI();
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
