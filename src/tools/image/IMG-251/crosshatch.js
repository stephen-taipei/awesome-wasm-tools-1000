/**
 * IMG-251 圖片交叉影線工具
 */
class CrosshatchTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      spacing: 4,
      lineWidth: 1,
      density: 50,
      lineColor: '#000000',
      bgColor: '#ffffff',
      randomAngle: false
    };
    this.mode = 'cross';
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

    document.getElementById('spacing').addEventListener('input', (e) => {
      this.settings.spacing = parseInt(e.target.value);
      document.getElementById('spacingValue').textContent = this.settings.spacing;
      this.render();
    });

    document.getElementById('lineWidth').addEventListener('input', (e) => {
      this.settings.lineWidth = parseInt(e.target.value);
      document.getElementById('lineWidthValue').textContent = this.settings.lineWidth;
      this.render();
    });

    document.getElementById('density').addEventListener('input', (e) => {
      this.settings.density = parseInt(e.target.value);
      document.getElementById('densityValue').textContent = this.settings.density + '%';
      this.render();
    });

    document.getElementById('lineColor').addEventListener('input', (e) => {
      this.settings.lineColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('randomAngle').addEventListener('change', (e) => {
      this.settings.randomAngle = e.target.checked;
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

  render() {
    if (!this.originalImage) return;
    const { spacing, lineWidth, density, lineColor, bgColor, randomAngle } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Get source data
    this.ctx.drawImage(this.originalImage, 0, 0);
    const srcData = this.ctx.getImageData(0, 0, w, h);

    // Fill background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = lineColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';

    const densityThreshold = (100 - density) / 100 * 255;

    if (this.mode === 'stipple') {
      this.renderStipple(srcData, w, h, spacing, densityThreshold, lineColor);
    } else {
      this.renderLines(srcData, w, h, spacing, densityThreshold, randomAngle);
    }
  }

  renderLines(srcData, w, h, spacing, densityThreshold, randomAngle) {
    const cellSize = spacing * 2;

    for (let y = 0; y < h; y += cellSize) {
      for (let x = 0; x < w; x += cellSize) {
        // Get average brightness for this cell
        let totalBrightness = 0;
        let count = 0;

        for (let dy = 0; dy < cellSize && y + dy < h; dy++) {
          for (let dx = 0; dx < cellSize && x + dx < w; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            const gray = srcData.data[idx] * 0.299 + srcData.data[idx + 1] * 0.587 + srcData.data[idx + 2] * 0.114;
            totalBrightness += gray;
            count++;
          }
        }

        const avgBrightness = totalBrightness / count;
        const darkness = 255 - avgBrightness;

        // Determine number of hatching layers based on darkness
        let layers = 0;
        if (darkness > densityThreshold) layers = 1;
        if (darkness > densityThreshold + 60) layers = 2;
        if (darkness > densityThreshold + 120) layers = 3;
        if (darkness > densityThreshold + 180) layers = 4;

        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const baseAngle = randomAngle ? Math.random() * Math.PI : 0;

        // Draw hatching lines
        for (let layer = 0; layer < layers; layer++) {
          let angle;
          if (this.mode === 'cross') {
            angle = baseAngle + (layer * Math.PI / 4);
          } else { // diagonal
            angle = baseAngle + Math.PI / 4 + (layer * Math.PI / 2);
          }

          const length = cellSize * 0.7;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          this.ctx.beginPath();
          this.ctx.moveTo(cx - cos * length / 2, cy - sin * length / 2);
          this.ctx.lineTo(cx + cos * length / 2, cy + sin * length / 2);
          this.ctx.stroke();
        }
      }
    }
  }

  renderStipple(srcData, w, h, spacing, densityThreshold, lineColor) {
    this.ctx.fillStyle = lineColor;

    for (let y = 0; y < h; y += spacing) {
      for (let x = 0; x < w; x += spacing) {
        const idx = (y * w + x) * 4;
        const gray = srcData.data[idx] * 0.299 + srcData.data[idx + 1] * 0.587 + srcData.data[idx + 2] * 0.114;
        const darkness = 255 - gray;

        if (darkness > densityThreshold) {
          // More dots for darker areas
          const dotProbability = (darkness - densityThreshold) / (255 - densityThreshold);

          if (Math.random() < dotProbability) {
            const dotSize = 1 + (darkness / 255) * 2;
            const offsetX = (Math.random() - 0.5) * spacing * 0.5;
            const offsetY = (Math.random() - 0.5) * spacing * 0.5;

            this.ctx.beginPath();
            this.ctx.arc(x + offsetX, y + offsetY, dotSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { spacing: 4, lineWidth: 1, density: 50, lineColor: '#000000', bgColor: '#ffffff', randomAngle: false };
    this.mode = 'cross';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('spacing').value = 4;
    document.getElementById('spacingValue').textContent = '4';
    document.getElementById('lineWidth').value = 1;
    document.getElementById('lineWidthValue').textContent = '1';
    document.getElementById('density').value = 50;
    document.getElementById('densityValue').textContent = '50%';
    document.getElementById('lineColor').value = '#000000';
    document.getElementById('bgColor').value = '#ffffff';
    document.getElementById('randomAngle').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `crosshatch_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new CrosshatchTool());
