class RGBShiftTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      redX: 0, redY: 0,
      greenX: 0, greenY: 0,
      blueX: 0, blueY: 0
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

    // Channel sliders
    const channels = ['red', 'green', 'blue'];
    const axes = ['X', 'Y'];

    channels.forEach(channel => {
      axes.forEach(axis => {
        const id = `${channel}${axis}`;
        const slider = document.getElementById(id);
        slider.addEventListener('input', (e) => {
          this.settings[id] = parseInt(e.target.value);
          document.getElementById(`${id}Value`).textContent = this.settings[id];
          this.render();
        });
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case '3d':
        this.settings = { redX: -5, redY: 0, greenX: 0, greenY: 0, blueX: 5, blueY: 0 };
        break;
      case 'retro':
        this.settings = { redX: 3, redY: 2, greenX: -2, greenY: -1, blueX: -1, blueY: 3 };
        break;
      case 'chromatic':
        this.settings = { redX: -8, redY: 0, greenX: 0, greenY: 0, blueX: 8, blueY: 0 };
        break;
      case 'split':
        this.settings = { redX: -15, redY: -5, greenX: 0, greenY: 5, blueX: 15, blueY: 0 };
        break;
      case 'glitch':
        this.settings = { redX: 10, redY: -3, greenX: -5, greenY: 8, blueX: -8, blueY: -5 };
        break;
      case 'reset':
        this.settings = { redX: 0, redY: 0, greenX: 0, greenY: 0, blueX: 0, blueY: 0 };
        break;
    }

    this.updateSliders();
    this.render();
  }

  updateSliders() {
    const channels = ['red', 'green', 'blue'];
    const axes = ['X', 'Y'];

    channels.forEach(channel => {
      axes.forEach(axis => {
        const id = `${channel}${axis}`;
        document.getElementById(id).value = this.settings[id];
        document.getElementById(`${id}Value`).textContent = this.settings[id];
      });
    });
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
    const dstData = outputData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;

        // Red channel
        const rX = Math.max(0, Math.min(width - 1, x - this.settings.redX));
        const rY = Math.max(0, Math.min(height - 1, y - this.settings.redY));
        const rIdx = (rY * width + rX) * 4;
        dstData[dstIdx] = srcData[rIdx];

        // Green channel
        const gX = Math.max(0, Math.min(width - 1, x - this.settings.greenX));
        const gY = Math.max(0, Math.min(height - 1, y - this.settings.greenY));
        const gIdx = (gY * width + gX) * 4;
        dstData[dstIdx + 1] = srcData[gIdx + 1];

        // Blue channel
        const bX = Math.max(0, Math.min(width - 1, x - this.settings.blueX));
        const bY = Math.max(0, Math.min(height - 1, y - this.settings.blueY));
        const bIdx = (bY * width + bX) * 4;
        dstData[dstIdx + 2] = srcData[bIdx + 2];

        // Alpha - use original
        const aIdx = (y * width + x) * 4;
        dstData[dstIdx + 3] = srcData[aIdx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'rgb-shift-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { redX: 0, redY: 0, greenX: 0, greenY: 0, blueX: 0, blueY: 0 };
    document.getElementById('editorSection').classList.remove('active');
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="reset"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RGBShiftTool();
});
