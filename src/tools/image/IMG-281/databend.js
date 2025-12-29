class DatabendTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      corruption: 20,
      blockSize: 50,
      shiftAmount: 30,
      seed: Math.random()
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
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Sliders
    document.getElementById('corruption').addEventListener('input', (e) => {
      this.settings.corruption = parseInt(e.target.value);
      document.getElementById('corruptionValue').textContent = `${this.settings.corruption}%`;
      this.render();
    });

    document.getElementById('blockSize').addEventListener('input', (e) => {
      this.settings.blockSize = parseInt(e.target.value);
      document.getElementById('blockSizeValue').textContent = this.settings.blockSize;
      this.render();
    });

    document.getElementById('shiftAmount').addEventListener('input', (e) => {
      this.settings.shiftAmount = parseInt(e.target.value);
      document.getElementById('shiftAmountValue').textContent = this.settings.shiftAmount;
      this.render();
    });

    // Random button
    document.getElementById('randomBtn').addEventListener('click', () => {
      this.settings.seed = Math.random();
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'subtle':
        this.settings.corruption = 10;
        this.settings.blockSize = 30;
        this.settings.shiftAmount = 15;
        break;
      case 'medium':
        this.settings.corruption = 20;
        this.settings.blockSize = 50;
        this.settings.shiftAmount = 30;
        break;
      case 'heavy':
        this.settings.corruption = 50;
        this.settings.blockSize = 80;
        this.settings.shiftAmount = 60;
        break;
      case 'shift':
        this.settings.corruption = 30;
        this.settings.blockSize = 100;
        this.settings.shiftAmount = 80;
        break;
      case 'swap':
        this.settings.corruption = 40;
        this.settings.blockSize = 60;
        this.settings.shiftAmount = 20;
        break;
      case 'corrupt':
        this.settings.corruption = 70;
        this.settings.blockSize = 40;
        this.settings.shiftAmount = 50;
        break;
    }

    document.getElementById('corruption').value = this.settings.corruption;
    document.getElementById('corruptionValue').textContent = `${this.settings.corruption}%`;
    document.getElementById('blockSize').value = this.settings.blockSize;
    document.getElementById('blockSizeValue').textContent = this.settings.blockSize;
    document.getElementById('shiftAmount').value = this.settings.shiftAmount;
    document.getElementById('shiftAmountValue').textContent = this.settings.shiftAmount;

    this.settings.seed = Math.random();
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

  seededRandom() {
    const x = Math.sin(this.settings.seed++) * 10000;
    return x - Math.floor(x);
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

    // Reset seed for consistent results
    let seed = this.settings.seed * 10000;

    const numCorruptions = Math.floor((this.settings.corruption / 100) * 50);

    for (let i = 0; i < numCorruptions; i++) {
      seed++;
      const action = Math.floor((Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)) * 4);

      seed++;
      const y = Math.floor((Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)) * height);

      seed++;
      const blockHeight = Math.floor((Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)) * this.settings.blockSize) + 5;

      switch (action) {
        case 0:
          this.shiftBlock(dstData, width, height, y, blockHeight, seed);
          break;
        case 1:
          this.swapBlocks(dstData, width, height, y, blockHeight, seed);
          break;
        case 2:
          this.corruptBlock(dstData, width, height, y, blockHeight, seed);
          break;
        case 3:
          this.channelShift(dstData, width, height, y, blockHeight, seed);
          break;
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  shiftBlock(data, width, height, startY, blockHeight, seed) {
    const shiftX = Math.floor((Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000) - 0.5) * this.settings.shiftAmount * 2);

    for (let y = startY; y < Math.min(startY + blockHeight, height); y++) {
      const rowData = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        rowData.push([data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]);
      }

      for (let x = 0; x < width; x++) {
        const srcX = ((x - shiftX) % width + width) % width;
        const idx = (y * width + x) * 4;
        data[idx] = rowData[srcX][0];
        data[idx + 1] = rowData[srcX][1];
        data[idx + 2] = rowData[srcX][2];
        data[idx + 3] = rowData[srcX][3];
      }
    }
  }

  swapBlocks(data, width, height, startY1, blockHeight, seed) {
    const startY2 = Math.floor((Math.sin(seed + 1) * 10000 - Math.floor(Math.sin(seed + 1) * 10000)) * height);

    for (let dy = 0; dy < blockHeight; dy++) {
      const y1 = startY1 + dy;
      const y2 = startY2 + dy;

      if (y1 >= height || y2 >= height) continue;

      for (let x = 0; x < width; x++) {
        const idx1 = (y1 * width + x) * 4;
        const idx2 = (y2 * width + x) * 4;

        for (let c = 0; c < 4; c++) {
          const temp = data[idx1 + c];
          data[idx1 + c] = data[idx2 + c];
          data[idx2 + c] = temp;
        }
      }
    }
  }

  corruptBlock(data, width, height, startY, blockHeight, seed) {
    const corruptValue = Math.floor((Math.sin(seed + 2) * 10000 - Math.floor(Math.sin(seed + 2) * 10000)) * 256);

    for (let y = startY; y < Math.min(startY + blockHeight, height); y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const channel = Math.floor((Math.sin(seed + x) * 10000 - Math.floor(Math.sin(seed + x) * 10000)) * 3);

        data[idx + channel] = (data[idx + channel] + corruptValue) % 256;
      }
    }
  }

  channelShift(data, width, height, startY, blockHeight, seed) {
    const shiftR = Math.floor((Math.sin(seed + 3) * 10000 - Math.floor(Math.sin(seed + 3) * 10000) - 0.5) * 20);
    const shiftB = Math.floor((Math.sin(seed + 4) * 10000 - Math.floor(Math.sin(seed + 4) * 10000) - 0.5) * 20);

    for (let y = startY; y < Math.min(startY + blockHeight, height); y++) {
      const redChannel = [];
      const blueChannel = [];

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        redChannel.push(data[idx]);
        blueChannel.push(data[idx + 2]);
      }

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const rX = ((x - shiftR) % width + width) % width;
        const bX = ((x - shiftB) % width + width) % width;
        data[idx] = redChannel[rX];
        data[idx + 2] = blueChannel[bX];
      }
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'databend-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      corruption: 20,
      blockSize: 50,
      shiftAmount: 30,
      seed: Math.random()
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('corruption').value = 20;
    document.getElementById('corruptionValue').textContent = '20%';
    document.getElementById('blockSize').value = 50;
    document.getElementById('blockSizeValue').textContent = '50';
    document.getElementById('shiftAmount').value = 30;
    document.getElementById('shiftAmountValue').textContent = '30';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="medium"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DatabendTool();
});
