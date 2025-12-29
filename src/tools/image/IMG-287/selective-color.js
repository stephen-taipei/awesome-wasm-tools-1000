class SelectiveColorTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentColor = 'reds';
    this.method = 'relative';
    this.settings = {
      reds: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      yellows: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      greens: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      cyans: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      blues: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      magentas: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      whites: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      neutrals: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      blacks: { cyan: 0, magenta: 0, yellow: 0, black: 0 }
    };
    this.init();
  }

  init() {
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

    // Color select
    document.getElementById('colorSelect').addEventListener('change', (e) => {
      this.currentColor = e.target.value;
      this.updateSliders();
    });

    // Method toggle
    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.method = btn.dataset.method;
        this.render();
      });
    });

    // Sliders
    const sliderIds = ['cyan', 'magenta', 'yellow', 'black'];
    sliderIds.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[this.currentColor][id] = parseInt(e.target.value);
        document.getElementById(`${id}Value`).textContent = `${this.settings[this.currentColor][id]}%`;
        this.render();
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    const settings = this.settings[this.currentColor];
    document.getElementById('cyan').value = settings.cyan;
    document.getElementById('cyanValue').textContent = `${settings.cyan}%`;
    document.getElementById('magenta').value = settings.magenta;
    document.getElementById('magentaValue').textContent = `${settings.magenta}%`;
    document.getElementById('yellow').value = settings.yellow;
    document.getElementById('yellowValue').textContent = `${settings.yellow}%`;
    document.getElementById('black').value = settings.black;
    document.getElementById('blackValue').textContent = `${settings.black}%`;
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

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
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
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  getColorWeight(r, g, b) {
    const hsl = this.rgbToHsl(r, g, b);
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    const weights = {
      reds: 0, yellows: 0, greens: 0, cyans: 0, blues: 0, magentas: 0,
      whites: 0, neutrals: 0, blacks: 0
    };

    // Whites, neutrals, blacks based on luminosity
    if (l > 80) {
      weights.whites = (l - 80) / 20;
    } else if (l < 20) {
      weights.blacks = (20 - l) / 20;
    } else {
      weights.neutrals = Math.max(0, 1 - s / 30);
    }

    // Chromatic colors based on hue and saturation
    if (s > 10) {
      const satWeight = Math.min(1, s / 50);

      // Red: 330-360, 0-30
      if (h >= 330 || h < 30) {
        weights.reds = satWeight * (h >= 330 ? (h - 330) / 30 : 1 - h / 30);
        if (h < 30) weights.reds = satWeight;
      }
      // Yellow: 30-90
      if (h >= 30 && h < 90) {
        weights.yellows = satWeight * (1 - Math.abs(h - 60) / 30);
      }
      // Green: 90-150
      if (h >= 90 && h < 150) {
        weights.greens = satWeight * (1 - Math.abs(h - 120) / 30);
      }
      // Cyan: 150-210
      if (h >= 150 && h < 210) {
        weights.cyans = satWeight * (1 - Math.abs(h - 180) / 30);
      }
      // Blue: 210-270
      if (h >= 210 && h < 270) {
        weights.blues = satWeight * (1 - Math.abs(h - 240) / 30);
      }
      // Magenta: 270-330
      if (h >= 270 && h < 330) {
        weights.magentas = satWeight * (1 - Math.abs(h - 300) / 30);
      }
    }

    return weights;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Convert RGB to CMY
      let c = 255 - r;
      let m = 255 - g;
      let y = 255 - b;
      let k = Math.min(c, m, y);

      const weights = this.getColorWeight(r, g, b);

      // Apply adjustments for each color range
      for (const colorRange in this.settings) {
        const weight = weights[colorRange];
        if (weight <= 0) continue;

        const settings = this.settings[colorRange];
        const factor = weight / 100;

        if (this.method === 'relative') {
          // Relative: adjustment is proportional to existing color
          c += settings.cyan * factor * (c / 255) * 2.55;
          m += settings.magenta * factor * (m / 255) * 2.55;
          y += settings.yellow * factor * (y / 255) * 2.55;
          k += settings.black * factor * (k / 255) * 2.55;
        } else {
          // Absolute: direct adjustment
          c += settings.cyan * factor * 2.55;
          m += settings.magenta * factor * 2.55;
          y += settings.yellow * factor * 2.55;
          k += settings.black * factor * 2.55;
        }
      }

      // Clamp values
      c = Math.max(0, Math.min(255, c));
      m = Math.max(0, Math.min(255, m));
      y = Math.max(0, Math.min(255, y));
      k = Math.max(0, Math.min(255, k));

      // Convert back to RGB with black adjustment
      r = 255 - c - k;
      g = 255 - m - k;
      b = 255 - y - k;

      dstData[i] = Math.max(0, Math.min(255, r));
      dstData[i + 1] = Math.max(0, Math.min(255, g));
      dstData[i + 2] = Math.max(0, Math.min(255, b));
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'selective-color-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.currentColor = 'reds';
    this.method = 'relative';
    this.settings = {
      reds: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      yellows: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      greens: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      cyans: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      blues: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      magentas: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      whites: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      neutrals: { cyan: 0, magenta: 0, yellow: 0, black: 0 },
      blacks: { cyan: 0, magenta: 0, yellow: 0, black: 0 }
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('colorSelect').value = 'reds';
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.method-btn[data-method="relative"]').classList.add('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SelectiveColorTool();
});
