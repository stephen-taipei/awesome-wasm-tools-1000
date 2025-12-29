class PolarTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'rectToPolar',
      rotation: 0,
      scale: 100,
      wrapEdges: true
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

    // Rotation slider
    const rotationSlider = document.getElementById('rotation');
    rotationSlider.addEventListener('input', (e) => {
      this.settings.rotation = parseInt(e.target.value);
      document.getElementById('rotationValue').textContent = `${this.settings.rotation}°`;
      this.render();
    });

    // Scale slider
    const scaleSlider = document.getElementById('scale');
    scaleSlider.addEventListener('input', (e) => {
      this.settings.scale = parseInt(e.target.value);
      document.getElementById('scaleValue').textContent = `${this.settings.scale}%`;
      this.render();
    });

    // Wrap edges checkbox
    const wrapCheckbox = document.getElementById('wrapEdges');
    wrapCheckbox.addEventListener('change', (e) => {
      this.settings.wrapEdges = e.target.checked;
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
    const size = Math.max(img.width, img.height);
    this.canvas.width = size;
    this.canvas.height = size;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(size, size);
    const dstData = outputData.data;

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2;
    const rotationRad = (this.settings.rotation * Math.PI) / 180;
    const scale = this.settings.scale / 100;

    if (this.settings.mode === 'rectToPolar') {
      // Rectangular to Polar
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) + rotationRad;

          // Map polar coords to rectangular source coords
          // angle -> x, distance -> y
          let srcX = ((angle + Math.PI) / (2 * Math.PI)) * img.width;
          let srcY = (distance / maxRadius) * img.height * scale;

          if (this.settings.wrapEdges) {
            srcX = ((srcX % img.width) + img.width) % img.width;
            srcY = ((srcY % img.height) + img.height) % img.height;
          }

          const dstIdx = (y * size + x) * 4;

          if (srcX >= 0 && srcX < img.width - 1 && srcY >= 0 && srcY < img.height - 1) {
            // Bilinear interpolation
            const x0 = Math.floor(srcX);
            const y0 = Math.floor(srcY);
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const xFrac = srcX - x0;
            const yFrac = srcY - y0;

            for (let c = 0; c < 4; c++) {
              const v00 = srcData[(y0 * img.width + x0) * 4 + c];
              const v10 = srcData[(y0 * img.width + x1) * 4 + c];
              const v01 = srcData[(y1 * img.width + x0) * 4 + c];
              const v11 = srcData[(y1 * img.width + x1) * 4 + c];

              const v0 = v00 * (1 - xFrac) + v10 * xFrac;
              const v1 = v01 * (1 - xFrac) + v11 * xFrac;
              dstData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
            }
          } else {
            dstData[dstIdx] = 0;
            dstData[dstIdx + 1] = 0;
            dstData[dstIdx + 2] = 0;
            dstData[dstIdx + 3] = 0;
          }
        }
      }
    } else {
      // Polar to Rectangular
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // Map rectangular coords to polar source coords
          // x -> angle, y -> distance
          const angle = (x / size) * 2 * Math.PI - Math.PI + rotationRad;
          const distance = (y / size) * maxRadius * scale;

          const srcX = centerX + Math.cos(angle) * distance;
          const srcY = centerY + Math.sin(angle) * distance;

          const dstIdx = (y * size + x) * 4;

          // Map to source image coordinates
          const mappedX = (srcX / size) * img.width;
          const mappedY = (srcY / size) * img.height;

          let finalX = mappedX;
          let finalY = mappedY;

          if (this.settings.wrapEdges) {
            finalX = ((finalX % img.width) + img.width) % img.width;
            finalY = ((finalY % img.height) + img.height) % img.height;
          }

          if (finalX >= 0 && finalX < img.width - 1 && finalY >= 0 && finalY < img.height - 1) {
            const x0 = Math.floor(finalX);
            const y0 = Math.floor(finalY);
            const x1 = x0 + 1;
            const y1 = y0 + 1;
            const xFrac = finalX - x0;
            const yFrac = finalY - y0;

            for (let c = 0; c < 4; c++) {
              const v00 = srcData[(y0 * img.width + x0) * 4 + c];
              const v10 = srcData[(y0 * img.width + x1) * 4 + c];
              const v01 = srcData[(y1 * img.width + x0) * 4 + c];
              const v11 = srcData[(y1 * img.width + x1) * 4 + c];

              const v0 = v00 * (1 - xFrac) + v10 * xFrac;
              const v1 = v01 * (1 - xFrac) + v11 * xFrac;
              dstData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
            }
          } else {
            dstData[dstIdx] = 0;
            dstData[dstIdx + 1] = 0;
            dstData[dstIdx + 2] = 0;
            dstData[dstIdx + 3] = 0;
          }
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'polar-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'rectToPolar',
      rotation: 0,
      scale: 100,
      wrapEdges: true
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.mode-tab[data-mode="rectToPolar"]').classList.add('active');
    document.getElementById('rotation').value = 0;
    document.getElementById('rotationValue').textContent = '0°';
    document.getElementById('scale').value = 100;
    document.getElementById('scaleValue').textContent = '100%';
    document.getElementById('wrapEdges').checked = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PolarTool();
});
