class PixelateTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      size: 8,
      colors: 0,
      grid: false,
      smooth: false
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
        this.settings.size = parseInt(btn.dataset.size);
        document.getElementById('size').value = this.settings.size;
        document.getElementById('sizeValue').textContent = `${this.settings.size} px`;
        this.render();
      });
    });

    document.getElementById('size').addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value);
      document.getElementById('sizeValue').textContent = `${this.settings.size} px`;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('colors').addEventListener('input', (e) => {
      this.settings.colors = parseInt(e.target.value);
      document.getElementById('colorsValue').textContent = this.settings.colors === 0 ? '無限' : this.settings.colors;
      this.render();
    });

    document.getElementById('gridCheck').addEventListener('change', (e) => {
      this.settings.grid = e.target.checked;
      this.render();
    });

    document.getElementById('smoothCheck').addEventListener('change', (e) => {
      this.settings.smooth = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
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

  quantizeColor(r, g, b, levels) {
    if (levels === 0) return { r, g, b };

    const step = 255 / (levels - 1);
    return {
      r: Math.round(r / step) * step,
      g: Math.round(g / step) * step,
      b: Math.round(b / step) * step
    };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const size = this.settings.size;

    if (this.settings.smooth) {
      // Method 1: Smooth scaling using canvas
      const smallCanvas = document.createElement('canvas');
      const smallWidth = Math.ceil(width / size);
      const smallHeight = Math.ceil(height / size);
      smallCanvas.width = smallWidth;
      smallCanvas.height = smallHeight;
      const smallCtx = smallCanvas.getContext('2d');

      smallCtx.imageSmoothingEnabled = true;
      smallCtx.drawImage(this.originalImage, 0, 0, smallWidth, smallHeight);

      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight, 0, 0, width, height);
    } else {
      // Method 2: Manual pixelation
      const outputData = this.ctx.createImageData(width, height);
      const colorLevels = this.settings.colors > 0 ? Math.round(Math.pow(this.settings.colors, 1/3)) : 0;

      for (let py = 0; py < height; py += size) {
        for (let px = 0; px < width; px += size) {
          // Sample center of block
          let sumR = 0, sumG = 0, sumB = 0, count = 0;

          for (let dy = 0; dy < size && py + dy < height; dy++) {
            for (let dx = 0; dx < size && px + dx < width; dx++) {
              const idx = ((py + dy) * width + (px + dx)) * 4;
              sumR += srcData[idx];
              sumG += srcData[idx + 1];
              sumB += srcData[idx + 2];
              count++;
            }
          }

          let avgR = sumR / count;
          let avgG = sumG / count;
          let avgB = sumB / count;

          // Quantize colors if needed
          if (colorLevels > 0) {
            const quantized = this.quantizeColor(avgR, avgG, avgB, colorLevels);
            avgR = quantized.r;
            avgG = quantized.g;
            avgB = quantized.b;
          }

          // Fill block
          for (let dy = 0; dy < size && py + dy < height; dy++) {
            for (let dx = 0; dx < size && px + dx < width; dx++) {
              const idx = ((py + dy) * width + (px + dx)) * 4;
              outputData.data[idx] = avgR;
              outputData.data[idx + 1] = avgG;
              outputData.data[idx + 2] = avgB;
              outputData.data[idx + 3] = 255;
            }
          }
        }
      }

      this.ctx.putImageData(outputData, 0, 0);
    }

    // Draw grid
    if (this.settings.grid) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
      }

      for (let y = 0; y <= height; y += size) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'pixelated-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { size: 8, colors: 0, grid: false, smooth: false };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-size="8"]').classList.add('active');
    document.getElementById('size').value = 8;
    document.getElementById('sizeValue').textContent = '8 px';
    document.getElementById('colors').value = 0;
    document.getElementById('colorsValue').textContent = '無限';
    document.getElementById('gridCheck').checked = false;
    document.getElementById('smoothCheck').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PixelateTool();
});
