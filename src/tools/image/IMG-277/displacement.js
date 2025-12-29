class DisplacementTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.mapData = null;
    this.settings = {
      mapType: 'noise',
      scaleX: 20,
      scaleY: 20
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const mapInput = document.getElementById('mapInput');

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

    // Map upload
    const mapUpload = document.getElementById('mapUpload');
    mapUpload.addEventListener('click', () => mapInput.click());
    mapInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadMap(e.target.files[0]);
      }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mapType = btn.dataset.map;
        if (this.settings.mapType !== 'custom') {
          this.generateMap();
          this.render();
        }
      });
    });

    // Scale sliders
    document.getElementById('scaleX').addEventListener('input', (e) => {
      this.settings.scaleX = parseInt(e.target.value);
      document.getElementById('scaleXValue').textContent = this.settings.scaleX;
      this.render();
    });

    document.getElementById('scaleY').addEventListener('input', (e) => {
      this.settings.scaleY = parseInt(e.target.value);
      document.getElementById('scaleYValue').textContent = this.settings.scaleY;
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
        this.generateMap();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadMap(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        this.mapData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        document.getElementById('mapUpload').classList.add('loaded');
        document.getElementById('mapUpload').textContent = '✓ 已載入自訂置換圖';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.preset-btn[data-map="custom"]').classList.add('active');
        this.settings.mapType = 'custom';
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  generateMap() {
    if (!this.originalImage) return;

    const width = this.originalImage.width;
    const height = this.originalImage.height;
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = width;
    mapCanvas.height = height;
    const mapCtx = mapCanvas.getContext('2d');

    switch (this.settings.mapType) {
      case 'noise':
        this.generateNoiseMap(mapCtx, width, height);
        break;
      case 'wave':
        this.generateWaveMap(mapCtx, width, height);
        break;
      case 'radial':
        this.generateRadialMap(mapCtx, width, height);
        break;
      case 'grid':
        this.generateGridMap(mapCtx, width, height);
        break;
      case 'diagonal':
        this.generateDiagonalMap(mapCtx, width, height);
        break;
    }

    this.mapData = mapCtx.getImageData(0, 0, width, height);
  }

  generateNoiseMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255;
      data[i] = noise;
      data[i + 1] = Math.random() * 255;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  generateWaveMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = 128 + Math.sin(x / 20) * 127;
        data[i + 1] = 128 + Math.sin(y / 20) * 127;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  generateRadialMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const angle = Math.atan2(dy, dx);

        data[i] = 128 + Math.cos(angle) * dist * 127;
        data[i + 1] = 128 + Math.sin(angle) * dist * 127;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  generateGridMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const gridSize = 50;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = 128 + Math.sin((x / gridSize) * Math.PI * 2) * 127;
        data[i + 1] = 128 + Math.sin((y / gridSize) * Math.PI * 2) * 127;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  generateDiagonalMap(ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const diagonal = (x + y) / 30;
        data[i] = 128 + Math.sin(diagonal) * 127;
        data[i + 1] = 128 + Math.cos(diagonal) * 127;
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  render() {
    if (!this.originalImage || !this.imageData || !this.mapData) return;

    const img = this.originalImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    const srcData = this.imageData.data;
    const mapDataArr = this.mapData.data;
    const outputData = this.ctx.createImageData(img.width, img.height);
    const dstData = outputData.data;

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const mapIdx = (y * img.width + x) * 4;

        // Get displacement from map (red = X, green = Y)
        const dispX = ((mapDataArr[mapIdx] - 128) / 128) * this.settings.scaleX;
        const dispY = ((mapDataArr[mapIdx + 1] - 128) / 128) * this.settings.scaleY;

        const srcX = x + dispX;
        const srcY = y + dispY;

        const dstIdx = (y * img.width + x) * 4;

        // Bilinear interpolation
        if (srcX >= 0 && srcX < img.width - 1 && srcY >= 0 && srcY < img.height - 1) {
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
          // Edge pixels
          const clampedX = Math.max(0, Math.min(img.width - 1, Math.round(srcX)));
          const clampedY = Math.max(0, Math.min(img.height - 1, Math.round(srcY)));
          const srcIdx = (clampedY * img.width + clampedX) * 4;
          for (let c = 0; c < 4; c++) {
            dstData[dstIdx + c] = srcData[srcIdx + c];
          }
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'displacement-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.mapData = null;
    this.settings = {
      mapType: 'noise',
      scaleX: 20,
      scaleY: 20
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('scaleX').value = 20;
    document.getElementById('scaleXValue').textContent = '20';
    document.getElementById('scaleY').value = 20;
    document.getElementById('scaleYValue').textContent = '20';
    document.getElementById('mapUpload').classList.remove('loaded');
    document.getElementById('mapUpload').textContent = '點擊上傳置換圖或使用預設';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-map="noise"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DisplacementTool();
});
