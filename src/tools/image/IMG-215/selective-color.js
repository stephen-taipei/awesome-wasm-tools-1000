/**
 * IMG-215 圖片選擇性色彩工具
 */
class SelectiveColorTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.colorRanges = {
      red: 0,
      yellow: 60,
      green: 120,
      cyan: 180,
      blue: 240,
      magenta: 300
    };
    this.adjustments = {
      red: { hue: 0, sat: 0, lum: 0 },
      yellow: { hue: 0, sat: 0, lum: 0 },
      green: { hue: 0, sat: 0, lum: 0 },
      cyan: { hue: 0, sat: 0, lum: 0 },
      blue: { hue: 0, sat: 0, lum: 0 },
      magenta: { hue: 0, sat: 0, lum: 0 }
    };
    this.currentColor = 'red';
    this.range = 30;
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

    document.querySelectorAll('.color-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentColor = tab.dataset.color;
        this.updateSliders();
      });
    });

    document.getElementById('hue').addEventListener('input', (e) => {
      this.adjustments[this.currentColor].hue = parseInt(e.target.value);
      document.getElementById('hueValue').textContent = this.adjustments[this.currentColor].hue + '°';
      this.render();
    });

    document.getElementById('sat').addEventListener('input', (e) => {
      this.adjustments[this.currentColor].sat = parseInt(e.target.value);
      document.getElementById('satValue').textContent = this.adjustments[this.currentColor].sat;
      this.render();
    });

    document.getElementById('lum').addEventListener('input', (e) => {
      this.adjustments[this.currentColor].lum = parseInt(e.target.value);
      document.getElementById('lumValue').textContent = this.adjustments[this.currentColor].lum;
      this.render();
    });

    document.getElementById('range').addEventListener('input', (e) => {
      this.range = parseInt(e.target.value);
      document.getElementById('rangeValue').textContent = this.range + '°';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    const adj = this.adjustments[this.currentColor];
    document.getElementById('hue').value = adj.hue;
    document.getElementById('hueValue').textContent = adj.hue + '°';
    document.getElementById('sat').value = adj.sat;
    document.getElementById('satValue').textContent = adj.sat;
    document.getElementById('lum').value = adj.lum;
    document.getElementById('lumValue').textContent = adj.lum;
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

  getHueDistance(h1, h2) {
    const diff = Math.abs(h1 - h2);
    return Math.min(diff, 360 - diff);
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const [hue, sat, lum] = this.rgbToHsl(data[i], data[i + 1], data[i + 2]);

      let newHue = hue;
      let newSat = sat;
      let newLum = lum;

      for (const colorName in this.colorRanges) {
        const targetHue = this.colorRanges[colorName];
        const adj = this.adjustments[colorName];
        const distance = this.getHueDistance(hue, targetHue);

        if (distance <= this.range && sat > 10) {
          const strength = 1 - (distance / this.range);
          newHue += adj.hue * strength;
          newSat += adj.sat * strength;
          newLum += adj.lum * strength * 0.5;
        }
      }

      newHue = ((newHue % 360) + 360) % 360;
      newSat = Math.max(0, Math.min(100, newSat));
      newLum = Math.max(0, Math.min(100, newLum));

      const [r, g, b] = this.hslToRgb(newHue, newSat, newLum);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.adjustments = {
      red: { hue: 0, sat: 0, lum: 0 },
      yellow: { hue: 0, sat: 0, lum: 0 },
      green: { hue: 0, sat: 0, lum: 0 },
      cyan: { hue: 0, sat: 0, lum: 0 },
      blue: { hue: 0, sat: 0, lum: 0 },
      magenta: { hue: 0, sat: 0, lum: 0 }
    };
    this.currentColor = 'red';
    this.range = 30;
    this.updateSliders();
    document.getElementById('range').value = 30;
    document.getElementById('rangeValue').textContent = '30°';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.color-tab.red').classList.add('active');
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `selective_color_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SelectiveColorTool());
