/**
 * IMG-184 圖片直方圖工具
 */
class HistogramTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.histCanvas = document.getElementById('histogramCanvas');
    this.histCtx = this.histCanvas.getContext('2d');
    this.histData = { r: [], g: [], b: [], lum: [] };
    this.activeChannel = 'all';
    this.init();
  }

  init() { this.bindEvents(); this.resizeHistCanvas(); }

  resizeHistCanvas() {
    const container = this.histCanvas.parentElement;
    this.histCanvas.width = container.offsetWidth;
    this.histCanvas.height = 120;
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.channel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeChannel = btn.dataset.channel;
        this.drawHistogram();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    window.addEventListener('resize', () => { this.resizeHistCanvas(); if (this.originalImage) this.drawHistogram(); });
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.resizeHistCanvas();
        this.analyze();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  analyze() {
    if (!this.originalImage) return;
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // Initialize histograms
    this.histData = { r: new Array(256).fill(0), g: new Array(256).fill(0), b: new Array(256).fill(0), lum: new Array(256).fill(0) };

    let sumBrightness = 0, minVal = 255, maxVal = 0;
    const brightnessValues = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      this.histData.r[r]++;
      this.histData.g[g]++;
      this.histData.b[b]++;
      this.histData.lum[lum]++;

      sumBrightness += lum;
      brightnessValues.push(lum);
      minVal = Math.min(minVal, lum);
      maxVal = Math.max(maxVal, lum);
    }

    const avgBrightness = sumBrightness / pixelCount;
    const variance = brightnessValues.reduce((acc, val) => acc + Math.pow(val - avgBrightness, 2), 0) / pixelCount;
    const stdDev = Math.sqrt(variance);

    // Update stats
    document.getElementById('avgBrightness').textContent = avgBrightness.toFixed(1);
    document.getElementById('stdDev').textContent = stdDev.toFixed(1);
    document.getElementById('minValue').textContent = minVal;
    document.getElementById('maxValue').textContent = maxVal;
    document.getElementById('dimensions').textContent = `${this.canvas.width} × ${this.canvas.height}`;
    document.getElementById('pixelCount').textContent = pixelCount.toLocaleString();

    this.drawHistogram();
  }

  drawHistogram() {
    const ctx = this.histCtx;
    const w = this.histCanvas.width;
    const h = this.histCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const drawChannel = (data, color, alpha = 0.7) => {
      const max = Math.max(...data);
      if (max === 0) return;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      const barWidth = w / 256;
      for (let i = 0; i < 256; i++) {
        const barHeight = (data[i] / max) * h;
        ctx.fillRect(i * barWidth, h - barHeight, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;
    };

    switch (this.activeChannel) {
      case 'all':
        drawChannel(this.histData.r, '#ff4444', 0.5);
        drawChannel(this.histData.g, '#44ff44', 0.5);
        drawChannel(this.histData.b, '#4444ff', 0.5);
        break;
      case 'r':
        drawChannel(this.histData.r, '#ff4444');
        break;
      case 'g':
        drawChannel(this.histData.g, '#44ff44');
        break;
      case 'b':
        drawChannel(this.histData.b, '#4444ff');
        break;
    }
  }

  reset() {
    this.originalImage = null;
    this.histData = { r: [], g: [], b: [], lum: [] };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.channel-btn[data-channel="all"]').classList.add('active');
    this.activeChannel = 'all';
    ['avgBrightness', 'stdDev', 'minValue', 'maxValue', 'dimensions', 'pixelCount'].forEach(id => {
      document.getElementById(id).textContent = '-';
    });
  }

  download() {
    if (!this.histCanvas.width) return;
    // Create a larger histogram for download
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 512;
    exportCanvas.height = 240;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 240);

    const drawChannel = (data, color, alpha = 0.7) => {
      const max = Math.max(...data);
      if (max === 0) return;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 256; i++) {
        const barHeight = (data[i] / max) * 220;
        ctx.fillRect(i * 2, 230 - barHeight, 2, barHeight);
      }
      ctx.globalAlpha = 1;
    };

    drawChannel(this.histData.r, '#ff4444', 0.5);
    drawChannel(this.histData.g, '#44ff44', 0.5);
    drawChannel(this.histData.b, '#4444ff', 0.5);

    const link = document.createElement('a');
    link.download = `histogram_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new HistogramTool());
