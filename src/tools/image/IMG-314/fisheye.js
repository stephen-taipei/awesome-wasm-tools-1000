class FisheyeTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'barrel',
      strength: 50,
      zoom: 100,
      centerX: 50,
      centerY: 50
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

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mode = btn.dataset.mode;
        this.render();
      });
    });

    document.getElementById('strength').addEventListener('input', (e) => {
      this.settings.strength = parseInt(e.target.value);
      document.getElementById('strengthValue').textContent = `${this.settings.strength}%`;
      this.render();
    });

    document.getElementById('zoom').addEventListener('input', (e) => {
      this.settings.zoom = parseInt(e.target.value);
      document.getElementById('zoomValue').textContent = `${this.settings.zoom}%`;
      this.render();
    });

    document.getElementById('centerX').addEventListener('input', (e) => {
      this.settings.centerX = parseInt(e.target.value);
      document.getElementById('centerXValue').textContent = `${this.settings.centerX}%`;
      this.render();
    });

    document.getElementById('centerY').addEventListener('input', (e) => {
      this.settings.centerY = parseInt(e.target.value);
      document.getElementById('centerYValue').textContent = `${this.settings.centerY}%`;
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

    const centerX = (this.settings.centerX / 100) * width;
    const centerY = (this.settings.centerY / 100) * height;
    const maxRadius = Math.min(width, height) / 2;
    const strength = this.settings.strength / 100;
    const zoom = this.settings.zoom / 100;
    const isBarrel = this.settings.mode === 'barrel';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Normalize coordinates to -1 to 1
        const nx = (x - centerX) / maxRadius;
        const ny = (y - centerY) / maxRadius;
        const r = Math.sqrt(nx * nx + ny * ny);

        let srcX, srcY;

        if (r > 0) {
          let newR;
          if (isBarrel) {
            // Barrel distortion (fisheye)
            newR = r * (1 + strength * r * r);
          } else {
            // Pincushion distortion (inverse fisheye)
            newR = r * (1 - strength * r * r);
          }

          const scale = newR / r / zoom;
          srcX = centerX + nx * scale * maxRadius;
          srcY = centerY + ny * scale * maxRadius;
        } else {
          srcX = x / zoom + centerX * (1 - 1/zoom);
          srcY = y / zoom + centerY * (1 - 1/zoom);
        }

        if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
          // Bilinear interpolation
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const fx = srcX - x0;
          const fy = srcY - y0;

          const idx00 = (y0 * width + x0) * 4;
          const idx10 = (y0 * width + x1) * 4;
          const idx01 = (y1 * width + x0) * 4;
          const idx11 = (y1 * width + x1) * 4;

          for (let c = 0; c < 4; c++) {
            const v = srcData[idx00 + c] * (1 - fx) * (1 - fy) +
                     srcData[idx10 + c] * fx * (1 - fy) +
                     srcData[idx01 + c] * (1 - fx) * fy +
                     srcData[idx11 + c] * fx * fy;
            outputData.data[idx + c] = Math.round(v);
          }
        } else {
          outputData.data[idx + 3] = 0;
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'fisheye-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { mode: 'barrel', strength: 50, zoom: 100, centerX: 50, centerY: 50 };
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="barrel"]').classList.add('active');
    document.getElementById('strength').value = 50;
    document.getElementById('strengthValue').textContent = '50%';
    document.getElementById('zoom').value = 100;
    document.getElementById('zoomValue').textContent = '100%';
    document.getElementById('centerX').value = 50;
    document.getElementById('centerXValue').textContent = '50%';
    document.getElementById('centerY').value = 50;
    document.getElementById('centerYValue').textContent = '50%';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FisheyeTool();
});
