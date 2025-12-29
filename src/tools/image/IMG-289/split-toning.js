class SplitToningTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      highlightHue: 40,
      highlightSat: 25,
      shadowHue: 220,
      shadowSat: 25,
      balance: 0
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateColorPreviews();
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Highlight controls
    document.getElementById('highlightHue').addEventListener('input', (e) => {
      this.settings.highlightHue = parseInt(e.target.value);
      this.updateColorPreviews();
      this.render();
    });
    document.getElementById('highlightSat').addEventListener('input', (e) => {
      this.settings.highlightSat = parseInt(e.target.value);
      document.getElementById('highlightSatValue').textContent = `${this.settings.highlightSat}%`;
      this.updateColorPreviews();
      this.render();
    });

    // Shadow controls
    document.getElementById('shadowHue').addEventListener('input', (e) => {
      this.settings.shadowHue = parseInt(e.target.value);
      this.updateColorPreviews();
      this.render();
    });
    document.getElementById('shadowSat').addEventListener('input', (e) => {
      this.settings.shadowSat = parseInt(e.target.value);
      document.getElementById('shadowSatValue').textContent = `${this.settings.shadowSat}%`;
      this.updateColorPreviews();
      this.render();
    });

    // Balance
    document.getElementById('balance').addEventListener('input', (e) => {
      this.settings.balance = parseInt(e.target.value);
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'classic':
        this.settings = { highlightHue: 45, highlightSat: 30, shadowHue: 210, shadowSat: 25, balance: 0 };
        break;
      case 'cinematic':
        this.settings = { highlightHue: 35, highlightSat: 40, shadowHue: 195, shadowSat: 35, balance: -20 };
        break;
      case 'sunset':
        this.settings = { highlightHue: 30, highlightSat: 50, shadowHue: 280, shadowSat: 30, balance: 10 };
        break;
      case 'cool':
        this.settings = { highlightHue: 180, highlightSat: 20, shadowHue: 240, shadowSat: 30, balance: 0 };
        break;
      case 'sepia':
        this.settings = { highlightHue: 40, highlightSat: 35, shadowHue: 30, shadowSat: 40, balance: 0 };
        break;
      case 'reset':
        this.settings = { highlightHue: 40, highlightSat: 0, shadowHue: 220, shadowSat: 0, balance: 0 };
        break;
    }

    this.updateSliders();
    this.updateColorPreviews();
    this.render();
  }

  updateSliders() {
    document.getElementById('highlightHue').value = this.settings.highlightHue;
    document.getElementById('highlightSat').value = this.settings.highlightSat;
    document.getElementById('highlightSatValue').textContent = `${this.settings.highlightSat}%`;
    document.getElementById('shadowHue').value = this.settings.shadowHue;
    document.getElementById('shadowSat').value = this.settings.shadowSat;
    document.getElementById('shadowSatValue').textContent = `${this.settings.shadowSat}%`;
    document.getElementById('balance').value = this.settings.balance;
  }

  updateColorPreviews() {
    const highlightColor = this.hslToRgb(this.settings.highlightHue / 360, this.settings.highlightSat / 100, 0.5);
    const shadowColor = this.hslToRgb(this.settings.shadowHue / 360, this.settings.shadowSat / 100, 0.3);

    document.getElementById('highlightPreview').style.background =
      `rgb(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b})`;
    document.getElementById('shadowPreview').style.background =
      `rgb(${shadowColor.r}, ${shadowColor.g}, ${shadowColor.b})`;
  }

  hslToRgb(h, s, l) {
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

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
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

    const highlightColor = this.hslToRgb(this.settings.highlightHue / 360, 1, 0.5);
    const shadowColor = this.hslToRgb(this.settings.shadowHue / 360, 1, 0.5);
    const highlightSat = this.settings.highlightSat / 100;
    const shadowSat = this.settings.shadowSat / 100;
    const balance = this.settings.balance / 100;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Calculate luminosity
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Calculate shadow and highlight weights
      // Balance shifts the midpoint
      const midpoint = 128 + balance * 64;
      let shadowWeight = Math.max(0, 1 - lum / midpoint);
      let highlightWeight = Math.max(0, (lum - midpoint) / (255 - midpoint));

      // Apply shadow toning
      if (shadowWeight > 0 && shadowSat > 0) {
        const weight = shadowWeight * shadowSat;
        r = r + (shadowColor.r - 128) * weight * 0.5;
        g = g + (shadowColor.g - 128) * weight * 0.5;
        b = b + (shadowColor.b - 128) * weight * 0.5;
      }

      // Apply highlight toning
      if (highlightWeight > 0 && highlightSat > 0) {
        const weight = highlightWeight * highlightSat;
        r = r + (highlightColor.r - 128) * weight * 0.5;
        g = g + (highlightColor.g - 128) * weight * 0.5;
        b = b + (highlightColor.b - 128) * weight * 0.5;
      }

      dstData[i] = Math.max(0, Math.min(255, r));
      dstData[i + 1] = Math.max(0, Math.min(255, g));
      dstData[i + 2] = Math.max(0, Math.min(255, b));
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'split-toned-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      highlightHue: 40,
      highlightSat: 25,
      shadowHue: 220,
      shadowSat: 25,
      balance: 0
    };
    document.getElementById('editorSection').classList.remove('active');
    this.updateSliders();
    this.updateColorPreviews();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SplitToningTool();
});
