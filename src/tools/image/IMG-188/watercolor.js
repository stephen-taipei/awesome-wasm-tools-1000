/**
 * IMG-188 圖片水彩效果工具
 */
class WatercolorTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { blur: 5, saturation: 120, edge: 30 };
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

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = this.settings.saturation + '%';
      this.render();
    });

    document.getElementById('edge').addEventListener('input', (e) => {
      this.settings.edge = parseInt(e.target.value);
      document.getElementById('edgeValue').textContent = this.settings.edge + '%';
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
        this.settings = { blur: 5, saturation: 120, edge: 30 };
        document.getElementById('blur').value = 5;
        document.getElementById('blurValue').textContent = '5';
        document.getElementById('saturation').value = 120;
        document.getElementById('saturationValue').textContent = '120%';
        document.getElementById('edge').value = 30;
        document.getElementById('edgeValue').textContent = '30%';
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
    const { blur, saturation, edge } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw and blur
    this.ctx.filter = `blur(${blur}px) saturate(${saturation}%)`;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';

    if (edge > 0) {
      // Get blurred image data
      const blurred = this.ctx.getImageData(0, 0, w, h);

      // Get edge detection from original
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0);
      const original = tempCtx.getImageData(0, 0, w, h);

      // Detect edges and overlay
      const edges = this.detectEdges(original, w, h);
      const edgeStrength = edge / 100;

      for (let i = 0; i < blurred.data.length; i += 4) {
        const edgeVal = edges[i / 4];
        if (edgeVal < 128) {
          const factor = (1 - edgeVal / 128) * edgeStrength;
          blurred.data[i] = Math.max(0, blurred.data[i] - factor * 50);
          blurred.data[i + 1] = Math.max(0, blurred.data[i + 1] - factor * 50);
          blurred.data[i + 2] = Math.max(0, blurred.data[i + 2] - factor * 50);
        }
      }

      this.ctx.putImageData(blurred, 0, 0);
    }
  }

  detectEdges(imageData, w, h) {
    const data = imageData.data;
    const edges = new Float32Array(w * h);

    // Sobel operator
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const i = ((y + ky) * w + (x + kx)) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const ki = (ky + 1) * 3 + (kx + 1);
            gx += gray * sobelX[ki];
            gy += gray * sobelY[ki];
          }
        }
        edges[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      }
    }

    return edges;
  }

  reset() {
    this.originalImage = null;
    this.settings = { blur: 5, saturation: 120, edge: 30 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('blur').value = 5;
    document.getElementById('blurValue').textContent = '5';
    document.getElementById('saturation').value = 120;
    document.getElementById('saturationValue').textContent = '120%';
    document.getElementById('edge').value = 30;
    document.getElementById('edgeValue').textContent = '30%';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `watercolor_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new WatercolorTool());
