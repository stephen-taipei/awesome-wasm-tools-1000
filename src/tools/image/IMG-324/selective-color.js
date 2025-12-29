class SelectiveColorTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentColor = 'red';
    this.adjustments = {
      red: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      yellow: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      green: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      cyan: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      blue: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      magenta: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 }
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

    document.querySelectorAll('.color-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentColor = tab.dataset.color;
        this.updateSliders();
      });
    });

    ['cyanRed', 'magentaGreen', 'yellowBlue', 'black'].forEach(param => {
      document.getElementById(param).addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        this.adjustments[this.currentColor][param] = value;
        document.getElementById(`${param}Value`).textContent = value;
        this.render();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    const adj = this.adjustments[this.currentColor];
    document.getElementById('cyanRed').value = adj.cyanRed;
    document.getElementById('cyanRedValue').textContent = adj.cyanRed;
    document.getElementById('magentaGreen').value = adj.magentaGreen;
    document.getElementById('magentaGreenValue').textContent = adj.magentaGreen;
    document.getElementById('yellowBlue').value = adj.yellowBlue;
    document.getElementById('yellowBlueValue').textContent = adj.yellowBlue;
    document.getElementById('black').value = adj.black;
    document.getElementById('blackValue').textContent = adj.black;
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

    return [h * 360, s, l];
  }

  getColorCategory(h, s, l) {
    if (s < 0.1) return null; // Neutral colors

    // Normalize hue to 0-360
    h = h % 360;

    // Define color ranges with weights
    const ranges = {
      red: [[0, 30], [330, 360]],
      yellow: [[30, 90]],
      green: [[90, 150]],
      cyan: [[150, 210]],
      blue: [[210, 270]],
      magenta: [[270, 330]]
    };

    for (const [color, hueRanges] of Object.entries(ranges)) {
      for (const [start, end] of hueRanges) {
        if (h >= start && h < end) {
          return color;
        }
      }
    }

    return null;
  }

  getColorWeight(h, s, category) {
    if (!category || s < 0.1) return 0;

    // Calculate weight based on how close to the center of the color range
    const centers = {
      red: 0,
      yellow: 60,
      green: 120,
      cyan: 180,
      blue: 240,
      magenta: 300
    };

    const center = centers[category];
    let diff = Math.abs(h - center);
    if (diff > 180) diff = 360 - diff;

    // Weight decreases as we move away from center
    const weight = Math.max(0, 1 - diff / 60);
    return weight * s; // Also factor in saturation
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      const [h, s, l] = this.rgbToHsl(r, g, b);
      const category = this.getColorCategory(h, s, l);
      const weight = this.getColorWeight(h, s, category);

      if (category && weight > 0) {
        const adj = this.adjustments[category];

        // Apply CMYK-style adjustments
        const cyanRedShift = adj.cyanRed * 2.55 * weight;
        const magentaGreenShift = adj.magentaGreen * 2.55 * weight;
        const yellowBlueShift = adj.yellowBlue * 2.55 * weight;
        const blackShift = adj.black * 2.55 * weight;

        // Cyan-Red affects R channel
        r = r + cyanRedShift - blackShift;
        // Magenta-Green affects G channel
        g = g + magentaGreenShift - blackShift;
        // Yellow-Blue affects B channel
        b = b + yellowBlueShift - blackShift;
      }

      outputData.data[i] = Math.max(0, Math.min(255, r));
      outputData.data[i + 1] = Math.max(0, Math.min(255, g));
      outputData.data[i + 2] = Math.max(0, Math.min(255, b));
      outputData.data[i + 3] = srcData[i + 3];
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
    this.adjustments = {
      red: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      yellow: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      green: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      cyan: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      blue: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 },
      magenta: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, black: 0 }
    };
    this.updateSliders();
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SelectiveColorTool();
});
