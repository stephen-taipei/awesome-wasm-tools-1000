/**
 * IMG-186 圖片油畫效果工具
 */
class OilPaintTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { radius: 4, levels: 20 };
    this.processing = false;
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

    ['radius', 'levels'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id];
      });
      document.getElementById(id).addEventListener('change', () => this.render());
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
        this.settings = { radius: 4, levels: 20 };
        document.getElementById('radius').value = 4;
        document.getElementById('radiusValue').textContent = '4';
        document.getElementById('levels').value = 20;
        document.getElementById('levelsValue').textContent = '20';
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage || this.processing) return;
    this.processing = true;
    document.getElementById('editorSection').classList.add('processing');

    const { radius, levels } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const srcData = this.ctx.getImageData(0, 0, w, h);
    const destData = this.ctx.createImageData(w, h);

    // Process in chunks to avoid blocking
    setTimeout(() => {
      this.applyOilPaint(srcData, destData, w, h, radius, levels);
      this.ctx.putImageData(destData, 0, 0);
      this.processing = false;
      document.getElementById('editorSection').classList.remove('processing');
    }, 10);
  }

  applyOilPaint(srcData, destData, w, h, radius, levels) {
    const src = srcData.data;
    const dest = destData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const intensityCount = new Array(levels).fill(0);
        const avgR = new Array(levels).fill(0);
        const avgG = new Array(levels).fill(0);
        const avgB = new Array(levels).fill(0);

        // Sample neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.min(w - 1, Math.max(0, x + dx));
            const ny = Math.min(h - 1, Math.max(0, y + dy));
            const i = (ny * w + nx) * 4;

            const r = src[i], g = src[i + 1], b = src[i + 2];
            const intensity = Math.floor(((r + g + b) / 3) * levels / 256);
            const idx = Math.min(levels - 1, intensity);

            intensityCount[idx]++;
            avgR[idx] += r;
            avgG[idx] += g;
            avgB[idx] += b;
          }
        }

        // Find most common intensity
        let maxCount = 0, maxIndex = 0;
        for (let i = 0; i < levels; i++) {
          if (intensityCount[i] > maxCount) {
            maxCount = intensityCount[i];
            maxIndex = i;
          }
        }

        const destI = (y * w + x) * 4;
        dest[destI] = avgR[maxIndex] / maxCount;
        dest[destI + 1] = avgG[maxIndex] / maxCount;
        dest[destI + 2] = avgB[maxIndex] / maxCount;
        dest[destI + 3] = 255;
      }
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { radius: 4, levels: 20 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('radius').value = 4;
    document.getElementById('radiusValue').textContent = '4';
    document.getElementById('levels').value = 20;
    document.getElementById('levelsValue').textContent = '20';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `oil_paint_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new OilPaintTool());
