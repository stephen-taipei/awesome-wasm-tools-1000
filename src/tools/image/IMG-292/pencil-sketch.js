class PencilSketchTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      lineStrength: 50,
      contrast: 50,
      blur: 2,
      invert: false,
      color: false
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('lineStrength').addEventListener('input', (e) => {
      this.settings.lineStrength = parseInt(e.target.value);
      document.getElementById('lineStrengthValue').textContent = `${this.settings.lineStrength}%`;
      this.render();
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
      this.settings.contrast = parseInt(e.target.value);
      document.getElementById('contrastValue').textContent = `${this.settings.contrast}%`;
      this.render();
    });

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    // Toggles
    document.getElementById('invertToggle').addEventListener('change', (e) => {
      this.settings.invert = e.target.checked;
      this.render();
    });

    document.getElementById('colorToggle').addEventListener('change', (e) => {
      this.settings.color = e.target.checked;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'light':
        this.settings = { lineStrength: 30, contrast: 40, blur: 3, invert: true, color: false };
        break;
      case 'medium':
        this.settings = { lineStrength: 50, contrast: 50, blur: 2, invert: true, color: false };
        break;
      case 'dark':
        this.settings = { lineStrength: 80, contrast: 70, blur: 2, invert: true, color: false };
        break;
      case 'charcoal':
        this.settings = { lineStrength: 90, contrast: 80, blur: 4, invert: true, color: false };
        break;
      case 'outline':
        this.settings = { lineStrength: 100, contrast: 90, blur: 1, invert: true, color: false };
        break;
      case 'reset':
        this.settings = { lineStrength: 0, contrast: 50, blur: 1, invert: false, color: false };
        break;
    }

    this.updateControls();
    this.render();
  }

  updateControls() {
    document.getElementById('lineStrength').value = this.settings.lineStrength;
    document.getElementById('lineStrengthValue').textContent = `${this.settings.lineStrength}%`;
    document.getElementById('contrast').value = this.settings.contrast;
    document.getElementById('contrastValue').textContent = `${this.settings.contrast}%`;
    document.getElementById('blur').value = this.settings.blur;
    document.getElementById('blurValue').textContent = this.settings.blur;
    document.getElementById('invertToggle').checked = this.settings.invert;
    document.getElementById('colorToggle').checked = this.settings.color;
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

  gaussianBlur(data, width, height, radius) {
    const output = new Uint8ClampedArray(data.length);
    const sigma = radius / 2;
    const kernelSize = Math.ceil(radius * 2) + 1;
    const kernel = [];
    let sum = 0;

    for (let i = 0; i < kernelSize; i++) {
      const x = i - Math.floor(kernelSize / 2);
      const g = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel.push(g);
      sum += g;
    }
    for (let i = 0; i < kernelSize; i++) {
      kernel[i] /= sum;
    }

    // Horizontal pass
    const temp = new Float32Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < kernelSize; k++) {
          const nx = Math.max(0, Math.min(width - 1, x + k - Math.floor(kernelSize / 2)));
          const idx = (y * width + nx) * 4;
          r += data[idx] * kernel[k];
          g += data[idx + 1] * kernel[k];
          b += data[idx + 2] * kernel[k];
        }
        const idx = (y * width + x) * 4;
        temp[idx] = r;
        temp[idx + 1] = g;
        temp[idx + 2] = b;
        temp[idx + 3] = data[idx + 3];
      }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = 0; k < kernelSize; k++) {
          const ny = Math.max(0, Math.min(height - 1, y + k - Math.floor(kernelSize / 2)));
          const idx = (ny * width + x) * 4;
          r += temp[idx] * kernel[k];
          g += temp[idx + 1] * kernel[k];
          b += temp[idx + 2] * kernel[k];
        }
        const idx = (y * width + x) * 4;
        output[idx] = r;
        output[idx + 1] = g;
        output[idx + 2] = b;
        output[idx + 3] = temp[idx + 3];
      }
    }

    return output;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;

    // Step 1: Convert to grayscale
    const grayData = new Uint8ClampedArray(srcData.length);
    for (let i = 0; i < srcData.length; i += 4) {
      const gray = 0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2];
      grayData[i] = gray;
      grayData[i + 1] = gray;
      grayData[i + 2] = gray;
      grayData[i + 3] = srcData[i + 3];
    }

    // Step 2: Invert the grayscale
    const invertedData = new Uint8ClampedArray(grayData.length);
    for (let i = 0; i < grayData.length; i += 4) {
      invertedData[i] = 255 - grayData[i];
      invertedData[i + 1] = 255 - grayData[i + 1];
      invertedData[i + 2] = 255 - grayData[i + 2];
      invertedData[i + 3] = grayData[i + 3];
    }

    // Step 3: Blur the inverted image
    const blurredData = this.gaussianBlur(invertedData, width, height, this.settings.blur * 2);

    // Step 4: Color dodge blend
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;
    const lineStrength = this.settings.lineStrength / 100;
    const contrastFactor = (this.settings.contrast / 50);

    for (let i = 0; i < srcData.length; i += 4) {
      const gray = grayData[i];
      const blurred = blurredData[i];

      // Color dodge: result = base / (1 - blend)
      let dodge;
      if (blurred >= 255) {
        dodge = 255;
      } else {
        dodge = Math.min(255, (gray * 256) / (256 - blurred));
      }

      // Mix with grayscale based on line strength
      let result = gray * (1 - lineStrength) + dodge * lineStrength;

      // Apply contrast
      result = ((result - 128) * contrastFactor) + 128;
      result = Math.max(0, Math.min(255, result));

      // Invert if needed
      if (this.settings.invert) {
        result = 255 - result;
      }

      if (this.settings.color && !this.settings.invert) {
        // Blend sketch with original colors
        const saturation = 0.5;
        const ogGray = 0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2];
        const ratio = result / Math.max(1, ogGray);
        dstData[i] = Math.max(0, Math.min(255, srcData[i] * ratio * saturation + result * (1 - saturation)));
        dstData[i + 1] = Math.max(0, Math.min(255, srcData[i + 1] * ratio * saturation + result * (1 - saturation)));
        dstData[i + 2] = Math.max(0, Math.min(255, srcData[i + 2] * ratio * saturation + result * (1 - saturation)));
      } else {
        dstData[i] = result;
        dstData[i + 1] = result;
        dstData[i + 2] = result;
      }
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'pencil-sketch-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { lineStrength: 50, contrast: 50, blur: 2, invert: false, color: false };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="medium"]').classList.add('active');
    this.updateControls();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PencilSketchTool();
});
