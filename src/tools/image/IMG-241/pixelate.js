/**
 * IMG-241 圖片像素化效果工具
 */
class PixelateTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { pixelSize: 8, colorCount: 0, showGrid: false };
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
        this.settings.pixelSize = parseInt(btn.dataset.size);
        document.getElementById('pixelSize').value = this.settings.pixelSize;
        document.getElementById('pixelSizeValue').textContent = this.settings.pixelSize + 'px';
        this.render();
      });
    });

    document.getElementById('pixelSize').addEventListener('input', (e) => {
      this.settings.pixelSize = parseInt(e.target.value);
      document.getElementById('pixelSizeValue').textContent = this.settings.pixelSize + 'px';
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('colorCount').addEventListener('input', (e) => {
      this.settings.colorCount = parseInt(e.target.value);
      document.getElementById('colorCountValue').textContent = this.settings.colorCount === 0 ? '無限制' : this.settings.colorCount;
      this.render();
    });

    document.getElementById('showGrid').addEventListener('change', (e) => {
      this.settings.showGrid = e.target.checked;
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

  quantizeColor(r, g, b, levels) {
    if (levels <= 0) return [r, g, b];
    const step = 256 / Math.cbrt(levels);
    return [
      Math.round(Math.floor(r / step) * step + step / 2),
      Math.round(Math.floor(g / step) * step + step / 2),
      Math.round(Math.floor(b / step) * step + step / 2)
    ];
  }

  render() {
    if (!this.originalImage) return;
    const { pixelSize, colorCount, showGrid } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Create temp canvas for sampling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, w, h);

    // Pixelate
    for (let y = 0; y < h; y += pixelSize) {
      for (let x = 0; x < w; x += pixelSize) {
        // Sample average color in block
        let totalR = 0, totalG = 0, totalB = 0, count = 0;

        for (let dy = 0; dy < pixelSize && y + dy < h; dy++) {
          for (let dx = 0; dx < pixelSize && x + dx < w; dx++) {
            const i = ((y + dy) * w + (x + dx)) * 4;
            totalR += srcData.data[i];
            totalG += srcData.data[i + 1];
            totalB += srcData.data[i + 2];
            count++;
          }
        }

        let avgR = Math.round(totalR / count);
        let avgG = Math.round(totalG / count);
        let avgB = Math.round(totalB / count);

        // Quantize colors if needed
        if (colorCount > 0) {
          [avgR, avgG, avgB] = this.quantizeColor(avgR, avgG, avgB, colorCount);
        }

        // Fill block with average color
        this.ctx.fillStyle = `rgb(${avgR},${avgG},${avgB})`;
        this.ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }

    // Draw grid if enabled
    if (showGrid) {
      this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      this.ctx.lineWidth = 1;

      for (let x = pixelSize; x < w; x += pixelSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }

      for (let y = pixelSize; y < h; y += pixelSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { pixelSize: 8, colorCount: 0, showGrid: false };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('pixelSize').value = 8;
    document.getElementById('pixelSizeValue').textContent = '8px';
    document.getElementById('colorCount').value = 0;
    document.getElementById('colorCountValue').textContent = '無限制';
    document.getElementById('showGrid').checked = false;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `pixelate_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new PixelateTool());
