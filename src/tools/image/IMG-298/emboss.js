class EmbossTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      direction: 'topLeft',
      strength: 100,
      angle: 135,
      depth: 1,
      grayscale: true,
      blend: false
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.direction = btn.dataset.direction;
        this.updateAngleFromDirection();
        this.render();
      });
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    document.getElementById('depth').addEventListener('input', (e) => {
      this.settings.depth = parseInt(e.target.value);
      document.getElementById('depthValue').textContent = this.settings.depth;
      this.render();
    });

    document.getElementById('grayscaleCheck').addEventListener('change', (e) => {
      this.settings.grayscale = e.target.checked;
      this.render();
    });

    document.getElementById('blendCheck').addEventListener('change', (e) => {
      this.settings.blend = e.target.checked;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateAngleFromDirection() {
    const angles = {
      topLeft: 135,
      topRight: 45,
      bottomLeft: 225,
      bottomRight: 315
    };
    this.settings.angle = angles[this.settings.direction];
    document.getElementById('angle').value = this.settings.angle;
    document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
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

  getKernel() {
    const angle = this.settings.angle * Math.PI / 180;
    const depth = this.settings.depth;

    // Calculate kernel based on angle
    const dx = Math.round(Math.cos(angle) * depth);
    const dy = Math.round(-Math.sin(angle) * depth);

    // Create 3x3 emboss kernel
    const kernel = new Array(9).fill(0);
    const centerIdx = 4;

    // Set positive and negative based on direction
    const posX = 1 + dx;
    const posY = 1 + dy;
    const negX = 1 - dx;
    const negY = 1 - dy;

    if (posX >= 0 && posX < 3 && posY >= 0 && posY < 3) {
      kernel[posY * 3 + posX] = -1 * depth;
    }
    if (negX >= 0 && negX < 3 && negY >= 0 && negY < 3) {
      kernel[negY * 3 + negX] = 1 * depth;
    }

    return kernel;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const kernel = this.getKernel();
    const strength = this.settings.strength / 100;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumR = 0, sumG = 0, sumB = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            const idx = (py * width + px) * 4;
            const k = kernel[ky * 3 + kx];

            sumR += srcData[idx] * k;
            sumG += srcData[idx + 1] * k;
            sumB += srcData[idx + 2] * k;
          }
        }

        const idx = (y * width + x) * 4;

        // Apply strength and add 128 for gray base
        let r = 128 + sumR * strength;
        let g = 128 + sumG * strength;
        let b = 128 + sumB * strength;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        if (this.settings.grayscale) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        if (this.settings.blend) {
          const blend = 0.5;
          r = r * blend + srcData[idx] * (1 - blend);
          g = g * blend + srcData[idx + 1] * (1 - blend);
          b = b * blend + srcData[idx + 2] * (1 - blend);
        }

        outputData.data[idx] = r;
        outputData.data[idx + 1] = g;
        outputData.data[idx + 2] = b;
        outputData.data[idx + 3] = srcData[idx + 3];
      }
    }

    // Handle edges
    for (let x = 0; x < width; x++) {
      const topIdx = x * 4;
      const bottomIdx = ((height - 1) * width + x) * 4;
      outputData.data[topIdx] = outputData.data[topIdx + 1] = outputData.data[topIdx + 2] = 128;
      outputData.data[topIdx + 3] = 255;
      outputData.data[bottomIdx] = outputData.data[bottomIdx + 1] = outputData.data[bottomIdx + 2] = 128;
      outputData.data[bottomIdx + 3] = 255;
    }
    for (let y = 0; y < height; y++) {
      const leftIdx = y * width * 4;
      const rightIdx = (y * width + width - 1) * 4;
      outputData.data[leftIdx] = outputData.data[leftIdx + 1] = outputData.data[leftIdx + 2] = 128;
      outputData.data[leftIdx + 3] = 255;
      outputData.data[rightIdx] = outputData.data[rightIdx + 1] = outputData.data[rightIdx + 2] = 128;
      outputData.data[rightIdx + 3] = 255;
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'emboss-effect.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      direction: 'topLeft',
      strength: 100,
      angle: 135,
      depth: 1,
      grayscale: true,
      blend: false
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-direction="topLeft"]').classList.add('active');
    document.getElementById('strength').value = 100;
    document.getElementById('strengthValue').textContent = '100%';
    document.getElementById('angle').value = 135;
    document.getElementById('angleValue').textContent = '135°';
    document.getElementById('depth').value = 1;
    document.getElementById('depthValue').textContent = '1';
    document.getElementById('grayscaleCheck').checked = true;
    document.getElementById('blendCheck').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EmbossTool();
});
