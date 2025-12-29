class SwirlTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      direction: 'cw',
      angle: 180,
      radius: 100,
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

    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.direction = btn.dataset.direction;
        this.render();
      });
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${this.settings.radius}%`;
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
    const maxRadius = Math.min(width, height) / 2 * (this.settings.radius / 100);
    const swirlAngle = this.settings.angle * Math.PI / 180;
    const direction = this.settings.direction === 'cw' ? 1 : -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let srcX, srcY;

        if (dist < maxRadius) {
          // Calculate swirl effect
          const factor = 1 - dist / maxRadius;
          const angle = Math.atan2(dy, dx) - direction * swirlAngle * factor * factor;

          srcX = centerX + Math.cos(angle) * dist;
          srcY = centerY + Math.sin(angle) * dist;
        } else {
          srcX = x;
          srcY = y;
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
    link.download = 'swirl-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { direction: 'cw', angle: 180, radius: 100, centerX: 50, centerY: 50 };
    document.querySelectorAll('.direction-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.direction-btn[data-direction="cw"]').classList.add('active');
    document.getElementById('angle').value = 180;
    document.getElementById('angleValue').textContent = '180°';
    document.getElementById('radius').value = 100;
    document.getElementById('radiusValue').textContent = '100%';
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
  new SwirlTool();
});
