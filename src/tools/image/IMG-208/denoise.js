/**
 * IMG-208 圖片降噪工具
 */
class DenoiseTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { type: 'median', strength: 50, detail: 50 };
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

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        this.render();
      });
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      this.render();
    });

    document.getElementById('detail').addEventListener('input', (e) => {
      this.settings.detail = parseInt(e.target.value);
      document.getElementById('detailValue').textContent = this.settings.detail + '%';
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
    const { type, strength, detail } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (strength === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const original = new Uint8ClampedArray(data);

    const radius = Math.ceil((strength / 100) * 2) + 1;
    const blendFactor = strength / 100;
    const detailFactor = detail / 100;

    if (type === 'median') {
      this.applyMedianFilter(data, original, w, h, radius, blendFactor, detailFactor);
    } else {
      this.applyBilateralFilter(data, original, w, h, radius, blendFactor, detailFactor);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  applyMedianFilter(data, original, w, h, radius, blend, detail) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const neighbors = [[], [], []];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.min(Math.max(y + dy, 0), h - 1);
            const nx = Math.min(Math.max(x + dx, 0), w - 1);
            const ni = (ny * w + nx) * 4;
            neighbors[0].push(original[ni]);
            neighbors[1].push(original[ni + 1]);
            neighbors[2].push(original[ni + 2]);
          }
        }

        for (let c = 0; c < 3; c++) {
          neighbors[c].sort((a, b) => a - b);
          const median = neighbors[c][Math.floor(neighbors[c].length / 2)];
          const diff = Math.abs(original[i + c] - median);
          const adaptiveBlend = blend * (1 - (diff / 255) * detail);
          data[i + c] = original[i + c] * (1 - adaptiveBlend) + median * adaptiveBlend;
        }
      }
    }
  }

  applyBilateralFilter(data, original, w, h, radius, blend, detail) {
    const sigmaSpace = radius;
    const sigmaColor = 30 + detail * 70;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.min(Math.max(y + dy, 0), h - 1);
            const nx = Math.min(Math.max(x + dx, 0), w - 1);
            const ni = (ny * w + nx) * 4;

            const spatialDist = Math.sqrt(dx * dx + dy * dy);
            const colorDist = Math.sqrt(
              Math.pow(original[i] - original[ni], 2) +
              Math.pow(original[i + 1] - original[ni + 1], 2) +
              Math.pow(original[i + 2] - original[ni + 2], 2)
            );

            const weight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace))
                         * Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));

            sumR += original[ni] * weight;
            sumG += original[ni + 1] * weight;
            sumB += original[ni + 2] * weight;
            sumWeight += weight;
          }
        }

        data[i] = original[i] * (1 - blend) + (sumR / sumWeight) * blend;
        data[i + 1] = original[i + 1] * (1 - blend) + (sumG / sumWeight) * blend;
        data[i + 2] = original[i + 2] * (1 - blend) + (sumB / sumWeight) * blend;
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { type: 'median', strength: 50, detail: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('strength').value = 50;
    document.getElementById('strengthValue').textContent = '50%';
    document.getElementById('detail').value = 50;
    document.getElementById('detailValue').textContent = '50%';
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="median"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `denoise_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DenoiseTool());
