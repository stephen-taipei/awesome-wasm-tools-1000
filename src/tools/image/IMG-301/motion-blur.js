class MotionBlurTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      distance: 20,
      angle: 0
    };
    this.renderTimeout = null;
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

    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const angle = parseInt(btn.dataset.angle);
        if (angle >= 0) {
          this.settings.angle = angle;
          document.getElementById('angle').value = angle;
          document.getElementById('angleValue').textContent = `${angle}°`;
        }
        this.debouncedRender();
      });
    });

    document.getElementById('distance').addEventListener('input', (e) => {
      this.settings.distance = parseInt(e.target.value);
      document.getElementById('distanceValue').textContent = `${this.settings.distance} px`;
      this.debouncedRender();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      // Deselect direction buttons
      document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
      this.debouncedRender();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  debouncedRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    document.getElementById('processing').classList.add('active');
    this.renderTimeout = setTimeout(() => {
      this.render();
      document.getElementById('processing').classList.remove('active');
    }, 50);
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
    const distance = this.settings.distance;
    const angle = this.settings.angle * Math.PI / 180;

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const samples = Math.max(3, Math.floor(distance / 2));
    const step = distance / samples;

    const outputData = this.ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
        let count = 0;

        for (let s = -samples / 2; s <= samples / 2; s++) {
          const sx = Math.round(x + dx * s * step);
          const sy = Math.round(y + dy * s * step);

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = (sy * width + sx) * 4;
            sumR += srcData[idx];
            sumG += srcData[idx + 1];
            sumB += srcData[idx + 2];
            sumA += srcData[idx + 3];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        outputData.data[idx] = sumR / count;
        outputData.data[idx + 1] = sumG / count;
        outputData.data[idx + 2] = sumB / count;
        outputData.data[idx + 3] = sumA / count;
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'motion-blur.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { distance: 20, angle: 0 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.direction-btn[data-angle="180"]').classList.add('active');
    document.getElementById('distance').value = 20;
    document.getElementById('distanceValue').textContent = '20 px';
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MotionBlurTool();
});
