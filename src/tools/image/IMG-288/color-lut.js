class ColorLutTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentLut = 'none';
    this.intensity = 100;
    this.luts = this.generateLuts();
    this.init();
  }

  init() {
    this.bindEvents();
  }

  generateLuts() {
    const luts = {};

    // None (identity)
    luts.none = (r, g, b) => ({ r, g, b });

    // Cinematic - teal shadows, orange highlights
    luts.cinematic = (r, g, b) => {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const shadowWeight = Math.max(0, 1 - lum / 128);
      const highlightWeight = Math.max(0, (lum - 128) / 127);

      // Teal shadows
      r = r - shadowWeight * 20;
      g = g + shadowWeight * 10;
      b = b + shadowWeight * 30;

      // Orange highlights
      r = r + highlightWeight * 30;
      g = g + highlightWeight * 10;
      b = b - highlightWeight * 20;

      // Increase contrast
      r = (r - 128) * 1.1 + 128;
      g = (g - 128) * 1.1 + 128;
      b = (b - 128) * 1.1 + 128;

      return { r, g, b };
    };

    // Vintage - faded warm tones
    luts.vintage = (r, g, b) => {
      // Warm overlay
      r = r * 1.1 + 15;
      g = g * 0.95 + 10;
      b = b * 0.85;

      // Reduce contrast
      r = (r - 128) * 0.85 + 128 + 10;
      g = (g - 128) * 0.85 + 128 + 5;
      b = (b - 128) * 0.85 + 128;

      // Fade blacks
      r = Math.max(r, 25);
      g = Math.max(g, 20);
      b = Math.max(b, 15);

      return { r, g, b };
    };

    // Teal and Orange
    luts['teal-orange'] = (r, g, b) => {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Push shadows to teal
      if (lum < 128) {
        const weight = (128 - lum) / 128;
        r = r - weight * 30;
        g = g + weight * 15;
        b = b + weight * 25;
      }

      // Push highlights to orange
      if (lum > 128) {
        const weight = (lum - 128) / 127;
        r = r + weight * 40;
        g = g + weight * 15;
        b = b - weight * 25;
      }

      return { r, g, b };
    };

    // Noir - high contrast B&W
    luts.noir = (r, g, b) => {
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Increase contrast
      gray = (gray - 128) * 1.4 + 128;

      // Slight warmth in highlights
      const warmth = Math.max(0, (gray - 180) / 75) * 10;

      return { r: gray + warmth, g: gray, b: gray - warmth * 0.5 };
    };

    // Bleach bypass
    luts.bleach = (r, g, b) => {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Mix with desaturated version
      r = r * 0.6 + gray * 0.4;
      g = g * 0.6 + gray * 0.4;
      b = b * 0.6 + gray * 0.4;

      // Increase contrast
      r = (r - 128) * 1.3 + 128;
      g = (g - 128) * 1.3 + 128;
      b = (b - 128) * 1.3 + 128;

      return { r, g, b };
    };

    // Cross process
    luts['cross-process'] = (r, g, b) => {
      // Curve adjustments simulating cross-processing
      r = 255 * Math.pow(r / 255, 0.85);
      g = 255 * Math.pow(g / 255, 1.1);
      b = 255 * Math.pow(b / 255, 0.9);

      // Add color cast
      r = r * 1.1;
      g = g * 0.95 + 10;
      b = b * 0.8 + 20;

      // Shift shadows to cyan-green
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 100) {
        const weight = (100 - lum) / 100;
        r = r - weight * 15;
        g = g + weight * 10;
        b = b + weight * 5;
      }

      return { r, g, b };
    };

    // Warm
    luts.warm = (r, g, b) => {
      r = r * 1.1 + 10;
      g = g * 1.02;
      b = b * 0.9 - 10;

      // Add slight saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 1.15;
      g = gray + (g - gray) * 1.1;
      b = gray + (b - gray) * 1.05;

      return { r, g, b };
    };

    // Cool
    luts.cool = (r, g, b) => {
      r = r * 0.9 - 5;
      g = g * 0.98;
      b = b * 1.1 + 10;

      // Slight desaturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 0.9;
      g = gray + (g - gray) * 0.95;
      b = gray + (b - gray) * 1.05;

      return { r, g, b };
    };

    // Matte
    luts.matte = (r, g, b) => {
      // Lift blacks
      r = r * 0.85 + 30;
      g = g * 0.85 + 28;
      b = b * 0.85 + 32;

      // Reduce contrast
      r = (r - 128) * 0.8 + 128;
      g = (g - 128) * 0.8 + 128;
      b = (b - 128) * 0.8 + 128;

      // Slight desaturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 0.85;
      g = gray + (g - gray) * 0.85;
      b = gray + (b - gray) * 0.85;

      return { r, g, b };
    };

    return luts;
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

    // LUT cards
    document.querySelectorAll('.lut-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.lut-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentLut = card.dataset.lut;
        this.render();
      });
    });

    // Intensity slider
    document.getElementById('intensity').addEventListener('input', (e) => {
      this.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = `${this.intensity}%`;
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

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    const lutFn = this.luts[this.currentLut];
    const intensityFactor = this.intensity / 100;

    for (let i = 0; i < srcData.length; i += 4) {
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];

      const result = lutFn(r, g, b);

      // Blend original with LUT result based on intensity
      dstData[i] = Math.max(0, Math.min(255, r + (result.r - r) * intensityFactor));
      dstData[i + 1] = Math.max(0, Math.min(255, g + (result.g - g) * intensityFactor));
      dstData[i + 2] = Math.max(0, Math.min(255, b + (result.b - b) * intensityFactor));
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'color-graded-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.currentLut = 'none';
    this.intensity = 100;
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.lut-card').forEach(c => c.classList.remove('active'));
    document.querySelector('.lut-card[data-lut="none"]').classList.add('active');
    document.getElementById('intensity').value = 100;
    document.getElementById('intensityValue').textContent = '100%';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColorLutTool();
});
