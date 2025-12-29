/**
 * IMG-224 圖片局部模糊工具
 */
class SelectiveBlurTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { brushSize: 40, blurAmount: 10, feather: 50 };
    this.isDrawing = false;
    this.mask = null;
    this.blurredCanvas = null;
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

    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    });

    document.getElementById('blurAmount').addEventListener('input', (e) => {
      this.settings.blurAmount = parseInt(e.target.value);
      document.getElementById('blurAmountValue').textContent = this.settings.blurAmount;
      this.createBlurredVersion();
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather + '%';
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => { this.isDrawing = true; this.brushAt(e); });
    this.canvas.addEventListener('mousemove', (e) => { if (this.isDrawing) this.brushAt(e); });
    this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
    this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);

    document.getElementById('clearBtn').addEventListener('click', () => this.clearMask());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
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
        this.initMask();
        this.createBlurredVersion();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initMask() {
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.mask = new Float32Array(w * h);
  }

  createBlurredVersion() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.blurredCanvas = document.createElement('canvas');
    this.blurredCanvas.width = w;
    this.blurredCanvas.height = h;
    const blurCtx = this.blurredCanvas.getContext('2d');

    // Use CSS filter for blur
    blurCtx.filter = `blur(${this.settings.blurAmount}px)`;
    blurCtx.drawImage(this.originalImage, 0, 0);
    blurCtx.filter = 'none';
  }

  brushAt(e) {
    const pos = this.getCanvasPos(e);
    const r = this.settings.brushSize / 2;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const feather = this.settings.feather / 100;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          const px = Math.floor(pos.x + dx);
          const py = Math.floor(pos.y + dy);
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const idx = py * w + px;
            // Feathered brush
            let strength = 1;
            if (feather > 0) {
              const edgeDist = r - dist;
              const featherZone = r * feather;
              if (edgeDist < featherZone) {
                strength = edgeDist / featherZone;
              }
            }
            this.mask[idx] = Math.max(this.mask[idx], strength);
          }
        }
      }
    }

    this.render();
  }

  render() {
    if (!this.originalImage || !this.blurredCanvas) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw original
    this.ctx.drawImage(this.originalImage, 0, 0);
    const originalData = this.ctx.getImageData(0, 0, w, h);

    // Get blurred data
    const blurCtx = this.blurredCanvas.getContext('2d');
    const blurredData = blurCtx.getImageData(0, 0, w, h);

    // Blend based on mask
    for (let i = 0; i < this.mask.length; i++) {
      const maskValue = this.mask[i];
      if (maskValue > 0) {
        const pi = i * 4;
        originalData.data[pi] = originalData.data[pi] * (1 - maskValue) + blurredData.data[pi] * maskValue;
        originalData.data[pi + 1] = originalData.data[pi + 1] * (1 - maskValue) + blurredData.data[pi + 1] * maskValue;
        originalData.data[pi + 2] = originalData.data[pi + 2] * (1 - maskValue) + blurredData.data[pi + 2] * maskValue;
      }
    }

    this.ctx.putImageData(originalData, 0, 0);
  }

  clearMask() {
    if (this.mask) {
      this.mask.fill(0);
      this.render();
    }
  }

  reset() {
    this.originalImage = null;
    this.mask = null;
    this.blurredCanvas = null;
    this.settings = { brushSize: 40, blurAmount: 10, feather: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('brushSize').value = 40;
    document.getElementById('brushSizeValue').textContent = '40';
    document.getElementById('blurAmount').value = 10;
    document.getElementById('blurAmountValue').textContent = '10';
    document.getElementById('feather').value = 50;
    document.getElementById('featherValue').textContent = '50%';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `selective_blur_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SelectiveBlurTool());
