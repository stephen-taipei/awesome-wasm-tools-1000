/**
 * IMG-191 圖片雙重曝光工具
 */
class DoubleExposureTool {
  constructor() {
    this.image1 = null;
    this.image2 = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { blend: 'screen', opacity: 50, offsetX: 0, offsetY: 0 };
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone1 = document.getElementById('uploadZone1');
    const uploadZone2 = document.getElementById('uploadZone2');
    const fileInput1 = document.getElementById('fileInput1');
    const fileInput2 = document.getElementById('fileInput2');

    uploadZone1.addEventListener('click', () => fileInput1.click());
    uploadZone2.addEventListener('click', () => fileInput2.click());

    [uploadZone1, uploadZone2].forEach((zone, i) => {
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0], i + 1);
      });
    });

    fileInput1.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0], 1); });
    fileInput2.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0], 2); });

    document.querySelectorAll('.blend-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.blend-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.blend = btn.dataset.blend;
        this.render();
      });
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
      this.render();
    });

    document.getElementById('offsetX').addEventListener('input', (e) => {
      this.settings.offsetX = parseInt(e.target.value);
      document.getElementById('offsetXValue').textContent = this.settings.offsetX;
      this.render();
    });

    document.getElementById('offsetY').addEventListener('input', (e) => {
      this.settings.offsetY = parseInt(e.target.value);
      document.getElementById('offsetYValue').textContent = this.settings.offsetY;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file, num) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (num === 1) {
          this.image1 = img;
          document.getElementById('uploadZone1').classList.add('loaded');
        } else {
          this.image2 = img;
          document.getElementById('uploadZone2').classList.add('loaded');
        }
        if (this.image1 && this.image2) {
          document.getElementById('editorSection').classList.add('active');
          this.render();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.image1 || !this.image2) return;
    const { blend, opacity, offsetX, offsetY } = this.settings;
    const w = this.image1.width;
    const h = this.image1.height;
    this.canvas.width = w;
    this.canvas.height = h;

    // Draw base image
    this.ctx.drawImage(this.image1, 0, 0);
    const baseData = this.ctx.getImageData(0, 0, w, h);

    // Draw overlay image to temp canvas (scaled to fit)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');

    const ox = (offsetX / 100) * w;
    const oy = (offsetY / 100) * h;
    const scale = Math.max(w / this.image2.width, h / this.image2.height);
    const sw = this.image2.width * scale;
    const sh = this.image2.height * scale;
    const sx = (w - sw) / 2 + ox;
    const sy = (h - sh) / 2 + oy;

    tempCtx.drawImage(this.image2, sx, sy, sw, sh);
    const overlayData = tempCtx.getImageData(0, 0, w, h);

    // Blend
    const base = baseData.data;
    const overlay = overlayData.data;
    const alpha = opacity / 100;

    for (let i = 0; i < base.length; i += 4) {
      const r1 = base[i], g1 = base[i + 1], b1 = base[i + 2];
      const r2 = overlay[i], g2 = overlay[i + 1], b2 = overlay[i + 2];

      let r, g, b;
      switch (blend) {
        case 'multiply':
          r = (r1 * r2) / 255;
          g = (g1 * g2) / 255;
          b = (b1 * b2) / 255;
          break;
        case 'screen':
          r = 255 - ((255 - r1) * (255 - r2)) / 255;
          g = 255 - ((255 - g1) * (255 - g2)) / 255;
          b = 255 - ((255 - b1) * (255 - b2)) / 255;
          break;
        case 'overlay':
          r = r1 < 128 ? (2 * r1 * r2) / 255 : 255 - (2 * (255 - r1) * (255 - r2)) / 255;
          g = g1 < 128 ? (2 * g1 * g2) / 255 : 255 - (2 * (255 - g1) * (255 - g2)) / 255;
          b = b1 < 128 ? (2 * b1 * b2) / 255 : 255 - (2 * (255 - b1) * (255 - b2)) / 255;
          break;
        case 'soft-light':
          r = r2 < 128 ? r1 - (1 - 2 * r2 / 255) * r1 * (1 - r1 / 255) : r1 + (2 * r2 / 255 - 1) * (this.softLightD(r1) - r1);
          g = g2 < 128 ? g1 - (1 - 2 * g2 / 255) * g1 * (1 - g1 / 255) : g1 + (2 * g2 / 255 - 1) * (this.softLightD(g1) - g1);
          b = b2 < 128 ? b1 - (1 - 2 * b2 / 255) * b1 * (1 - b1 / 255) : b1 + (2 * b2 / 255 - 1) * (this.softLightD(b1) - b1);
          break;
        case 'lighten':
          r = Math.max(r1, r2);
          g = Math.max(g1, g2);
          b = Math.max(b1, b2);
          break;
        case 'darken':
          r = Math.min(r1, r2);
          g = Math.min(g1, g2);
          b = Math.min(b1, b2);
          break;
        default:
          r = r2; g = g2; b = b2;
      }

      base[i] = r1 * (1 - alpha) + r * alpha;
      base[i + 1] = g1 * (1 - alpha) + g * alpha;
      base[i + 2] = b1 * (1 - alpha) + b * alpha;
    }

    this.ctx.putImageData(baseData, 0, 0);
  }

  softLightD(x) {
    x /= 255;
    return (x <= 0.25 ? ((16 * x - 12) * x + 4) * x : Math.sqrt(x)) * 255;
  }

  reset() {
    this.image1 = null;
    this.image2 = null;
    this.settings = { blend: 'screen', opacity: 50, offsetX: 0, offsetY: 0 };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('uploadZone1').classList.remove('loaded');
    document.getElementById('uploadZone2').classList.remove('loaded');
    document.getElementById('fileInput1').value = '';
    document.getElementById('fileInput2').value = '';
    document.getElementById('opacity').value = 50;
    document.getElementById('opacityValue').textContent = '50%';
    document.getElementById('offsetX').value = 0;
    document.getElementById('offsetXValue').textContent = '0';
    document.getElementById('offsetY').value = 0;
    document.getElementById('offsetYValue').textContent = '0';
    document.querySelectorAll('.blend-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.blend-btn[data-blend="screen"]').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `double_exposure_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DoubleExposureTool());
