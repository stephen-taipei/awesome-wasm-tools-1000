class PixelSortTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'horizontal',
      sortBy: 'brightness',
      thresholdLow: 30,
      thresholdHigh: 220
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

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.settings.mode = tab.dataset.mode;
        this.render();
      });
    });

    // Sort by select
    document.getElementById('sortBy').addEventListener('change', (e) => {
      this.settings.sortBy = e.target.value;
      this.render();
    });

    // Threshold sliders
    document.getElementById('thresholdLow').addEventListener('input', (e) => {
      this.settings.thresholdLow = parseInt(e.target.value);
      document.getElementById('thresholdLowValue').textContent = this.settings.thresholdLow;
      this.render();
    });

    document.getElementById('thresholdHigh').addEventListener('input', (e) => {
      this.settings.thresholdHigh = parseInt(e.target.value);
      document.getElementById('thresholdHighValue').textContent = this.settings.thresholdHigh;
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

  getSortValue(r, g, b) {
    switch (this.settings.sortBy) {
      case 'brightness':
        return 0.299 * r + 0.587 * g + 0.114 * b;
      case 'hue':
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max === min) return 0;
        let hue;
        if (max === r) hue = (g - b) / (max - min);
        else if (max === g) hue = 2 + (b - r) / (max - min);
        else hue = 4 + (r - g) / (max - min);
        return (hue * 60 + 360) % 360;
      case 'saturation':
        const maxS = Math.max(r, g, b);
        const minS = Math.min(r, g, b);
        if (maxS === 0) return 0;
        return (maxS - minS) / maxS * 255;
      case 'red':
        return r;
      case 'green':
        return g;
      case 'blue':
        return b;
      default:
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    // Copy original data
    for (let i = 0; i < srcData.length; i++) {
      dstData[i] = srcData[i];
    }

    if (this.settings.mode === 'horizontal') {
      this.sortHorizontal(dstData, width, height);
    } else {
      this.sortVertical(dstData, width, height);
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  sortHorizontal(data, width, height) {
    const lowThresh = this.settings.thresholdLow;
    const highThresh = this.settings.thresholdHigh;

    for (let y = 0; y < height; y++) {
      let startX = -1;
      const pixels = [];

      for (let x = 0; x <= width; x++) {
        let inRange = false;

        if (x < width) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const value = this.getSortValue(r, g, b);
          inRange = value >= lowThresh && value <= highThresh;
        }

        if (inRange && startX === -1) {
          startX = x;
        } else if (!inRange && startX !== -1) {
          // Sort the segment
          for (let px = startX; px < x; px++) {
            const idx = (y * width + px) * 4;
            pixels.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              a: data[idx + 3],
              value: this.getSortValue(data[idx], data[idx + 1], data[idx + 2])
            });
          }

          pixels.sort((a, b) => a.value - b.value);

          for (let i = 0; i < pixels.length; i++) {
            const idx = (y * width + startX + i) * 4;
            data[idx] = pixels[i].r;
            data[idx + 1] = pixels[i].g;
            data[idx + 2] = pixels[i].b;
            data[idx + 3] = pixels[i].a;
          }

          pixels.length = 0;
          startX = -1;
        }
      }
    }
  }

  sortVertical(data, width, height) {
    const lowThresh = this.settings.thresholdLow;
    const highThresh = this.settings.thresholdHigh;

    for (let x = 0; x < width; x++) {
      let startY = -1;
      const pixels = [];

      for (let y = 0; y <= height; y++) {
        let inRange = false;

        if (y < height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const value = this.getSortValue(r, g, b);
          inRange = value >= lowThresh && value <= highThresh;
        }

        if (inRange && startY === -1) {
          startY = y;
        } else if (!inRange && startY !== -1) {
          // Sort the segment
          for (let py = startY; py < y; py++) {
            const idx = (py * width + x) * 4;
            pixels.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
              a: data[idx + 3],
              value: this.getSortValue(data[idx], data[idx + 1], data[idx + 2])
            });
          }

          pixels.sort((a, b) => a.value - b.value);

          for (let i = 0; i < pixels.length; i++) {
            const idx = ((startY + i) * width + x) * 4;
            data[idx] = pixels[i].r;
            data[idx + 1] = pixels[i].g;
            data[idx + 2] = pixels[i].b;
            data[idx + 3] = pixels[i].a;
          }

          pixels.length = 0;
          startY = -1;
        }
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'pixel-sorted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'horizontal',
      sortBy: 'brightness',
      thresholdLow: 30,
      thresholdHigh: 220
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.mode-tab[data-mode="horizontal"]').classList.add('active');
    document.getElementById('sortBy').value = 'brightness';
    document.getElementById('thresholdLow').value = 30;
    document.getElementById('thresholdLowValue').textContent = '30';
    document.getElementById('thresholdHigh').value = 220;
    document.getElementById('thresholdHighValue').textContent = '220';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PixelSortTool();
});
