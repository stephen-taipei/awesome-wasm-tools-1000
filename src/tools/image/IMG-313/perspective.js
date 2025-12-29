class PerspectiveTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      perspectiveX: 0,
      perspectiveY: 0,
      skewX: 0,
      skewY: 0
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
        this.applyPreset(btn.dataset.preset);
      });
    });

    document.getElementById('perspectiveX').addEventListener('input', (e) => {
      this.settings.perspectiveX = parseInt(e.target.value);
      document.getElementById('perspectiveXValue').textContent = this.settings.perspectiveX;
      this.render();
    });

    document.getElementById('perspectiveY').addEventListener('input', (e) => {
      this.settings.perspectiveY = parseInt(e.target.value);
      document.getElementById('perspectiveYValue').textContent = this.settings.perspectiveY;
      this.render();
    });

    document.getElementById('skewX').addEventListener('input', (e) => {
      this.settings.skewX = parseInt(e.target.value);
      document.getElementById('skewXValue').textContent = `${this.settings.skewX}°`;
      this.render();
    });

    document.getElementById('skewY').addEventListener('input', (e) => {
      this.settings.skewY = parseInt(e.target.value);
      document.getElementById('skewYValue').textContent = `${this.settings.skewY}°`;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    const presets = {
      tiltTop: { perspectiveX: 0, perspectiveY: -30, skewX: 0, skewY: 0 },
      tiltBottom: { perspectiveX: 0, perspectiveY: 30, skewX: 0, skewY: 0 },
      tiltLeft: { perspectiveX: -30, perspectiveY: 0, skewX: 0, skewY: 0 },
      tiltRight: { perspectiveX: 30, perspectiveY: 0, skewX: 0, skewY: 0 }
    };

    const p = presets[preset];
    this.settings = { ...p };

    document.getElementById('perspectiveX').value = p.perspectiveX;
    document.getElementById('perspectiveXValue').textContent = p.perspectiveX;
    document.getElementById('perspectiveY').value = p.perspectiveY;
    document.getElementById('perspectiveYValue').textContent = p.perspectiveY;
    document.getElementById('skewX').value = p.skewX;
    document.getElementById('skewXValue').textContent = `${p.skewX}°`;
    document.getElementById('skewY').value = p.skewY;
    document.getElementById('skewYValue').textContent = `${p.skewY}°`;

    this.render();
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

    const srcWidth = this.originalImage.width;
    const srcHeight = this.originalImage.height;
    const srcData = this.imageData.data;

    const perspX = this.settings.perspectiveX / 100;
    const perspY = this.settings.perspectiveY / 100;
    const skewXRad = this.settings.skewX * Math.PI / 180;
    const skewYRad = this.settings.skewY * Math.PI / 180;

    // Calculate expanded canvas size
    const padding = 50;
    const newWidth = srcWidth + Math.abs(this.settings.skewY) * 2 + padding * 2;
    const newHeight = srcHeight + Math.abs(this.settings.skewX) * 2 + padding * 2;

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    const outputData = this.ctx.createImageData(newWidth, newHeight);
    const centerX = newWidth / 2;
    const centerY = newHeight / 2;
    const srcCenterX = srcWidth / 2;
    const srcCenterY = srcHeight / 2;

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // Transform destination to source coordinates
        let dx = x - centerX;
        let dy = y - centerY;

        // Apply inverse skew
        const unskewX = dx - dy * Math.tan(skewXRad);
        const unskewY = dy - dx * Math.tan(skewYRad);

        // Apply inverse perspective
        const perspFactor = 1 + unskewX * perspX / srcWidth + unskewY * perspY / srcHeight;

        let srcX = unskewX / perspFactor + srcCenterX;
        let srcY = unskewY / perspFactor + srcCenterY;

        const idx = (y * newWidth + x) * 4;

        if (srcX >= 0 && srcX < srcWidth - 1 && srcY >= 0 && srcY < srcHeight - 1) {
          // Bilinear interpolation
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const fx = srcX - x0;
          const fy = srcY - y0;

          const idx00 = (y0 * srcWidth + x0) * 4;
          const idx10 = (y0 * srcWidth + x1) * 4;
          const idx01 = (y1 * srcWidth + x0) * 4;
          const idx11 = (y1 * srcWidth + x1) * 4;

          for (let c = 0; c < 4; c++) {
            const v00 = srcData[idx00 + c];
            const v10 = srcData[idx10 + c];
            const v01 = srcData[idx01 + c];
            const v11 = srcData[idx11 + c];

            const v = v00 * (1 - fx) * (1 - fy) +
                     v10 * fx * (1 - fy) +
                     v01 * (1 - fx) * fy +
                     v11 * fx * fy;

            outputData.data[idx + c] = Math.round(v);
          }
        } else {
          outputData.data[idx + 3] = 0; // Transparent
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'perspective-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { perspectiveX: 0, perspectiveY: 0, skewX: 0, skewY: 0 };
    document.getElementById('perspectiveX').value = 0;
    document.getElementById('perspectiveXValue').textContent = '0';
    document.getElementById('perspectiveY').value = 0;
    document.getElementById('perspectiveYValue').textContent = '0';
    document.getElementById('skewX').value = 0;
    document.getElementById('skewXValue').textContent = '0°';
    document.getElementById('skewY').value = 0;
    document.getElementById('skewYValue').textContent = '0°';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PerspectiveTool();
});
