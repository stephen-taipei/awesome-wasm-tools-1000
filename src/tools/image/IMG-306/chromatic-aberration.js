class ChromaticAberrationTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'radial',
      amount: 10,
      angle: 0,
      redOffset: 5,
      blueOffset: -5
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

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = `${this.settings.amount} px`;
      this.render();
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    document.getElementById('redOffset').addEventListener('input', (e) => {
      this.settings.redOffset = parseInt(e.target.value);
      this.render();
    });

    document.getElementById('blueOffset').addEventListener('input', (e) => {
      this.settings.blueOffset = parseInt(e.target.value);
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

  samplePixel(data, width, height, x, y, channel) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    return data[(y * width + x) * 4 + channel];
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const angleRad = this.settings.angle * Math.PI / 180;
    const amount = this.settings.amount;
    const redOffset = this.settings.redOffset;
    const blueOffset = this.settings.blueOffset;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        let redX, redY, blueX, blueY;

        if (this.settings.mode === 'radial') {
          // Radial chromatic aberration
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const factor = dist / maxDist;

          const dirX = dist > 0 ? dx / dist : 0;
          const dirY = dist > 0 ? dy / dist : 0;

          redX = x + dirX * redOffset * factor * amount / 10;
          redY = y + dirY * redOffset * factor * amount / 10;
          blueX = x + dirX * blueOffset * factor * amount / 10;
          blueY = y + dirY * blueOffset * factor * amount / 10;
        } else {
          // Linear chromatic aberration
          const offsetX = Math.cos(angleRad);
          const offsetY = Math.sin(angleRad);

          redX = x + offsetX * redOffset * amount / 10;
          redY = y + offsetY * redOffset * amount / 10;
          blueX = x + offsetX * blueOffset * amount / 10;
          blueY = y + offsetY * blueOffset * amount / 10;
        }

        // Sample each channel from different positions
        outputData.data[idx] = this.samplePixel(srcData, width, height, redX, redY, 0);
        outputData.data[idx + 1] = srcData[idx + 1]; // Green stays centered
        outputData.data[idx + 2] = this.samplePixel(srcData, width, height, blueX, blueY, 2);
        outputData.data[idx + 3] = srcData[idx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'chromatic-aberration.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { mode: 'radial', amount: 10, angle: 0, redOffset: 5, blueOffset: -5 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="radial"]').classList.add('active');
    document.getElementById('amount').value = 10;
    document.getElementById('amountValue').textContent = '10 px';
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    document.getElementById('redOffset').value = 5;
    document.getElementById('blueOffset').value = -5;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ChromaticAberrationTool();
});
