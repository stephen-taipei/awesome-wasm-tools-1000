/**
 * IMG-256 圖片色彩映射工具
 */
class ColorMappingTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      strength: 100,
      tolerance: 50,
      preserveLuminance: false,
      dithering: false
    };
    this.palettes = {
      gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
      sepia: [[44, 32, 20], [112, 85, 55], [172, 140, 95], [234, 215, 180]],
      cyberpunk: [[13, 2, 33], [60, 9, 108], [186, 12, 248], [255, 0, 110]],
      sunset: [[42, 31, 80], [220, 88, 88], [255, 183, 77], [255, 242, 175]],
      ocean: [[18, 32, 63], [39, 83, 120], [78, 168, 160], [150, 224, 192]],
      forest: [[27, 46, 17], [62, 92, 35], [144, 169, 85], [217, 229, 179]],
      retro: [[51, 44, 80], [120, 105, 196], [255, 148, 148], [255, 232, 214]],
      neon: [[0, 0, 0], [255, 0, 128], [0, 255, 255], [255, 255, 0]]
    };
    this.currentPalette = 'gameboy';
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderPaletteButtons();
  }

  renderPaletteButtons() {
    const container = document.getElementById('palettePresets');
    container.innerHTML = Object.entries(this.palettes).map(([name, colors]) => `
      <button class="palette-btn ${name === this.currentPalette ? 'active' : ''}" data-palette="${name}">
        <div>${this.getPaletteName(name)}</div>
        <div class="palette-preview">
          ${colors.map(c => `<div style="background: rgb(${c[0]}, ${c[1]}, ${c[2]})"></div>`).join('')}
        </div>
      </button>
    `).join('');

    container.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPalette = btn.dataset.palette;
        this.render();
      });
    });
  }

  getPaletteName(name) {
    const names = {
      gameboy: 'Game Boy',
      sepia: '復古棕',
      cyberpunk: '賽博龐克',
      sunset: '日落',
      ocean: '海洋',
      forest: '森林',
      retro: '復古',
      neon: '霓虹'
    };
    return names[name] || name;
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = this.settings.strength + '%';
      this.render();
    });

    document.getElementById('tolerance').addEventListener('input', (e) => {
      this.settings.tolerance = parseInt(e.target.value);
      document.getElementById('toleranceValue').textContent = this.settings.tolerance;
      this.render();
    });

    document.getElementById('preserveLuminance').addEventListener('change', (e) => {
      this.settings.preserveLuminance = e.target.checked;
      this.render();
    });

    document.getElementById('dithering').addEventListener('change', (e) => {
      this.settings.dithering = e.target.checked;
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

  findClosestColor(r, g, b, palette) {
    let minDist = Infinity;
    let closest = palette[0];
    for (const color of palette) {
      const dist = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (dist < minDist) { minDist = dist; closest = color; }
    }
    return closest;
  }

  getLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  render() {
    if (!this.originalImage) return;
    const { strength, preserveLuminance, dithering } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const palette = this.palettes[this.currentPalette];
    const strengthFactor = strength / 100;

    if (dithering) {
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

          let nr = newColor[0], ng = newColor[1], nb = newColor[2];

          if (preserveLuminance) {
            const origLum = this.getLuminance(data[idx], data[idx + 1], data[idx + 2]);
            const newLum = this.getLuminance(nr, ng, nb);
            if (newLum > 0) {
              const factor = origLum / newLum;
              nr = Math.min(255, nr * factor);
              ng = Math.min(255, ng * factor);
              nb = Math.min(255, nb * factor);
            }
          }

          data[idx] = data[idx] * (1 - strengthFactor) + nr * strengthFactor;
          data[idx + 1] = data[idx + 1] * (1 - strengthFactor) + ng * strengthFactor;
          data[idx + 2] = data[idx + 2] * (1 - strengthFactor) + nb * strengthFactor;

          const errR = (r - newColor[0]) * 0.5;
          const errG = (g - newColor[1]) * 0.5;
          const errB = (b - newColor[2]) * 0.5;

          if (x + 1 < w) {
            const i = (y * w + x + 1) * 3;
            errors[i] += errR * 7 / 16;
            errors[i + 1] += errG * 7 / 16;
            errors[i + 2] += errB * 7 / 16;
          }
          if (y + 1 < h && x > 0) {
            const i = ((y + 1) * w + x - 1) * 3;
            errors[i] += errR * 3 / 16;
            errors[i + 1] += errG * 3 / 16;
            errors[i + 2] += errB * 3 / 16;
          }
          if (y + 1 < h) {
            const i = ((y + 1) * w + x) * 3;
            errors[i] += errR * 5 / 16;
            errors[i + 1] += errG * 5 / 16;
            errors[i + 2] += errB * 5 / 16;
          }
        }
      }
    } else {
      for (let i = 0; i < data.length; i += 4) {
        const newColor = this.findClosestColor(data[i], data[i + 1], data[i + 2], palette);
        let nr = newColor[0], ng = newColor[1], nb = newColor[2];

        if (preserveLuminance) {
          const origLum = this.getLuminance(data[i], data[i + 1], data[i + 2]);
          const newLum = this.getLuminance(nr, ng, nb);
          if (newLum > 0) {
            const factor = origLum / newLum;
            nr = Math.min(255, nr * factor);
            ng = Math.min(255, ng * factor);
            nb = Math.min(255, nb * factor);
          }
        }

        data[i] = data[i] * (1 - strengthFactor) + nr * strengthFactor;
        data[i + 1] = data[i + 1] * (1 - strengthFactor) + ng * strengthFactor;
        data[i + 2] = data[i + 2] * (1 - strengthFactor) + nb * strengthFactor;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { strength: 100, tolerance: 50, preserveLuminance: false, dithering: false };
    this.currentPalette = 'gameboy';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    document.getElementById('tolerance').value = 50;
    document.getElementById('toleranceValue').textContent = '50';
    document.getElementById('preserveLuminance').checked = false;
    document.getElementById('dithering').checked = false;
    this.renderPaletteButtons();
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `color_mapped_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorMappingTool());
