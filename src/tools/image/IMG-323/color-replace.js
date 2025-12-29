class ColorReplaceTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.isPickerActive = false;
    this.settings = {
      sourceColor: { r: 255, g: 0, b: 0 },
      targetColor: { r: 0, g: 0, b: 255 },
      tolerance: 30,
      feather: 10
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

    document.getElementById('pickerBtn').addEventListener('click', () => {
      this.isPickerActive = !this.isPickerActive;
      document.getElementById('pickerBtn').classList.toggle('active', this.isPickerActive);
      this.canvas.style.cursor = this.isPickerActive ? 'crosshair' : 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.isPickerActive && this.imageData) {
        this.pickColor(e);
      }
    });

    document.getElementById('sourceColor').addEventListener('input', (e) => {
      const color = this.hexToRgb(e.target.value);
      if (color) {
        this.settings.sourceColor = color;
        document.getElementById('sourcePreview').style.background = e.target.value;
        this.render();
      }
    });

    document.getElementById('targetColorPicker').addEventListener('input', (e) => {
      const color = this.hexToRgb(e.target.value);
      if (color) {
        this.settings.targetColor = color;
        document.getElementById('targetColor').value = e.target.value;
        this.render();
      }
    });

    document.getElementById('targetColor').addEventListener('input', (e) => {
      const color = this.hexToRgb(e.target.value);
      if (color) {
        this.settings.targetColor = color;
        document.getElementById('targetColorPicker').value = e.target.value;
        this.render();
      }
    });

    document.getElementById('tolerance').addEventListener('input', (e) => {
      this.settings.tolerance = parseInt(e.target.value);
      document.getElementById('toleranceValue').textContent = this.settings.tolerance;
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  pickColor(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const idx = (y * this.canvas.width + x) * 4;
    const r = this.imageData.data[idx];
    const g = this.imageData.data[idx + 1];
    const b = this.imageData.data[idx + 2];

    this.settings.sourceColor = { r, g, b };
    const hex = this.rgbToHex(r, g, b);
    document.getElementById('sourceColor').value = hex;
    document.getElementById('sourcePreview').style.background = hex;

    this.isPickerActive = false;
    document.getElementById('pickerBtn').classList.remove('active');
    this.canvas.style.cursor = 'default';

    this.render();
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

  colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    const { sourceColor, targetColor, tolerance, feather } = this.settings;
    const maxDist = tolerance * 4.42; // sqrt(3) * 255 * tolerance/100

    for (let i = 0; i < srcData.length; i += 4) {
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];

      const dist = this.colorDistance(r, g, b, sourceColor.r, sourceColor.g, sourceColor.b);

      if (dist <= maxDist) {
        let blend = 1;
        if (feather > 0 && dist > maxDist - feather * 4.42) {
          blend = 1 - (dist - (maxDist - feather * 4.42)) / (feather * 4.42);
          blend = Math.max(0, Math.min(1, blend));
        }

        outputData.data[i] = r + (targetColor.r - r) * blend;
        outputData.data[i + 1] = g + (targetColor.g - g) * blend;
        outputData.data[i + 2] = b + (targetColor.b - b) * blend;
      } else {
        outputData.data[i] = r;
        outputData.data[i + 1] = g;
        outputData.data[i + 2] = b;
      }
      outputData.data[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'color-replaced-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = {
      sourceColor: { r: 255, g: 0, b: 0 },
      targetColor: { r: 0, g: 0, b: 255 },
      tolerance: 30,
      feather: 10
    };
    document.getElementById('sourceColor').value = '#ff0000';
    document.getElementById('sourcePreview').style.background = '#ff0000';
    document.getElementById('targetColor').value = '#0000ff';
    document.getElementById('targetColorPicker').value = '#0000ff';
    document.getElementById('tolerance').value = 30;
    document.getElementById('toleranceValue').textContent = '30';
    document.getElementById('feather').value = 10;
    document.getElementById('featherValue').textContent = '10';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColorReplaceTool();
});
