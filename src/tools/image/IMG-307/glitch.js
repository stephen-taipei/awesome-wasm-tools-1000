class GlitchTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.glitchBlocks = [];
    this.settings = {
      intensity: 50,
      rgbShift: 10,
      scanlines: 50,
      blocks: 5,
      noise: true,
      wave: false
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

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = `${this.settings.intensity}%`;
      this.render();
    });

    document.getElementById('rgbShift').addEventListener('input', (e) => {
      this.settings.rgbShift = parseInt(e.target.value);
      document.getElementById('rgbShiftValue').textContent = `${this.settings.rgbShift} px`;
      this.render();
    });

    document.getElementById('scanlines').addEventListener('input', (e) => {
      this.settings.scanlines = parseInt(e.target.value);
      document.getElementById('scanlinesValue').textContent = `${this.settings.scanlines}%`;
      this.render();
    });

    document.getElementById('blocks').addEventListener('input', (e) => {
      this.settings.blocks = parseInt(e.target.value);
      document.getElementById('blocksValue').textContent = this.settings.blocks;
      this.generateGlitchBlocks();
      this.render();
    });

    document.getElementById('noiseCheck').addEventListener('change', (e) => {
      this.settings.noise = e.target.checked;
      this.render();
    });

    document.getElementById('waveCheck').addEventListener('change', (e) => {
      this.settings.wave = e.target.checked;
      this.render();
    });

    document.getElementById('regenerateBtn').addEventListener('click', () => {
      this.generateGlitchBlocks();
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
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
        this.generateGlitchBlocks();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  generateGlitchBlocks() {
    if (!this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.glitchBlocks = [];
    for (let i = 0; i < this.settings.blocks; i++) {
      this.glitchBlocks.push({
        y: Math.random() * height,
        height: 5 + Math.random() * 30,
        offset: (Math.random() - 0.5) * 50,
        channel: Math.floor(Math.random() * 3)
      });
    }
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const intensity = this.settings.intensity / 100;
    const rgbShift = this.settings.rgbShift;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        let srcX = x;
        let srcY = y;

        // Wave distortion
        if (this.settings.wave) {
          srcX += Math.sin(y * 0.02) * 5 * intensity;
        }

        // Check if in glitch block
        let blockOffset = 0;
        let blockChannel = -1;
        for (const block of this.glitchBlocks) {
          if (y >= block.y && y < block.y + block.height) {
            blockOffset = block.offset * intensity;
            blockChannel = block.channel;
            break;
          }
        }

        // RGB shift
        const redX = Math.round(srcX + rgbShift * intensity + blockOffset);
        const blueX = Math.round(srcX - rgbShift * intensity + blockOffset);
        const greenX = Math.round(srcX + blockOffset);

        const clamp = (val, max) => Math.max(0, Math.min(max - 1, val));

        const redIdx = (Math.round(srcY) * width + clamp(redX, width)) * 4;
        const greenIdx = (Math.round(srcY) * width + clamp(greenX, width)) * 4;
        const blueIdx = (Math.round(srcY) * width + clamp(blueX, width)) * 4;

        outputData.data[idx] = srcData[redIdx];
        outputData.data[idx + 1] = srcData[greenIdx + 1];
        outputData.data[idx + 2] = srcData[blueIdx + 2];
        outputData.data[idx + 3] = srcData[idx + 3];

        // Channel-specific glitch
        if (blockChannel >= 0) {
          const shift = Math.round(blockOffset * 2);
          const shiftX = clamp(x + shift, width);
          const shiftIdx = (Math.round(srcY) * width + shiftX) * 4;
          outputData.data[idx + blockChannel] = srcData[shiftIdx + blockChannel];
        }

        // Scanlines
        if (this.settings.scanlines > 0 && y % 2 === 0) {
          const scanlineAlpha = (this.settings.scanlines / 100) * 0.3;
          outputData.data[idx] *= (1 - scanlineAlpha);
          outputData.data[idx + 1] *= (1 - scanlineAlpha);
          outputData.data[idx + 2] *= (1 - scanlineAlpha);
        }

        // Noise
        if (this.settings.noise && Math.random() < 0.02 * intensity) {
          const noiseVal = Math.random() * 255;
          outputData.data[idx] = noiseVal;
          outputData.data[idx + 1] = noiseVal;
          outputData.data[idx + 2] = noiseVal;
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'glitch-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.glitchBlocks = [];
    this.settings = { intensity: 50, rgbShift: 10, scanlines: 50, blocks: 5, noise: true, wave: false };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('intensity').value = 50;
    document.getElementById('intensityValue').textContent = '50%';
    document.getElementById('rgbShift').value = 10;
    document.getElementById('rgbShiftValue').textContent = '10 px';
    document.getElementById('scanlines').value = 50;
    document.getElementById('scanlinesValue').textContent = '50%';
    document.getElementById('blocks').value = 5;
    document.getElementById('blocksValue').textContent = '5';
    document.getElementById('noiseCheck').checked = true;
    document.getElementById('waveCheck').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GlitchTool();
});
