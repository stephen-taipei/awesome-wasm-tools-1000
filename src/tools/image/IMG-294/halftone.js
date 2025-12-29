class HalftoneTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      shape: 'circle',
      dotSize: 8,
      angle: 45,
      contrast: 100,
      dotColor: '#000000',
      bgColor: '#ffffff'
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

    // Shape select
    document.getElementById('shapeSelect').addEventListener('change', (e) => {
      this.settings.shape = e.target.value;
      this.render();
    });

    // Sliders
    document.getElementById('dotSize').addEventListener('input', (e) => {
      this.settings.dotSize = parseInt(e.target.value);
      document.getElementById('dotSizeValue').textContent = this.settings.dotSize;
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = `${this.settings.contrast}%`;
      this.render();
    });

    // Color inputs
    document.getElementById('dotColor').addEventListener('input', (e) => {
      this.settings.dotColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const dotSize = this.settings.dotSize;
    const angle = this.settings.angle * Math.PI / 180;
    const contrastFactor = this.settings.contrast / 100;

    // Fill background
    const bgColor = this.hexToRgb(this.settings.bgColor);
    const dotColor = this.hexToRgb(this.settings.dotColor);

    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = this.settings.dotColor;

    // Calculate rotated grid
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Expand bounds for rotation
    const maxDim = Math.sqrt(width * width + height * height);

    for (let gy = -maxDim; gy < maxDim; gy += dotSize) {
      for (let gx = -maxDim; gx < maxDim; gx += dotSize) {
        // Rotate grid point
        const rx = gx * cos - gy * sin + width / 2;
        const ry = gx * sin + gy * cos + height / 2;

        if (rx < -dotSize || rx >= width + dotSize || ry < -dotSize || ry >= height + dotSize) {
          continue;
        }

        // Sample brightness at this point
        const sx = Math.floor(rx);
        const sy = Math.floor(ry);

        if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

        const idx = (sy * width + sx) * 4;
        let brightness = (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255;

        // Apply contrast
        brightness = ((brightness - 0.5) * contrastFactor + 0.5);
        brightness = Math.max(0, Math.min(1, brightness));

        // Invert so dark = larger dots
        const dotRadius = ((1 - brightness) * dotSize * 0.5);

        if (dotRadius < 0.5) continue;

        this.ctx.beginPath();

        switch (this.settings.shape) {
          case 'circle':
            this.ctx.arc(rx, ry, dotRadius, 0, Math.PI * 2);
            break;
          case 'square':
            this.ctx.rect(rx - dotRadius, ry - dotRadius, dotRadius * 2, dotRadius * 2);
            break;
          case 'diamond':
            this.ctx.moveTo(rx, ry - dotRadius);
            this.ctx.lineTo(rx + dotRadius, ry);
            this.ctx.lineTo(rx, ry + dotRadius);
            this.ctx.lineTo(rx - dotRadius, ry);
            this.ctx.closePath();
            break;
          case 'line':
            this.ctx.save();
            this.ctx.translate(rx, ry);
            this.ctx.rotate(angle);
            this.ctx.fillRect(-dotSize / 2, -dotRadius, dotSize, dotRadius * 2);
            this.ctx.restore();
            break;
        }

        if (this.settings.shape !== 'line') {
          this.ctx.fill();
        }
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'halftone-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      shape: 'circle',
      dotSize: 8,
      angle: 45,
      contrast: 100,
      dotColor: '#000000',
      bgColor: '#ffffff'
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('shapeSelect').value = 'circle';
    document.getElementById('dotSize').value = 8;
    document.getElementById('dotSizeValue').textContent = '8';
    document.getElementById('angle').value = 45;
    document.getElementById('angleValue').textContent = '45°';
    document.getElementById('contrast').value = 100;
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('dotColor').value = '#000000';
    document.getElementById('bgColor').value = '#ffffff';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new HalftoneTool();
});
