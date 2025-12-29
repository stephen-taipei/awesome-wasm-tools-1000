/**
 * IMG-230 圖片對比度遮罩工具
 */
class ContrastMaskTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { radius: 3, threshold: 30, boost: 20, invert: false };
    this.mode = 'mask';
    this.contrastMap = null;
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

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.radius;
      this.calculateContrastMap();
      this.render();
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold;
      this.render();
    });

    document.getElementById('boost').addEventListener('input', (e) => {
      this.settings.boost = parseInt(e.target.value);
      document.getElementById('boostValue').textContent = (this.settings.boost / 10).toFixed(1) + 'x';
      this.render();
    });

    document.getElementById('invertMask').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
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
        this.calculateContrastMap();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  calculateContrastMap() {
    if (!this.originalImage) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Create temporary canvas for original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Calculate luminosity array
    const lum = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      lum[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Calculate local contrast (standard deviation in neighborhood)
    this.contrastMap = new Float32Array(w * h);
    const radius = this.settings.radius;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const val = lum[ny * w + nx];
              sum += val;
              sumSq += val * val;
              count++;
            }
          }
        }

        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(Math.max(0, variance));

        this.contrastMap[y * w + x] = stdDev;
      }
    }
  }

  render() {
    if (!this.originalImage || !this.contrastMap) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const { threshold, boost, invert } = this.settings;
    const boostFactor = boost / 10;

    for (let i = 0; i < this.contrastMap.length; i++) {
      let contrast = this.contrastMap[i];

      // Apply threshold and boost
      let maskValue = 0;
      if (contrast >= threshold) {
        maskValue = Math.min(1, ((contrast - threshold) / 50) * boostFactor);
      }

      if (invert) maskValue = 1 - maskValue;

      const pi = i * 4;

      if (this.mode === 'mask') {
        const gray = Math.round(maskValue * 255);
        data[pi] = gray;
        data[pi + 1] = gray;
        data[pi + 2] = gray;
      } else if (this.mode === 'edges') {
        // Show edges as white on black
        const edge = contrast > threshold ? 255 : 0;
        data[pi] = edge;
        data[pi + 1] = edge;
        data[pi + 2] = edge;
      } else {
        // Overlay mode - highlight high contrast areas
        if (maskValue > 0.3) {
          data[pi] = Math.min(255, data[pi] + 50 * maskValue);
          data[pi + 1] = Math.min(255, data[pi + 1] * (1 - maskValue * 0.3));
          data[pi + 2] = Math.min(255, data[pi + 2] * (1 - maskValue * 0.3));
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.contrastMap = null;
    this.settings = { radius: 3, threshold: 30, boost: 20, invert: false };
    this.mode = 'mask';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('radius').value = 3;
    document.getElementById('radiusValue').textContent = '3';
    document.getElementById('threshold').value = 30;
    document.getElementById('thresholdValue').textContent = '30';
    document.getElementById('boost').value = 20;
    document.getElementById('boostValue').textContent = '2.0x';
    document.getElementById('invertMask').checked = false;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `contrast_mask_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ContrastMaskTool());
