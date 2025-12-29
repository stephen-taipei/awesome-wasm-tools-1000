class LevelsTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.histogramCanvas = document.getElementById('histogramCanvas');
    this.histogramCtx = this.histogramCanvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.histogram = null;
    this.settings = {
      inputBlack: 0,
      inputWhite: 255,
      inputGamma: 1.0,
      outputBlack: 0,
      outputWhite: 255
    };
    this.init();
  }

  init() {
    this.resizeHistogramCanvas();
    this.bindEvents();
  }

  resizeHistogramCanvas() {
    const rect = this.histogramCanvas.getBoundingClientRect();
    this.histogramCanvas.width = rect.width;
    this.histogramCanvas.height = rect.height;
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

    const inputs = ['inputBlack', 'inputWhite', 'inputGamma', 'outputBlack', 'outputWhite'];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseFloat(e.target.value);
        this.render();
      });
    });

    document.getElementById('autoLevels').addEventListener('click', () => this.autoLevels());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    window.addEventListener('resize', () => {
      this.resizeHistogramCanvas();
      if (this.histogram) this.drawHistogram();
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

        this.calculateHistogram();
        document.getElementById('editorSection').classList.add('active');
        this.resizeHistogramCanvas();
        this.drawHistogram();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  calculateHistogram() {
    const data = this.imageData.data;
    this.histogram = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      this.histogram[luminance]++;
    }
  }

  drawHistogram() {
    const w = this.histogramCanvas.width;
    const h = this.histogramCanvas.height;
    const ctx = this.histogramCtx;

    ctx.clearRect(0, 0, w, h);

    if (!this.histogram) return;

    const max = Math.max(...this.histogram);
    const barWidth = w / 256;

    ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
    for (let i = 0; i < 256; i++) {
      const barHeight = (this.histogram[i] / max) * h;
      ctx.fillRect(i * barWidth, h - barHeight, barWidth, barHeight);
    }

    // Draw input markers
    const inputBlackX = (this.settings.inputBlack / 255) * w;
    const inputWhiteX = (this.settings.inputWhite / 255) * w;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(inputBlackX, 0);
    ctx.lineTo(inputBlackX, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(inputWhiteX, 0);
    ctx.lineTo(inputWhiteX, h);
    ctx.stroke();
  }

  autoLevels() {
    if (!this.histogram) return;

    const total = this.histogram.reduce((a, b) => a + b, 0);
    const threshold = total * 0.005; // 0.5% threshold

    let cumulative = 0;
    let inputBlack = 0;
    for (let i = 0; i < 256; i++) {
      cumulative += this.histogram[i];
      if (cumulative >= threshold) {
        inputBlack = i;
        break;
      }
    }

    cumulative = 0;
    let inputWhite = 255;
    for (let i = 255; i >= 0; i--) {
      cumulative += this.histogram[i];
      if (cumulative >= threshold) {
        inputWhite = i;
        break;
      }
    }

    this.settings.inputBlack = inputBlack;
    this.settings.inputWhite = inputWhite;
    this.settings.inputGamma = 1.0;

    document.getElementById('inputBlack').value = inputBlack;
    document.getElementById('inputWhite').value = inputWhite;
    document.getElementById('inputGamma').value = 1.0;

    this.drawHistogram();
    this.render();
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

    const { inputBlack, inputWhite, inputGamma, outputBlack, outputWhite } = this.settings;
    const inputRange = inputWhite - inputBlack || 1;
    const outputRange = outputWhite - outputBlack;

    // Create LUT
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let normalized = (i - inputBlack) / inputRange;
      normalized = Math.max(0, Math.min(1, normalized));
      normalized = Math.pow(normalized, 1 / inputGamma);
      lut[i] = Math.round(outputBlack + normalized * outputRange);
    }

    for (let i = 0; i < srcData.length; i += 4) {
      outputData.data[i] = lut[srcData[i]];
      outputData.data[i + 1] = lut[srcData[i + 1]];
      outputData.data[i + 2] = lut[srcData[i + 2]];
      outputData.data[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
    this.drawHistogram();
  }

  download() {
    const link = document.createElement('a');
    link.download = 'levels-adjusted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = {
      inputBlack: 0,
      inputWhite: 255,
      inputGamma: 1.0,
      outputBlack: 0,
      outputWhite: 255
    };
    document.getElementById('inputBlack').value = 0;
    document.getElementById('inputWhite').value = 255;
    document.getElementById('inputGamma').value = 1.0;
    document.getElementById('outputBlack').value = 0;
    document.getElementById('outputWhite').value = 255;
    if (this.originalImage) {
      this.drawHistogram();
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LevelsTool();
});
