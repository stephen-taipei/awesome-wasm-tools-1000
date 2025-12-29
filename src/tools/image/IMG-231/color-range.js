/**
 * IMG-231 圖片色彩範圍選取工具
 */
class ColorRangeTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { hueTol: 30, satTol: 40, lumTol: 40, feather: 20 };
    this.selectedColor = null;
    this.mode = 'mask';
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

    this.canvas.addEventListener('click', (e) => this.pickColor(e));

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    ['hueTol', 'satTol', 'lumTol', 'feather'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        const unit = id === 'hueTol' ? '°' : '%';
        document.getElementById(id + 'Value').textContent = this.settings[id] + unit;
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
        this.selectedColor = null;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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

  pickColor(e) {
    if (!this.originalImage) return;

    const pos = this.getCanvasPos(e);

    // Get original image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.originalImage.width;
    tempCanvas.height = this.originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    const i = (pos.y * this.canvas.width + pos.x) * 4;
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];

    this.selectedColor = { r, g, b };
    const [h, s, l] = this.rgbToHsl(r, g, b);
    this.selectedColor.h = h;
    this.selectedColor.s = s;
    this.selectedColor.l = l;

    // Update UI
    document.getElementById('colorSwatch').style.backgroundColor = `rgb(${r},${g},${b})`;
    document.getElementById('colorRgb').textContent = `RGB: ${r}, ${g}, ${b}`;
    document.getElementById('colorHsl').textContent = `HSL: ${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`;

    this.render();
  }

  calculateMatch(r, g, b) {
    if (!this.selectedColor) return 0;

    const [h, s, l] = this.rgbToHsl(r, g, b);
    const { hueTol, satTol, lumTol, feather } = this.settings;
    const target = this.selectedColor;

    // Calculate hue distance (circular)
    let hueDiff = Math.abs(h - target.h);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;

    const satDiff = Math.abs(s - target.s);
    const lumDiff = Math.abs(l - target.l);

    // Check if within tolerance
    if (hueDiff > hueTol || satDiff > satTol || lumDiff > lumTol) {
      // Check feather zone
      const featherAmount = feather / 100;
      const hueOverflow = Math.max(0, hueDiff - hueTol) / (hueTol * featherAmount + 0.01);
      const satOverflow = Math.max(0, satDiff - satTol) / (satTol * featherAmount + 0.01);
      const lumOverflow = Math.max(0, lumDiff - lumTol) / (lumTol * featherAmount + 0.01);

      const overflow = Math.max(hueOverflow, satOverflow, lumOverflow);
      if (overflow >= 1) return 0;
      return 1 - overflow;
    }

    return 1;
  }

  render() {
    if (!this.originalImage) return;

    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (!this.selectedColor) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const match = this.calculateMatch(r, g, b);

      if (this.mode === 'mask') {
        const gray = Math.round(match * 255);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      } else {
        // Overlay mode - desaturate non-selected areas
        if (match < 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = r * match + gray * (1 - match);
          data[i + 1] = g * match + gray * (1 - match);
          data[i + 2] = b * match + gray * (1 - match);
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.selectedColor = null;
    this.settings = { hueTol: 30, satTol: 40, lumTol: 40, feather: 20 };
    this.mode = 'mask';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('colorSwatch').style.backgroundColor = '';
    document.getElementById('colorRgb').textContent = 'RGB: --';
    document.getElementById('colorHsl').textContent = 'HSL: --';
    document.getElementById('hueTol').value = 30;
    document.getElementById('hueTolValue').textContent = '30°';
    document.getElementById('satTol').value = 40;
    document.getElementById('satTolValue').textContent = '40%';
    document.getElementById('lumTol').value = 40;
    document.getElementById('lumTolValue').textContent = '40%';
    document.getElementById('feather').value = 20;
    document.getElementById('featherValue').textContent = '20%';
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `color_range_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorRangeTool());
