class WatercolorTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      blur: 3,
      edge: 50,
      simplify: 8,
      texture: 30
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
    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    document.getElementById('edge').addEventListener('input', (e) => {
      this.settings.edge = parseInt(e.target.value);
      document.getElementById('edgeValue').textContent = `${this.settings.edge}%`;
      this.render();
    });

    document.getElementById('simplify').addEventListener('input', (e) => {
      this.settings.simplify = parseInt(e.target.value);
      document.getElementById('simplifyValue').textContent = this.settings.simplify;
      this.render();
    });

    document.getElementById('texture').addEventListener('input', (e) => {
      this.settings.texture = parseInt(e.target.value);
      document.getElementById('textureValue').textContent = `${this.settings.texture}%`;
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
        this.settings = { blur: 2, edge: 30, simplify: 12, texture: 20 };
        break;
      case 'medium':
        this.settings = { blur: 3, edge: 50, simplify: 8, texture: 30 };
        break;
      case 'heavy':
        this.settings = { blur: 5, edge: 70, simplify: 5, texture: 40 };
        break;
      case 'wet':
        this.settings = { blur: 6, edge: 20, simplify: 6, texture: 50 };
        break;
      case 'dry':
        this.settings = { blur: 2, edge: 80, simplify: 10, texture: 60 };
        break;
      case 'reset':
        this.settings = { blur: 1, edge: 0, simplify: 32, texture: 0 };
        break;
    }

    this.updateSliders();
    this.render();
  }

  updateSliders() {
    document.getElementById('blur').value = this.settings.blur;
    document.getElementById('blurValue').textContent = this.settings.blur;
    document.getElementById('edge').value = this.settings.edge;
    document.getElementById('edgeValue').textContent = `${this.settings.edge}%`;
    document.getElementById('simplify').value = this.settings.simplify;
    document.getElementById('simplifyValue').textContent = this.settings.simplify;
    document.getElementById('texture').value = this.settings.texture;
    document.getElementById('textureValue').textContent = `${this.settings.texture}%`;
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

  boxBlur(data, width, height, radius) {
    const output = new Uint8ClampedArray(data.length);
    const size = radius * 2 + 1;
    const area = size * size;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const idx = (ny * width + nx) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            aSum += data[idx + 3];
          }
        }

        const idx = (y * width + x) * 4;
        output[idx] = rSum / area;
        output[idx + 1] = gSum / area;
        output[idx + 2] = bSum / area;
        output[idx + 3] = aSum / area;
      }
    }

    return output;
  }

  detectEdges(data, width, height) {
    const edges = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Sobel operator
        const idx = (y * width + x) * 4;
        const idxT = ((y - 1) * width + x) * 4;
        const idxB = ((y + 1) * width + x) * 4;
        const idxL = (y * width + x - 1) * 4;
        const idxR = (y * width + x + 1) * 4;
        const idxTL = ((y - 1) * width + x - 1) * 4;
        const idxTR = ((y - 1) * width + x + 1) * 4;
        const idxBL = ((y + 1) * width + x - 1) * 4;
        const idxBR = ((y + 1) * width + x + 1) * 4;

        const getLum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        const gx = -getLum(idxTL) - 2 * getLum(idxL) - getLum(idxBL) +
                   getLum(idxTR) + 2 * getLum(idxR) + getLum(idxBR);
        const gy = -getLum(idxTL) - 2 * getLum(idxT) - getLum(idxTR) +
                   getLum(idxBL) + 2 * getLum(idxB) + getLum(idxBR);

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;

    // Step 1: Apply blur
    let blurredData = srcData;
    if (this.settings.blur > 1) {
      blurredData = this.boxBlur(srcData, width, height, this.settings.blur);
    }

    // Step 2: Quantize colors
    const levels = this.settings.simplify;
    const quantized = new Uint8ClampedArray(blurredData.length);
    for (let i = 0; i < blurredData.length; i += 4) {
      quantized[i] = Math.round(blurredData[i] / (256 / levels)) * (256 / levels);
      quantized[i + 1] = Math.round(blurredData[i + 1] / (256 / levels)) * (256 / levels);
      quantized[i + 2] = Math.round(blurredData[i + 2] / (256 / levels)) * (256 / levels);
      quantized[i + 3] = blurredData[i + 3];
    }

    // Step 3: Detect edges
    const edges = this.detectEdges(srcData, width, height);

    // Step 4: Create output with edge darkening and texture
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;
    const edgeStrength = this.settings.edge / 100;
    const textureStrength = this.settings.texture / 100;

    // Generate paper texture noise
    const noise = new Float32Array(width * height);
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (Math.random() - 0.5) * 2;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const edgeIdx = y * width + x;

        // Normalize edge value
        const edgeVal = Math.min(1, edges[edgeIdx] / 200);

        // Apply edge darkening
        const edgeDarken = 1 - edgeVal * edgeStrength * 0.5;

        // Apply texture
        const texVal = noise[edgeIdx] * textureStrength * 20;

        // Mix with slight saturation boost for watercolor feel
        let r = quantized[idx] * edgeDarken + texVal;
        let g = quantized[idx + 1] * edgeDarken + texVal;
        let b = quantized[idx + 2] * edgeDarken + texVal;

        // Slight color bleeding effect at edges
        if (edgeVal > 0.1) {
          const bleedAmt = edgeVal * 0.3;
          r = r * (1 - bleedAmt) + blurredData[idx] * bleedAmt;
          g = g * (1 - bleedAmt) + blurredData[idx + 1] * bleedAmt;
          b = b * (1 - bleedAmt) + blurredData[idx + 2] * bleedAmt;
        }

        dstData[idx] = Math.max(0, Math.min(255, r));
        dstData[idx + 1] = Math.max(0, Math.min(255, g));
        dstData[idx + 2] = Math.max(0, Math.min(255, b));
        dstData[idx + 3] = srcData[idx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'watercolor-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { blur: 3, edge: 50, simplify: 8, texture: 30 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="medium"]').classList.add('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WatercolorTool();
});
