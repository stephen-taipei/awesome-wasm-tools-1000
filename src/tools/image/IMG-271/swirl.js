class SwirlTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      angle: 0,
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.angle = parseInt(btn.dataset.angle);
        document.getElementById('angle').value = this.settings.angle;
        document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
        this.render();
      });
    });

    // Angle slider
    const angleSlider = document.getElementById('angle');
    angleSlider.addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    // Radius slider
    const radiusSlider = document.getElementById('radius');
    radiusSlider.addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${this.settings.radius}%`;
      this.render();
    });

    // Center sliders
    ['centerX', 'centerY'].forEach(param => {
      const slider = document.getElementById(param);
      slider.addEventListener('input', (e) => {
        this.settings[param] = parseInt(e.target.value);
        document.getElementById(`${param}Value`).textContent = `${this.settings[param]}%`;
        this.render();
      });
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

    const img = this.originalImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(img.width, img.height);
    const dstData = outputData.data;

    const centerX = (this.settings.centerX / 100) * img.width;
    const centerY = (this.settings.centerY / 100) * img.height;
    const maxRadius = Math.min(img.width, img.height) / 2 * (this.settings.radius / 100);
    const maxAngle = (this.settings.angle * Math.PI) / 180;

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let srcX, srcY;

        if (distance < maxRadius && maxAngle !== 0) {
          // Calculate swirl amount based on distance from center
          const factor = 1 - (distance / maxRadius);
          const swirlAngle = factor * factor * maxAngle;

          const currentAngle = Math.atan2(dy, dx);
          const newAngle = currentAngle + swirlAngle;

          srcX = centerX + Math.cos(newAngle) * distance;
          srcY = centerY + Math.sin(newAngle) * distance;
        } else {
          srcX = x;
          srcY = y;
        }

        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const xFrac = srcX - x0;
        const yFrac = srcY - y0;

        const dstIdx = (y * img.width + x) * 4;

        if (x0 >= 0 && x1 < img.width && y0 >= 0 && y1 < img.height) {
          for (let c = 0; c < 4; c++) {
            const v00 = srcData[(y0 * img.width + x0) * 4 + c];
            const v10 = srcData[(y0 * img.width + x1) * 4 + c];
            const v01 = srcData[(y1 * img.width + x0) * 4 + c];
            const v11 = srcData[(y1 * img.width + x1) * 4 + c];

            const v0 = v00 * (1 - xFrac) + v10 * xFrac;
            const v1 = v01 * (1 - xFrac) + v11 * xFrac;
            dstData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
          }
        } else if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
          const srcIdx = (Math.floor(srcY) * img.width + Math.floor(srcX)) * 4;
          dstData[dstIdx] = srcData[srcIdx];
          dstData[dstIdx + 1] = srcData[srcIdx + 1];
          dstData[dstIdx + 2] = srcData[srcIdx + 2];
          dstData[dstIdx + 3] = srcData[srcIdx + 3];
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
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      angle: 0,
      radius: 100,
      centerX: 50,
      centerY: 50
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    document.getElementById('radius').value = 100;
    document.getElementById('radiusValue').textContent = '100%';
    document.getElementById('centerX').value = 50;
    document.getElementById('centerXValue').textContent = '50%';
    document.getElementById('centerY').value = 50;
    document.getElementById('centerYValue').textContent = '50%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-angle="0"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SwirlTool();
});
