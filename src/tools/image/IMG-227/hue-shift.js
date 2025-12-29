/**
 * IMG-227 圖片色相偏移工具
 */
class HueShiftTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { hueShift: 0, saturation: 100, lightness: 100 };
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
        this.settings.hueShift = parseInt(btn.dataset.hue);
        document.getElementById('hueShift').value = this.settings.hueShift;
        document.getElementById('hueShiftValue').textContent = this.settings.hueShift + '°';
        this.render();
      });
    });

    document.getElementById('hueShift').addEventListener('input', (e) => {
      this.settings.hueShift = parseInt(e.target.value);
      document.getElementById('hueShiftValue').textContent = this.settings.hueShift + '°';
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = this.settings.saturation + '%';
      this.render();
    });

    document.getElementById('lightness').addEventListener('input', (e) => {
      this.settings.lightness = parseInt(e.target.value);
      document.getElementById('lightnessValue').textContent = this.settings.lightness + '%';
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

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  render() {
    if (!this.originalImage) return;
    const { hueShift, saturation, lightness } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (hueShift === 0 && saturation === 100 && lightness === 100) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let [hue, sat, lit] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);

      // Apply hue shift
      hue = (hue + hueShift + 360) % 360;

      // Apply saturation adjustment
      sat = Math.max(0, Math.min(100, sat * saturation / 100));

      // Apply lightness adjustment
      lit = Math.max(0, Math.min(100, lit * lightness / 100));

      const [r, g, b] = this.hslToRgb(hue, sat, lit);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { hueShift: 0, saturation: 100, lightness: 100 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('hueShift').value = 0;
    document.getElementById('hueShiftValue').textContent = '0°';
    document.getElementById('saturation').value = 100;
    document.getElementById('saturationValue').textContent = '100%';
    document.getElementById('lightness').value = 100;
    document.getElementById('lightnessValue').textContent = '100%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `hue_shift_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new HueShiftTool());
