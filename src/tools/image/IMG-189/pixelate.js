/**
 * IMG-189 圖片像素化工具
 */
class PixelateTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { pixelSize: 16, colors: 256 };
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
        this.settings.pixelSize = parseInt(btn.dataset.size);
        document.getElementById('pixelSize').value = this.settings.pixelSize;
        document.getElementById('pixelSizeValue').textContent = this.settings.pixelSize + ' px';
        this.render();
      });
    });

    document.getElementById('pixelSize').addEventListener('input', (e) => {
      this.settings.pixelSize = parseInt(e.target.value);
      document.getElementById('pixelSizeValue').textContent = this.settings.pixelSize + ' px';
      this.render();
    });

    document.getElementById('colors').addEventListener('input', (e) => {
      this.settings.colors = parseInt(e.target.value);
      document.getElementById('colorsValue').textContent = this.settings.colors;
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
        this.settings = { pixelSize: 16, colors: 256 };
        document.getElementById('pixelSize').value = 16;
        document.getElementById('pixelSizeValue').textContent = '16 px';
        document.getElementById('colors').value = 256;
        document.getElementById('colorsValue').textContent = '256';
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
    const { pixelSize, colors } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Calculate small size
    const smallW = Math.ceil(w / pixelSize);
    const smallH = Math.ceil(h / pixelSize);

    // Draw to small canvas
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = smallW;
    smallCanvas.height = smallH;
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(this.originalImage, 0, 0, smallW, smallH);

    // Reduce colors if needed
    if (colors < 256) {
      const imageData = smallCtx.getImageData(0, 0, smallW, smallH);
      const data = imageData.data;
      const step = 256 / Math.cbrt(colors);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
      }
      smallCtx.putImageData(imageData, 0, 0);
    }

    // Scale back up
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(smallCanvas, 0, 0, w, h);
  }

  reset() {
    this.originalImage = null;
    this.settings = { pixelSize: 16, colors: 256 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('pixelSize').value = 16;
    document.getElementById('pixelSizeValue').textContent = '16 px';
    document.getElementById('colors').value = 256;
    document.getElementById('colorsValue').textContent = '256';
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
