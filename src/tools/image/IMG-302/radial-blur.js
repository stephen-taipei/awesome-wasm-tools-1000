class RadialBlurTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'zoom',
      amount: 20,
      centerX: 50,
      centerY: 50
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

    // Click on canvas to set center
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.settings.centerX = (x / this.canvas.width) * 100;
      this.settings.centerY = (y / this.canvas.height) * 100;

      document.getElementById('centerX').value = this.settings.centerX;
      document.getElementById('centerXValue').textContent = `${Math.round(this.settings.centerX)}%`;
      document.getElementById('centerY').value = this.settings.centerY;
      document.getElementById('centerYValue').textContent = `${Math.round(this.settings.centerY)}%`;

      this.debouncedRender();
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mode = btn.dataset.mode;
        this.debouncedRender();
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = this.settings.amount;
      this.debouncedRender();
    });

    document.getElementById('centerX').addEventListener('input', (e) => {
      this.settings.centerX = parseInt(e.target.value);
      document.getElementById('centerXValue').textContent = `${this.settings.centerX}%`;
      this.debouncedRender();
    });

    document.getElementById('centerY').addEventListener('input', (e) => {
      this.settings.centerY = parseInt(e.target.value);
      document.getElementById('centerYValue').textContent = `${this.settings.centerY}%`;
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

    const centerX = (this.settings.centerX / 100) * width;
    const centerY = (this.settings.centerY / 100) * height;
    const amount = this.settings.amount;
    const samples = Math.max(5, amount);

    const outputData = this.ctx.createImageData(width, height);

    if (this.settings.mode === 'zoom') {
      // Zoom blur
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let sumR = 0, sumG = 0, sumB = 0, sumA = 0;

          for (let s = 0; s < samples; s++) {
            const t = 1 - (s / samples) * (amount / 100);
            const sx = Math.round(centerX + dx * t);
            const sy = Math.round(centerY + dy * t);

            if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
              const idx = (sy * width + sx) * 4;
              sumR += srcData[idx];
              sumG += srcData[idx + 1];
              sumB += srcData[idx + 2];
              sumA += srcData[idx + 3];
            }
          }

          const idx = (y * width + x) * 4;
          outputData.data[idx] = sumR / samples;
          outputData.data[idx + 1] = sumG / samples;
          outputData.data[idx + 2] = sumB / samples;
          outputData.data[idx + 3] = sumA / samples;
        }
      }
    } else {
      // Spin blur
      const maxAngle = (amount / 100) * Math.PI * 0.5;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
          let count = 0;

          for (let s = 0; s < samples; s++) {
            const rotAngle = angle + (s / samples - 0.5) * maxAngle * (dist / Math.max(width, height));
            const sx = Math.round(centerX + Math.cos(rotAngle) * dist);
            const sy = Math.round(centerY + Math.sin(rotAngle) * dist);

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
          if (count > 0) {
            outputData.data[idx] = sumR / count;
            outputData.data[idx + 1] = sumG / count;
            outputData.data[idx + 2] = sumB / count;
            outputData.data[idx + 3] = sumA / count;
          } else {
            outputData.data[idx] = srcData[idx];
            outputData.data[idx + 1] = srcData[idx + 1];
            outputData.data[idx + 2] = srcData[idx + 2];
            outputData.data[idx + 3] = srcData[idx + 3];
          }
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'radial-blur.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { mode: 'zoom', amount: 20, centerX: 50, centerY: 50 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="zoom"]').classList.add('active');
    document.getElementById('amount').value = 20;
    document.getElementById('amountValue').textContent = '20';
    document.getElementById('centerX').value = 50;
    document.getElementById('centerXValue').textContent = '50%';
    document.getElementById('centerY').value = 50;
    document.getElementById('centerYValue').textContent = '50%';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RadialBlurTool();
});
