/**
 * IMG-236 圖片透視校正工具
 */
class PerspectiveTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { vertical: 0, horizontal: 0, strength: 50 };
    this.presets = {
      lookUp: { vertical: -50, horizontal: 0 },
      lookDown: { vertical: 50, horizontal: 0 },
      lookLeft: { vertical: 0, horizontal: -50 },
      lookRight: { vertical: 0, horizontal: 50 }
    };
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
        const preset = this.presets[btn.dataset.preset];
        this.settings.vertical = preset.vertical;
        this.settings.horizontal = preset.horizontal;
        this.updateSliders();
        this.render();
      });
    });

    document.getElementById('vertical').addEventListener('input', (e) => {
      this.settings.vertical = parseInt(e.target.value);
      document.getElementById('verticalValue').textContent = this.settings.vertical;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('horizontal').addEventListener('input', (e) => {
      this.settings.horizontal = parseInt(e.target.value);
      document.getElementById('horizontalValue').textContent = this.settings.horizontal;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('vertical').value = this.settings.vertical;
    document.getElementById('verticalValue').textContent = this.settings.vertical;
    document.getElementById('horizontal').value = this.settings.horizontal;
    document.getElementById('horizontalValue').textContent = this.settings.horizontal;
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
    const { vertical, horizontal, strength } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Calculate perspective distortion
    const strengthFactor = strength / 100;
    const vFactor = (vertical / 100) * strengthFactor * 0.3;
    const hFactor = (horizontal / 100) * strengthFactor * 0.3;

    // Create temporary canvas for source
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(this.originalImage, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, w, h);

    // Set up destination canvas
    this.canvas.width = w;
    this.canvas.height = h;
    const dstData = this.ctx.createImageData(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Normalize coordinates to -1 to 1
        const nx = (x / w) * 2 - 1;
        const ny = (y / h) * 2 - 1;

        // Apply perspective transform
        let srcX, srcY;

        // Vertical perspective (top-bottom scaling)
        const vScale = 1 + vFactor * ny;
        srcX = ((nx / vScale) + 1) / 2 * w;

        // Horizontal perspective (left-right scaling)
        const hScale = 1 + hFactor * nx;
        srcY = ((ny / hScale) + 1) / 2 * h;

        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const xWeight = srcX - x0;
        const yWeight = srcY - y0;

        if (x0 >= 0 && x1 < w && y0 >= 0 && y1 < h) {
          const dstIdx = (y * w + x) * 4;

          for (let c = 0; c < 4; c++) {
            const p00 = srcData.data[(y0 * w + x0) * 4 + c];
            const p10 = srcData.data[(y0 * w + x1) * 4 + c];
            const p01 = srcData.data[(y1 * w + x0) * 4 + c];
            const p11 = srcData.data[(y1 * w + x1) * 4 + c];

            const top = p00 * (1 - xWeight) + p10 * xWeight;
            const bottom = p01 * (1 - xWeight) + p11 * xWeight;
            dstData.data[dstIdx + c] = top * (1 - yWeight) + bottom * yWeight;
          }
        }
      }
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { vertical: 0, horizontal: 0, strength: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('vertical').value = 0;
    document.getElementById('verticalValue').textContent = '0';
    document.getElementById('horizontal').value = 0;
    document.getElementById('horizontalValue').textContent = '0';
    document.getElementById('strength').value = 50;
    document.getElementById('strengthValue').textContent = '50%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `perspective_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new PerspectiveTool());
