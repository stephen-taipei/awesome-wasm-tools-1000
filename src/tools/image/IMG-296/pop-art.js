class PopArtTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      style: 'warhol',
      saturation: 150,
      contrast: 130,
      levels: 4,
      colors: ['#ff0080', '#00ffff', '#ffff00', '#ff00ff']
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateColorSwatches();
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

    // Style buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.style = btn.dataset.style;
        this.render();
      });
    });

    // Sliders
    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = `${this.settings.saturation}%`;
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = `${this.settings.contrast}%`;
      this.render();
    });

    document.getElementById('levels').addEventListener('input', (e) => {
      this.settings.levels = parseInt(e.target.value);
      document.getElementById('levelsValue').textContent = this.settings.levels;
      this.render();
    });

    // Color palette
    document.querySelectorAll('.color-swatch input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.settings.colors[idx] = e.target.value;
        this.updateColorSwatches();
        this.render();
      });
    });

    // Random button
    document.getElementById('randomBtn').addEventListener('click', () => this.randomColors());

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateColorSwatches() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach((swatch, idx) => {
      swatch.style.background = this.settings.colors[idx];
      swatch.querySelector('input').value = this.settings.colors[idx];
    });
  }

  randomColors() {
    const hues = [];
    for (let i = 0; i < 4; i++) {
      hues.push(Math.random() * 360);
    }

    this.settings.colors = hues.map(h => {
      const s = 80 + Math.random() * 20;
      const l = 50 + Math.random() * 20;
      return this.hslToHex(h, s, l);
    });

    this.updateColorSwatches();
    this.render();
  }

  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
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

  processImage(tintColor) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const output = new Uint8ClampedArray(srcData.length);

    const tint = this.hexToRgb(tintColor);
    const satFactor = this.settings.saturation / 100;
    const contrastFactor = this.settings.contrast / 100;
    const levels = this.settings.levels;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Apply contrast
      r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

      // Posterize
      const step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;

      // Clamp
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // Calculate luminosity
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Mix with tint color based on luminosity
      const mixR = lum * tint.r + (1 - lum) * (255 - tint.r) * 0.3;
      const mixG = lum * tint.g + (1 - lum) * (255 - tint.g) * 0.3;
      const mixB = lum * tint.b + (1 - lum) * (255 - tint.b) * 0.3;

      // Boost saturation
      const gray = 0.299 * mixR + 0.587 * mixG + 0.114 * mixB;
      output[i] = Math.max(0, Math.min(255, gray + (mixR - gray) * satFactor));
      output[i + 1] = Math.max(0, Math.min(255, gray + (mixG - gray) * satFactor));
      output[i + 2] = Math.max(0, Math.min(255, gray + (mixB - gray) * satFactor));
      output[i + 3] = srcData[i + 3];
    }

    return output;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    switch (this.settings.style) {
      case 'warhol':
        this.renderWarhol();
        break;
      case 'lichtenstein':
        this.renderLichtenstein();
        break;
      case 'duotone':
        this.renderDuotone();
        break;
      case 'quadrant':
        this.renderQuadrant();
        break;
    }
  }

  renderWarhol() {
    const processed = this.processImage(this.settings.colors[0]);
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    for (let i = 0; i < processed.length; i++) {
      outputData.data[i] = processed[i];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  renderLichtenstein() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;

    // First posterize and apply halftone effect
    const dotSize = Math.max(4, Math.floor(Math.min(width, height) / 100));
    const tint = this.hexToRgb(this.settings.colors[0]);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += dotSize) {
      for (let x = 0; x < width; x += dotSize) {
        const idx = (y * width + x) * 4;
        const lum = (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255;

        // Posterize luminosity
        const posterLum = Math.round(lum * (this.settings.levels - 1)) / (this.settings.levels - 1);
        const radius = (1 - posterLum) * dotSize * 0.5;

        if (radius > 0.5) {
          const mixR = posterLum * tint.r + (1 - posterLum) * 0;
          const mixG = posterLum * tint.g + (1 - posterLum) * 0;
          const mixB = posterLum * tint.b + (1 - posterLum) * 0;

          this.ctx.fillStyle = `rgb(${mixR}, ${mixG}, ${mixB})`;
          this.ctx.beginPath();
          this.ctx.arc(x + dotSize / 2, y + dotSize / 2, radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  renderDuotone() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const color1 = this.hexToRgb(this.settings.colors[0]);
    const color2 = this.hexToRgb(this.settings.colors[1]);
    const contrastFactor = this.settings.contrast / 100;

    for (let i = 0; i < srcData.length; i += 4) {
      let lum = (0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2]) / 255;

      // Apply contrast
      lum = (lum - 0.5) * contrastFactor + 0.5;
      lum = Math.max(0, Math.min(1, lum));

      // Interpolate between two colors
      outputData.data[i] = color1.r * (1 - lum) + color2.r * lum;
      outputData.data[i + 1] = color1.g * (1 - lum) + color2.g * lum;
      outputData.data[i + 2] = color1.b * (1 - lum) + color2.b * lum;
      outputData.data[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  renderQuadrant() {
    const origWidth = this.originalImage.width;
    const origHeight = this.originalImage.height;

    // Double canvas size for 2x2 grid
    this.canvas.width = origWidth * 2;
    this.canvas.height = origHeight * 2;

    const positions = [
      { x: 0, y: 0 },
      { x: origWidth, y: 0 },
      { x: 0, y: origHeight },
      { x: origWidth, y: origHeight }
    ];

    positions.forEach((pos, idx) => {
      const processed = this.processImage(this.settings.colors[idx]);
      const imageData = new ImageData(new Uint8ClampedArray(processed), origWidth, origHeight);

      this.ctx.putImageData(imageData, pos.x, pos.y);
    });
  }

  download() {
    const link = document.createElement('a');
    link.download = 'pop-art-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      style: 'warhol',
      saturation: 150,
      contrast: 130,
      levels: 4,
      colors: ['#ff0080', '#00ffff', '#ffff00', '#ff00ff']
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.style-btn[data-style="warhol"]').classList.add('active');
    document.getElementById('saturation').value = 150;
    document.getElementById('saturationValue').textContent = '150%';
    document.getElementById('contrast').value = 130;
    document.getElementById('contrastValue').textContent = '130%';
    document.getElementById('levels').value = 4;
    document.getElementById('levelsValue').textContent = '4';
    this.updateColorSwatches();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopArtTool();
});
