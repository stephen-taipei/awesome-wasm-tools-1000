class PosterizeTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      levels: 8,
      redLevels: 8,
      greenLevels: 8,
      blueLevels: 8
    };
    this.linkChannels = true;
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

    // Main levels slider (links all channels)
    document.getElementById('levels').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.settings.levels = value;
      this.settings.redLevels = value;
      this.settings.greenLevels = value;
      this.settings.blueLevels = value;
      this.updateSliders();
      this.render();
    });

    // Individual channel sliders
    document.getElementById('redLevels').addEventListener('input', (e) => {
      this.settings.redLevels = parseInt(e.target.value);
      document.getElementById('redLevelsValue').textContent = this.settings.redLevels;
      this.render();
    });

    document.getElementById('greenLevels').addEventListener('input', (e) => {
      this.settings.greenLevels = parseInt(e.target.value);
      document.getElementById('greenLevelsValue').textContent = this.settings.greenLevels;
      this.render();
    });

    document.getElementById('blueLevels').addEventListener('input', (e) => {
      this.settings.blueLevels = parseInt(e.target.value);
      document.getElementById('blueLevelsValue').textContent = this.settings.blueLevels;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    if (preset === 'reset') {
      this.settings = { levels: 256, redLevels: 256, greenLevels: 256, blueLevels: 256 };
    } else {
      const level = parseInt(preset);
      this.settings = { levels: level, redLevels: level, greenLevels: level, blueLevels: level };
    }

    this.updateSliders();
    this.render();
  }

  updateSliders() {
    document.getElementById('levels').value = this.settings.levels;
    document.getElementById('levelsValue').textContent = this.settings.levels;
    document.getElementById('redLevels').value = this.settings.redLevels;
    document.getElementById('redLevelsValue').textContent = this.settings.redLevels;
    document.getElementById('greenLevels').value = this.settings.greenLevels;
    document.getElementById('greenLevelsValue').textContent = this.settings.greenLevels;
    document.getElementById('blueLevels').value = this.settings.blueLevels;
    document.getElementById('blueLevelsValue').textContent = this.settings.blueLevels;
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

  posterize(value, levels) {
    if (levels >= 256) return value;
    const step = 255 / (levels - 1);
    return Math.round(Math.round(value / step) * step);
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    for (let i = 0; i < srcData.length; i += 4) {
      dstData[i] = this.posterize(srcData[i], this.settings.redLevels);
      dstData[i + 1] = this.posterize(srcData[i + 1], this.settings.greenLevels);
      dstData[i + 2] = this.posterize(srcData[i + 2], this.settings.blueLevels);
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'posterized-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { levels: 8, redLevels: 8, greenLevels: 8, blueLevels: 8 };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="8"]').classList.add('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PosterizeTool();
});
