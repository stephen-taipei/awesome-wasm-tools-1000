/**
 * IMG-250 圖片點陣化效果工具
 */
class DitheringTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      colors: 2,
      strength: 100,
      scale: 100
    };
    this.mode = 'floyd';
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

    document.getElementById('colors').addEventListener('input', (e) => {
      this.settings.colors = parseInt(e.target.value);
      document.getElementById('colorsValue').textContent = this.settings.colors;
      this.updatePaletteInfo();
      this.render();
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      this.render();
    });

    document.getElementById('scale').addEventListener('input', (e) => {
      this.settings.scale = parseInt(e.target.value);
      document.getElementById('scaleValue').textContent = this.settings.scale + '%';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updatePaletteInfo() {
    const colors = this.settings.colors;
    let info = '調色盤: ';
    if (colors === 2) {
      info += '黑白二色';
    } else if (colors <= 8) {
      info += `${colors} 色 (基本色)`;
    } else if (colors <= 16) {
      info += `${colors} 色 (標準)`;
    } else if (colors <= 64) {
      info += `${colors} 色 (豐富)`;
    } else {
      info += `${colors} 色 (接近原色)`;
    }
    document.getElementById('paletteInfo').textContent = info;
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

  generatePalette(numColors) {
    const palette = [];
    if (numColors === 2) {
      return [[0, 0, 0], [255, 255, 255]];
    }

    // Generate evenly distributed colors
    const levelsPerChannel = Math.ceil(Math.cbrt(numColors));
    const step = 255 / (levelsPerChannel - 1);

    for (let r = 0; r < levelsPerChannel; r++) {
      for (let g = 0; g < levelsPerChannel; g++) {
        for (let b = 0; b < levelsPerChannel; b++) {
          if (palette.length < numColors) {
            palette.push([Math.round(r * step), Math.round(g * step), Math.round(b * step)]);
          }
        }
      }
    }

    return palette;
  }

  findClosestColor(r, g, b, palette) {
    let minDist = Infinity;
    let closest = palette[0];

    for (const color of palette) {
      const dist = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }

    return closest;
  }

  render() {
    if (!this.originalImage) return;
    const { colors, strength, scale } = this.settings;

    const scaleFactor = scale / 100;
    const w = Math.floor(this.originalImage.width * scaleFactor);
    const h = Math.floor(this.originalImage.height * scaleFactor);

    // Create temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(this.originalImage, 0, 0, w, h);
    const imageData = tempCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const palette = this.generatePalette(colors);
    const strengthFactor = strength / 100;

    if (this.mode === 'floyd') {
      this.floydSteinberg(data, w, h, palette, strengthFactor);
    } else if (this.mode === 'ordered') {
      this.orderedDither(data, w, h, palette);
    } else {
      this.randomDither(data, w, h, palette, strengthFactor);
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Draw to main canvas at original size
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  floydSteinberg(data, w, h, palette, strengthFactor) {
    const errors = new Float32Array(w * h * 3);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const errIdx = (y * w + x) * 3;

        let r = data[idx] + errors[errIdx];
        let g = data[idx + 1] + errors[errIdx + 1];
        let b = data[idx + 2] + errors[errIdx + 2];

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const newColor = this.findClosestColor(r, g, b, palette);

        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];

        const errR = (r - newColor[0]) * strengthFactor;
        const errG = (g - newColor[1]) * strengthFactor;
        const errB = (b - newColor[2]) * strengthFactor;

        // Distribute error to neighbors
        if (x + 1 < w) {
          const i = (y * w + x + 1) * 3;
          errors[i] += errR * 7 / 16;
          errors[i + 1] += errG * 7 / 16;
          errors[i + 2] += errB * 7 / 16;
        }
        if (y + 1 < h) {
          if (x > 0) {
            const i = ((y + 1) * w + x - 1) * 3;
            errors[i] += errR * 3 / 16;
            errors[i + 1] += errG * 3 / 16;
            errors[i + 2] += errB * 3 / 16;
          }
          const i = ((y + 1) * w + x) * 3;
          errors[i] += errR * 5 / 16;
          errors[i + 1] += errG * 5 / 16;
          errors[i + 2] += errB * 5 / 16;
          if (x + 1 < w) {
            const i = ((y + 1) * w + x + 1) * 3;
            errors[i] += errR * 1 / 16;
            errors[i + 1] += errG * 1 / 16;
            errors[i + 2] += errB * 1 / 16;
          }
        }
      }
    }
  }

  orderedDither(data, w, h, palette) {
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const threshold = (bayerMatrix[y % 4][x % 4] / 16 - 0.5) * 64;

        let r = data[idx] + threshold;
        let g = data[idx + 1] + threshold;
        let b = data[idx + 2] + threshold;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const newColor = this.findClosestColor(r, g, b, palette);

        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];
      }
    }
  }

  randomDither(data, w, h, palette, strengthFactor) {
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 128 * strengthFactor;

      let r = data[i] + noise;
      let g = data[i + 1] + noise;
      let b = data[i + 2] + noise;

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      const newColor = this.findClosestColor(r, g, b, palette);

      data[i] = newColor[0];
      data[i + 1] = newColor[1];
      data[i + 2] = newColor[2];
    }
  }

  reset() {
    this.originalImage = null;
    this.settings = { colors: 2, strength: 100, scale: 100 };
    this.mode = 'floyd';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('colors').value = 2;
    document.getElementById('colorsValue').textContent = '2';
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    document.getElementById('scale').value = 100;
    document.getElementById('scaleValue').textContent = '100%';
    document.getElementById('paletteInfo').textContent = '調色盤: 黑白二色';
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `dithering_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DitheringTool());
