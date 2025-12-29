class OilPaintingTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      brushSize: 4,
      detail: 3,
      saturation: 120
    };
    this.processing = false;
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
    document.getElementById('brushSize').addEventListener('input', (e) => {
      this.settings.brushSize = parseInt(e.target.value);
      document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
      this.render();
    });

    document.getElementById('detail').addEventListener('input', (e) => {
      this.settings.detail = parseInt(e.target.value);
      document.getElementById('detailValue').textContent = this.settings.detail;
      this.render();
    });

    document.getElementById('saturation').addEventListener('input', (e) => {
      this.settings.saturation = parseInt(e.target.value);
      document.getElementById('saturationValue').textContent = `${this.settings.saturation}%`;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'subtle':
        this.settings = { brushSize: 2, detail: 4, saturation: 110 };
        break;
      case 'medium':
        this.settings = { brushSize: 4, detail: 3, saturation: 120 };
        break;
      case 'bold':
        this.settings = { brushSize: 7, detail: 2, saturation: 140 };
        break;
      case 'impressionist':
        this.settings = { brushSize: 5, detail: 2, saturation: 150 };
        break;
      case 'abstract':
        this.settings = { brushSize: 10, detail: 1, saturation: 160 };
        break;
      case 'reset':
        this.settings = { brushSize: 1, detail: 5, saturation: 100 };
        break;
    }

    this.updateSliders();
    this.render();
  }

  updateSliders() {
    document.getElementById('brushSize').value = this.settings.brushSize;
    document.getElementById('brushSizeValue').textContent = this.settings.brushSize;
    document.getElementById('detail').value = this.settings.detail;
    document.getElementById('detailValue').textContent = this.settings.detail;
    document.getElementById('saturation').value = this.settings.saturation;
    document.getElementById('saturationValue').textContent = `${this.settings.saturation}%`;
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
    if (!this.originalImage || !this.imageData || this.processing) return;

    this.processing = true;
    document.getElementById('processingIndicator').classList.add('active');

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      this.applyOilPaintingEffect();
      this.processing = false;
      document.getElementById('processingIndicator').classList.remove('active');
    }, 10);
  }

  applyOilPaintingEffect() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    const radius = this.settings.brushSize;
    const intensityLevels = Math.pow(2, this.settings.detail);
    const satMult = this.settings.saturation / 100;

    // Create intensity lookup for original image
    const intensity = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      intensity[i] = Math.floor(
        ((srcData[idx] + srcData[idx + 1] + srcData[idx + 2]) / 3) *
        intensityLevels / 256
      );
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Count intensities and accumulate colors
        const intensityCount = new Array(intensityLevels).fill(0);
        const avgR = new Array(intensityLevels).fill(0);
        const avgG = new Array(intensityLevels).fill(0);
        const avgB = new Array(intensityLevels).fill(0);

        // Sample neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nIdx = ny * width + nx;
            const pIdx = nIdx * 4;

            const currIntensity = intensity[nIdx];
            intensityCount[currIntensity]++;
            avgR[currIntensity] += srcData[pIdx];
            avgG[currIntensity] += srcData[pIdx + 1];
            avgB[currIntensity] += srcData[pIdx + 2];
          }
        }

        // Find most common intensity
        let maxCount = 0;
        let maxIntensity = 0;
        for (let i = 0; i < intensityLevels; i++) {
          if (intensityCount[i] > maxCount) {
            maxCount = intensityCount[i];
            maxIntensity = i;
          }
        }

        // Calculate average color for that intensity
        const dstIdx = (y * width + x) * 4;
        let r = avgR[maxIntensity] / maxCount;
        let g = avgG[maxIntensity] / maxCount;
        let b = avgB[maxIntensity] / maxCount;

        // Apply saturation adjustment
        if (satMult !== 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * satMult;
          g = gray + (g - gray) * satMult;
          b = gray + (b - gray) * satMult;
        }

        dstData[dstIdx] = Math.max(0, Math.min(255, r));
        dstData[dstIdx + 1] = Math.max(0, Math.min(255, g));
        dstData[dstIdx + 2] = Math.max(0, Math.min(255, b));
        dstData[dstIdx + 3] = srcData[dstIdx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'oil-painting-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { brushSize: 4, detail: 3, saturation: 120 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="medium"]').classList.add('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OilPaintingTool();
});
