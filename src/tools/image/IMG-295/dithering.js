class DitheringTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      algorithm: 'floyd-steinberg',
      palette: 'ega',
      colors: 16,
      strength: 100
    };
    this.palettes = this.definePalettes();
    this.init();
  }

  definePalettes() {
    return {
      bw: [[0, 0, 0], [255, 255, 255]],
      cga: [[0, 0, 0], [0, 170, 170], [170, 0, 170], [170, 170, 170]],
      ega: [
        [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
        [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
        [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
        [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255]
      ],
      gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
      c64: [
        [0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238],
        [204, 68, 204], [0, 204, 85], [0, 0, 170], [238, 238, 119],
        [221, 136, 85], [102, 68, 0], [255, 119, 119], [51, 51, 51],
        [119, 119, 119], [170, 255, 102], [0, 136, 255], [187, 187, 187]
      ],
      web: null // Generated dynamically
    };
  }

  generateWebSafePalette() {
    const palette = [];
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          palette.push([r, g, b]);
        }
      }
    }
    return palette;
  }

  init() {
    this.palettes.web = this.generateWebSafePalette();
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Algorithm select
    document.getElementById('algoSelect').addEventListener('change', (e) => {
      this.settings.algorithm = e.target.value;
      this.render();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.palette = btn.dataset.preset;
        this.settings.colors = this.palettes[this.settings.palette].length;
        document.getElementById('colors').value = this.settings.colors;
        document.getElementById('colorsValue').textContent = this.settings.colors;
        this.render();
      });
    });

    // Sliders
    document.getElementById('colors').addEventListener('input', (e) => {
      this.settings.colors = parseInt(e.target.value);
      document.getElementById('colorsValue').textContent = this.settings.colors;
      this.render();
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

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
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const dist = dr * dr + dg * dg + db * db;

      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }

    return closest;
  }

  getPalette() {
    let palette = this.palettes[this.settings.palette];

    // If custom color count, generate reduced palette
    if (this.settings.colors !== palette.length) {
      // Simple quantization
      const levels = Math.max(2, Math.round(Math.pow(this.settings.colors, 1/3)));
      palette = [];
      for (let r = 0; r < levels; r++) {
        for (let g = 0; g < levels; g++) {
          for (let b = 0; b < levels; b++) {
            palette.push([
              Math.round(r * 255 / (levels - 1)),
              Math.round(g * 255 / (levels - 1)),
              Math.round(b * 255 / (levels - 1))
            ]);
          }
        }
      }
    }

    return palette;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Copy source data
    const data = new Float32Array(this.imageData.data);
    const palette = this.getPalette();
    const strength = this.settings.strength / 100;

    switch (this.settings.algorithm) {
      case 'floyd-steinberg':
        this.floydSteinberg(data, width, height, palette, strength);
        break;
      case 'ordered':
        this.orderedDither(data, width, height, palette, strength);
        break;
      case 'atkinson':
        this.atkinson(data, width, height, palette, strength);
        break;
      case 'random':
        this.randomDither(data, width, height, palette, strength);
        break;
    }

    // Convert back to output
    const outputData = this.ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      outputData.data[i] = Math.max(0, Math.min(255, Math.round(data[i])));
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  floydSteinberg(data, width, height, palette, strength) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];

        const newColor = this.findClosestColor(oldR, oldG, oldB, palette);
        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];

        const errR = (oldR - newColor[0]) * strength;
        const errG = (oldG - newColor[1]) * strength;
        const errB = (oldB - newColor[2]) * strength;

        // Distribute error
        if (x + 1 < width) {
          const i = idx + 4;
          data[i] += errR * 7 / 16;
          data[i + 1] += errG * 7 / 16;
          data[i + 2] += errB * 7 / 16;
        }
        if (y + 1 < height) {
          if (x > 0) {
            const i = ((y + 1) * width + x - 1) * 4;
            data[i] += errR * 3 / 16;
            data[i + 1] += errG * 3 / 16;
            data[i + 2] += errB * 3 / 16;
          }
          const i = ((y + 1) * width + x) * 4;
          data[i] += errR * 5 / 16;
          data[i + 1] += errG * 5 / 16;
          data[i + 2] += errB * 5 / 16;
          if (x + 1 < width) {
            const i2 = ((y + 1) * width + x + 1) * 4;
            data[i2] += errR * 1 / 16;
            data[i2 + 1] += errG * 1 / 16;
            data[i2 + 2] += errB * 1 / 16;
          }
        }
      }
    }
  }

  orderedDither(data, width, height, palette, strength) {
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const threshold = ((bayer[y % 4][x % 4] / 16) - 0.5) * 64 * strength;

        const r = data[idx] + threshold;
        const g = data[idx + 1] + threshold;
        const b = data[idx + 2] + threshold;

        const newColor = this.findClosestColor(r, g, b, palette);
        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];
      }
    }
  }

  atkinson(data, width, height, palette, strength) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];

        const newColor = this.findClosestColor(oldR, oldG, oldB, palette);
        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];

        const errR = (oldR - newColor[0]) * strength / 8;
        const errG = (oldG - newColor[1]) * strength / 8;
        const errB = (oldB - newColor[2]) * strength / 8;

        const diffuse = (dx, dy) => {
          if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
            const i = ((y + dy) * width + x + dx) * 4;
            data[i] += errR;
            data[i + 1] += errG;
            data[i + 2] += errB;
          }
        };

        diffuse(1, 0);
        diffuse(2, 0);
        diffuse(-1, 1);
        diffuse(0, 1);
        diffuse(1, 1);
        diffuse(0, 2);
      }
    }
  }

  randomDither(data, width, height, palette, strength) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const noise = (Math.random() - 0.5) * 64 * strength;

        const r = data[idx] + noise;
        const g = data[idx + 1] + noise;
        const b = data[idx + 2] + noise;

        const newColor = this.findClosestColor(r, g, b, palette);
        data[idx] = newColor[0];
        data[idx + 1] = newColor[1];
        data[idx + 2] = newColor[2];
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'dithered-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { algorithm: 'floyd-steinberg', palette: 'ega', colors: 16, strength: 100 };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('algoSelect').value = 'floyd-steinberg';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="ega"]').classList.add('active');
    document.getElementById('colors').value = 16;
    document.getElementById('colorsValue').textContent = '16';
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DitheringTool();
});
