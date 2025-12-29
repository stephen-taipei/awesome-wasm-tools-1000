/**
 * IMG-238 圖片球面效果工具
 */
class SpherizeTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { strength: 50, radius: 80, centerX: 50, centerY: 50 };
    this.mode = 'bulge';
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

    ['strength', 'radius', 'centerX', 'centerY'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id] + '%';
        this.render();
      });
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
    const { strength, radius, centerX, centerY } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Create source canvas
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(this.originalImage, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, w, h);

    // Setup destination
    this.canvas.width = w;
    this.canvas.height = h;
    const dstData = this.ctx.createImageData(w, h);

    const cx = w * centerX / 100;
    const cy = h * centerY / 100;
    const maxRadius = Math.min(w, h) * radius / 200;
    const k = strength / 100;
    const isBulge = this.mode === 'bulge';

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normDist = dist / maxRadius;

        let srcX, srcY;

        if (normDist <= 1 && k > 0 && dist > 0) {
          // Calculate spherical distortion
          let factor;
          if (isBulge) {
            // Bulge: magnify center
            const theta = normDist * Math.PI / 2;
            factor = Math.sin(theta) / normDist;
            factor = 1 + (factor - 1) * k;
          } else {
            // Pinch: shrink center
            factor = Math.pow(normDist, 1 + k);
            factor = factor / normDist;
          }

          srcX = cx + dx * factor;
          srcY = cy + dy * factor;
        } else {
          srcX = x;
          srcY = y;
        }

        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const xWeight = srcX - x0;
        const yWeight = srcY - y0;

        const dstIdx = (y * w + x) * 4;

        if (x0 >= 0 && x1 < w && y0 >= 0 && y1 < h) {
          for (let c = 0; c < 4; c++) {
            const p00 = srcData.data[(y0 * w + x0) * 4 + c];
            const p10 = srcData.data[(y0 * w + x1) * 4 + c];
            const p01 = srcData.data[(y1 * w + x0) * 4 + c];
            const p11 = srcData.data[(y1 * w + x1) * 4 + c];

            const top = p00 * (1 - xWeight) + p10 * xWeight;
            const bottom = p01 * (1 - xWeight) + p11 * xWeight;
            dstData.data[dstIdx + c] = top * (1 - yWeight) + bottom * yWeight;
          }
        } else if (x0 >= 0 && x0 < w && y0 >= 0 && y0 < h) {
          // Edge pixel
          for (let c = 0; c < 4; c++) {
            dstData.data[dstIdx + c] = srcData.data[(y0 * w + x0) * 4 + c];
          }
        }
      }
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { strength: 50, radius: 80, centerX: 50, centerY: 50 };
    this.mode = 'bulge';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('strength').value = 50;
    document.getElementById('strengthValue').textContent = '50%';
    document.getElementById('radius').value = 80;
    document.getElementById('radiusValue').textContent = '80%';
    document.getElementById('centerX').value = 50;
    document.getElementById('centerXValue').textContent = '50%';
    document.getElementById('centerY').value = 50;
    document.getElementById('centerYValue').textContent = '50%';
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `spherize_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SpherizeTool());
