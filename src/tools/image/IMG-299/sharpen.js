class SharpenTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      amount: 100,
      radius: 1,
      threshold: 0,
      luminosityOnly: true
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = `${this.settings.amount}%`;
      this.render();
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.radius;
      this.render();
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('luminosityCheck').addEventListener('change', (e) => {
      this.settings.luminosityOnly = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    const presets = {
      subtle: { amount: 50, radius: 1, threshold: 5 },
      normal: { amount: 100, radius: 1, threshold: 0 },
      strong: { amount: 200, radius: 2, threshold: 0 }
    };

    const p = presets[preset];
    this.settings.amount = p.amount;
    this.settings.radius = p.radius;
    this.settings.threshold = p.threshold;

    document.getElementById('amount').value = p.amount;
    document.getElementById('amountValue').textContent = `${p.amount}%`;
    document.getElementById('radius').value = p.radius;
    document.getElementById('radiusValue').textContent = p.radius;
    document.getElementById('threshold').value = p.threshold;
    document.getElementById('thresholdValue').textContent = p.threshold;

    this.render();
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

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

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h, s, l };
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
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
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  gaussianBlur(data, width, height, radius) {
    const size = radius * 2 + 1;
    const kernel = [];
    let sum = 0;
    const sigma = radius / 3;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const g = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel.push(g);
      sum += g;
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;

    const temp = new Float32Array(data.length);
    const result = new Float32Array(data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0;
        for (let k = 0; k < size; k++) {
          const px = Math.max(0, Math.min(width - 1, x + k - radius));
          const idx = (y * width + px) * 4;
          sumR += data[idx] * kernel[k];
          sumG += data[idx + 1] * kernel[k];
          sumB += data[idx + 2] * kernel[k];
        }
        const idx = (y * width + x) * 4;
        temp[idx] = sumR;
        temp[idx + 1] = sumG;
        temp[idx + 2] = sumB;
        temp[idx + 3] = data[idx + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0;
        for (let k = 0; k < size; k++) {
          const py = Math.max(0, Math.min(height - 1, y + k - radius));
          const idx = (py * width + x) * 4;
          sumR += temp[idx] * kernel[k];
          sumG += temp[idx + 1] * kernel[k];
          sumB += temp[idx + 2] * kernel[k];
        }
        const idx = (y * width + x) * 4;
        result[idx] = sumR;
        result[idx + 1] = sumG;
        result[idx + 2] = sumB;
        result[idx + 3] = temp[idx + 3];
      }
    }

    return result;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = new Float32Array(this.imageData.data);

    // Unsharp mask: original + amount * (original - blurred)
    const blurred = this.gaussianBlur(srcData, width, height, this.settings.radius);
    const outputData = this.ctx.createImageData(width, height);
    const amount = this.settings.amount / 100;
    const threshold = this.settings.threshold;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;

      if (this.settings.luminosityOnly) {
        // Convert to HSL, sharpen L only
        const hsl = this.rgbToHsl(srcData[idx], srcData[idx + 1], srcData[idx + 2]);
        const blurHsl = this.rgbToHsl(blurred[idx], blurred[idx + 1], blurred[idx + 2]);

        const diff = hsl.l - blurHsl.l;
        if (Math.abs(diff) * 255 > threshold) {
          hsl.l = Math.max(0, Math.min(1, hsl.l + diff * amount));
        }

        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        outputData.data[idx] = Math.max(0, Math.min(255, rgb.r));
        outputData.data[idx + 1] = Math.max(0, Math.min(255, rgb.g));
        outputData.data[idx + 2] = Math.max(0, Math.min(255, rgb.b));
      } else {
        // Sharpen all channels
        let r = srcData[idx];
        let g = srcData[idx + 1];
        let b = srcData[idx + 2];

        const diffR = r - blurred[idx];
        const diffG = g - blurred[idx + 1];
        const diffB = b - blurred[idx + 2];

        const avgDiff = (Math.abs(diffR) + Math.abs(diffG) + Math.abs(diffB)) / 3;

        if (avgDiff > threshold) {
          r = r + diffR * amount;
          g = g + diffG * amount;
          b = b + diffB * amount;
        }

        outputData.data[idx] = Math.max(0, Math.min(255, r));
        outputData.data[idx + 1] = Math.max(0, Math.min(255, g));
        outputData.data[idx + 2] = Math.max(0, Math.min(255, b));
      }

      outputData.data[idx + 3] = this.imageData.data[idx + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'sharpened-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { amount: 100, radius: 1, threshold: 0, luminosityOnly: true };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="normal"]').classList.add('active');
    document.getElementById('amount').value = 100;
    document.getElementById('amountValue').textContent = '100%';
    document.getElementById('radius').value = 1;
    document.getElementById('radiusValue').textContent = '1';
    document.getElementById('threshold').value = 0;
    document.getElementById('thresholdValue').textContent = '0';
    document.getElementById('luminosityCheck').checked = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SharpenTool();
});
