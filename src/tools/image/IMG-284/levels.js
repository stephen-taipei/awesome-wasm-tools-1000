class LevelsTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.histogramCanvas = document.getElementById('histogramCanvas');
    this.histogramCtx = this.histogramCanvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.currentChannel = 'rgb';
    this.levels = {
      rgb: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      red: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      green: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      blue: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 }
    };
    this.init();
  }

  init() {
    this.setupHistogramCanvas();
    this.bindEvents();
  }

  setupHistogramCanvas() {
    const rect = this.histogramCanvas.getBoundingClientRect();
    this.histogramCanvas.width = rect.width * window.devicePixelRatio;
    this.histogramCanvas.height = rect.height * window.devicePixelRatio;
    this.histogramCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
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

    // Channel tabs
    document.querySelectorAll('.channel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentChannel = tab.dataset.channel;
        this.updateInputs();
        this.drawHistogram();
      });
    });

    // Level inputs
    document.getElementById('inputBlack').addEventListener('input', (e) => {
      this.levels[this.currentChannel].inputBlack = parseInt(e.target.value) || 0;
      this.render();
    });
    document.getElementById('inputWhite').addEventListener('input', (e) => {
      this.levels[this.currentChannel].inputWhite = parseInt(e.target.value) || 255;
      this.render();
    });
    document.getElementById('inputGamma').addEventListener('input', (e) => {
      this.levels[this.currentChannel].gamma = parseFloat(e.target.value) || 1;
      this.render();
    });
    document.getElementById('outputBlack').addEventListener('input', (e) => {
      this.levels[this.currentChannel].outputBlack = parseInt(e.target.value) || 0;
      this.render();
    });
    document.getElementById('outputWhite').addEventListener('input', (e) => {
      this.levels[this.currentChannel].outputWhite = parseInt(e.target.value) || 255;
      this.render();
    });

    // Auto button
    document.getElementById('autoBtn').addEventListener('click', () => this.autoLevels());

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    // Handle resize
    window.addEventListener('resize', () => {
      this.setupHistogramCanvas();
      this.drawHistogram();
    });
  }

  updateInputs() {
    const level = this.levels[this.currentChannel];
    document.getElementById('inputBlack').value = level.inputBlack;
    document.getElementById('inputWhite').value = level.inputWhite;
    document.getElementById('inputGamma').value = level.gamma;
    document.getElementById('outputBlack').value = level.outputBlack;
    document.getElementById('outputWhite').value = level.outputWhite;
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
        this.drawHistogram();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  drawHistogram() {
    if (!this.imageData) return;

    const rect = this.histogramCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.histogramCtx.clearRect(0, 0, width, height);

    const data = this.imageData.data;
    const histogram = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0), lum: new Array(256).fill(0) };

    for (let i = 0; i < data.length; i += 4) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram.lum[lum]++;
    }

    const maxVal = Math.max(
      ...histogram.r,
      ...histogram.g,
      ...histogram.b
    );

    // Draw histogram based on current channel
    if (this.currentChannel === 'rgb') {
      // Draw all channels
      this.drawHistogramChannel(histogram.r, 'rgba(255, 68, 68, 0.5)', width, height, maxVal);
      this.drawHistogramChannel(histogram.g, 'rgba(68, 255, 68, 0.5)', width, height, maxVal);
      this.drawHistogramChannel(histogram.b, 'rgba(68, 68, 255, 0.5)', width, height, maxVal);
    } else {
      const colors = { red: '#ff4444', green: '#44ff44', blue: '#4444ff' };
      const channels = { red: histogram.r, green: histogram.g, blue: histogram.b };
      this.drawHistogramChannel(channels[this.currentChannel], colors[this.currentChannel], width, height, maxVal);
    }

    // Draw input markers
    const level = this.levels[this.currentChannel];
    this.histogramCtx.strokeStyle = '#fff';
    this.histogramCtx.lineWidth = 2;

    // Black point marker
    const blackX = (level.inputBlack / 255) * width;
    this.histogramCtx.beginPath();
    this.histogramCtx.moveTo(blackX, 0);
    this.histogramCtx.lineTo(blackX, height);
    this.histogramCtx.stroke();

    // White point marker
    const whiteX = (level.inputWhite / 255) * width;
    this.histogramCtx.beginPath();
    this.histogramCtx.moveTo(whiteX, 0);
    this.histogramCtx.lineTo(whiteX, height);
    this.histogramCtx.stroke();
  }

  drawHistogramChannel(data, color, width, height, maxVal) {
    this.histogramCtx.fillStyle = color;
    const barWidth = width / 256;

    for (let i = 0; i < 256; i++) {
      const barHeight = (data[i] / maxVal) * height;
      this.histogramCtx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
  }

  autoLevels() {
    if (!this.imageData) return;

    const data = this.imageData.data;

    // Find black and white points based on percentile
    const percentile = 0.1; // 0.1% clip
    const totalPixels = data.length / 4;
    const clipCount = Math.floor(totalPixels * percentile / 100);

    if (this.currentChannel === 'rgb') {
      // Auto for luminance
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogram[lum]++;
      }

      let blackPoint = 0;
      let whitePoint = 255;
      let count = 0;

      for (let i = 0; i < 256; i++) {
        count += histogram[i];
        if (count > clipCount) {
          blackPoint = i;
          break;
        }
      }

      count = 0;
      for (let i = 255; i >= 0; i--) {
        count += histogram[i];
        if (count > clipCount) {
          whitePoint = i;
          break;
        }
      }

      this.levels.rgb.inputBlack = blackPoint;
      this.levels.rgb.inputWhite = whitePoint;
    } else {
      // Auto for specific channel
      const channelIdx = { red: 0, green: 1, blue: 2 }[this.currentChannel];
      const histogram = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        histogram[data[i + channelIdx]]++;
      }

      let blackPoint = 0;
      let whitePoint = 255;
      let count = 0;

      for (let i = 0; i < 256; i++) {
        count += histogram[i];
        if (count > clipCount) {
          blackPoint = i;
          break;
        }
      }

      count = 0;
      for (let i = 255; i >= 0; i--) {
        count += histogram[i];
        if (count > clipCount) {
          whitePoint = i;
          break;
        }
      }

      this.levels[this.currentChannel].inputBlack = blackPoint;
      this.levels[this.currentChannel].inputWhite = whitePoint;
    }

    this.updateInputs();
    this.drawHistogram();
    this.render();
  }

  applyLevels(value, level) {
    const { inputBlack, inputWhite, gamma, outputBlack, outputWhite } = level;

    // Input mapping
    let v = (value - inputBlack) / (inputWhite - inputBlack);
    v = Math.max(0, Math.min(1, v));

    // Gamma correction
    v = Math.pow(v, 1 / gamma);

    // Output mapping
    v = v * (outputWhite - outputBlack) + outputBlack;

    return Math.max(0, Math.min(255, Math.round(v)));
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);
    const dstData = outputData.data;

    const rgbLevel = this.levels.rgb;
    const rLevel = this.levels.red;
    const gLevel = this.levels.green;
    const bLevel = this.levels.blue;

    for (let i = 0; i < srcData.length; i += 4) {
      // Apply individual channel levels first
      let r = this.applyLevels(srcData[i], rLevel);
      let g = this.applyLevels(srcData[i + 1], gLevel);
      let b = this.applyLevels(srcData[i + 2], bLevel);

      // Then apply RGB level to all
      dstData[i] = this.applyLevels(r, rgbLevel);
      dstData[i + 1] = this.applyLevels(g, rgbLevel);
      dstData[i + 2] = this.applyLevels(b, rgbLevel);
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'levels-adjusted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.currentChannel = 'rgb';
    this.levels = {
      rgb: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      red: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      green: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 },
      blue: { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 }
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.channel-tab[data-channel="rgb"]').classList.add('active');
    this.updateInputs();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LevelsTool();
});
