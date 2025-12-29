/**
 * IMG-249 圖片半色調效果工具
 */
class HalftoneTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      dotSize: 8,
      angle: 45,
      contrast: 100,
      dotColor: '#000000',
      bgColor: '#ffffff',
      cmykMode: false
    };
    this.mode = 'dots';
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

    document.getElementById('dotSize').addEventListener('input', (e) => {
      this.settings.dotSize = parseInt(e.target.value);
      document.getElementById('dotSizeValue').textContent = this.settings.dotSize;
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = this.settings.angle + '°';
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = this.settings.contrast + '%';
      this.render();
    });

    document.getElementById('dotColor').addEventListener('input', (e) => {
      this.settings.dotColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('cmykMode').addEventListener('change', (e) => {
      this.settings.cmykMode = e.target.checked;
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

  render() {
    if (!this.originalImage) return;
    const { dotSize, angle, contrast, dotColor, bgColor, cmykMode } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Draw original to get pixel data
    this.ctx.drawImage(this.originalImage, 0, 0);
    const srcData = this.ctx.getImageData(0, 0, w, h);

    // Fill background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    const contrastFactor = contrast / 100;
    const dotColorRgb = this.hexToRgb(dotColor);
    const rad = (angle * Math.PI) / 180;

    if (cmykMode) {
      this.renderCMYK(srcData, w, h, dotSize, contrastFactor);
    } else {
      this.renderMonochrome(srcData, w, h, dotSize, rad, contrastFactor, dotColorRgb);
    }
  }

  renderMonochrome(srcData, w, h, dotSize, rad, contrastFactor, dotColorRgb) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let y = -dotSize; y < h + dotSize * 2; y += dotSize) {
      for (let x = -dotSize; x < w + dotSize * 2; x += dotSize) {
        // Rotate coordinates
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;

        // Get sample point
        const sx = Math.floor(x);
        const sy = Math.floor(y);

        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
          const idx = (sy * w + sx) * 4;
          const gray = (srcData.data[idx] * 0.299 + srcData.data[idx + 1] * 0.587 + srcData.data[idx + 2] * 0.114) / 255;

          // Apply contrast
          let adjustedGray = ((gray - 0.5) * contrastFactor) + 0.5;
          adjustedGray = Math.max(0, Math.min(1, adjustedGray));

          const radius = (1 - adjustedGray) * dotSize * 0.5;

          if (radius > 0.5) {
            this.ctx.fillStyle = `rgb(${dotColorRgb.r}, ${dotColorRgb.g}, ${dotColorRgb.b})`;

            if (this.mode === 'dots') {
              this.ctx.beginPath();
              this.ctx.arc(x, y, radius, 0, Math.PI * 2);
              this.ctx.fill();
            } else if (this.mode === 'lines') {
              this.ctx.save();
              this.ctx.translate(x, y);
              this.ctx.rotate(rad);
              this.ctx.fillRect(-radius, -dotSize / 2, radius * 2, dotSize);
              this.ctx.restore();
            } else if (this.mode === 'squares') {
              this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            }
          }
        }
      }
    }
  }

  renderCMYK(srcData, w, h, dotSize, contrastFactor) {
    const channels = [
      { color: 'cyan', angle: 15, r: 0, g: 255, b: 255 },
      { color: 'magenta', angle: 75, r: 255, g: 0, b: 255 },
      { color: 'yellow', angle: 0, r: 255, g: 255, b: 0 },
      { color: 'black', angle: 45, r: 0, g: 0, b: 0 }
    ];

    this.ctx.globalCompositeOperation = 'multiply';

    for (const channel of channels) {
      const rad = (channel.angle * Math.PI) / 180;

      for (let y = 0; y < h; y += dotSize) {
        for (let x = 0; x < w; x += dotSize) {
          const idx = (y * w + x) * 4;
          const r = srcData.data[idx];
          const g = srcData.data[idx + 1];
          const b = srcData.data[idx + 2];

          // Convert RGB to CMYK
          const k = 1 - Math.max(r, g, b) / 255;
          let value;

          if (channel.color === 'cyan') {
            value = k < 1 ? (1 - r / 255 - k) / (1 - k) : 0;
          } else if (channel.color === 'magenta') {
            value = k < 1 ? (1 - g / 255 - k) / (1 - k) : 0;
          } else if (channel.color === 'yellow') {
            value = k < 1 ? (1 - b / 255 - k) / (1 - k) : 0;
          } else {
            value = k;
          }

          value = ((value - 0.5) * contrastFactor) + 0.5;
          value = Math.max(0, Math.min(1, value));

          const radius = value * dotSize * 0.5;

          if (radius > 0.5) {
            this.ctx.fillStyle = `rgb(${channel.r}, ${channel.g}, ${channel.b})`;
            this.ctx.beginPath();
            this.ctx.arc(x + dotSize / 2, y + dotSize / 2, radius, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  reset() {
    this.originalImage = null;
    this.settings = { dotSize: 8, angle: 45, contrast: 100, dotColor: '#000000', bgColor: '#ffffff', cmykMode: false };
    this.mode = 'dots';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('dotSize').value = 8;
    document.getElementById('dotSizeValue').textContent = '8';
    document.getElementById('angle').value = 45;
    document.getElementById('angleValue').textContent = '45°';
    document.getElementById('contrast').value = 100;
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('dotColor').value = '#000000';
    document.getElementById('bgColor').value = '#ffffff';
    document.getElementById('cmykMode').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `halftone_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new HalftoneTool());
