/**
 * IMG-079 直方圖顯示
 * 顯示圖片的色彩分布直方圖
 */

class HistogramTool {
  constructor() {
    this.sourceImage = null;
    this.histogramData = {
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0),
      luminance: new Array(256).fill(0)
    };
    this.currentChannel = 'rgb';
    this.stats = { luminance: 0, red: 0, green: 0, blue: 0 };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.previewSection = document.getElementById('previewSection');

    this.imageCanvas = document.getElementById('imageCanvas');
    this.imageCtx = this.imageCanvas.getContext('2d');
    this.histogramCanvas = document.getElementById('histogramCanvas');
    this.histogramCtx = this.histogramCanvas.getContext('2d');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Channel tabs
    document.querySelectorAll('.histogram-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentChannel = tab.dataset.channel;
        document.querySelectorAll('.histogram-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.drawHistogram();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.uploadArea.style.display = 'none';
        this.previewSection.style.display = 'block';
        this.downloadBtn.disabled = false;

        // Draw original
        this.imageCanvas.width = img.width;
        this.imageCanvas.height = img.height;
        this.imageCtx.drawImage(img, 0, 0);

        // Analyze
        this.analyzeImage();
        this.drawHistogram();
        this.showStatus('success', '圖片分析完成');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  analyzeImage() {
    const width = this.sourceImage.width;
    const height = this.sourceImage.height;
    const imageData = this.imageCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixelCount = width * height;

    // Reset histogram data
    this.histogramData = {
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0),
      luminance: new Array(256).fill(0)
    };

    let rSum = 0, gSum = 0, bSum = 0, lumSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = Math.round(r * 0.299 + g * 0.587 + b * 0.114);

      this.histogramData.red[r]++;
      this.histogramData.green[g]++;
      this.histogramData.blue[b]++;
      this.histogramData.luminance[luminance]++;

      rSum += r;
      gSum += g;
      bSum += b;
      lumSum += luminance;
    }

    // Calculate averages
    this.stats = {
      luminance: Math.round(lumSum / pixelCount),
      red: Math.round(rSum / pixelCount),
      green: Math.round(gSum / pixelCount),
      blue: Math.round(bSum / pixelCount)
    };

    // Update stats display
    document.getElementById('statLuminance').textContent = this.stats.luminance;
    document.getElementById('statRed').textContent = this.stats.red;
    document.getElementById('statGreen').textContent = this.stats.green;
    document.getElementById('statBlue').textContent = this.stats.blue;
  }

  drawHistogram() {
    const canvas = this.histogramCanvas;
    const ctx = this.histogramCtx;

    // Set actual canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 30;
    canvas.height = 200;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Get max value for normalization
    let maxValue = 0;
    if (this.currentChannel === 'rgb') {
      maxValue = Math.max(
        ...this.histogramData.red,
        ...this.histogramData.green,
        ...this.histogramData.blue
      );
    } else if (this.currentChannel === 'red') {
      maxValue = Math.max(...this.histogramData.red);
    } else if (this.currentChannel === 'green') {
      maxValue = Math.max(...this.histogramData.green);
    } else if (this.currentChannel === 'blue') {
      maxValue = Math.max(...this.histogramData.blue);
    }

    if (maxValue === 0) return;

    const barWidth = graphWidth / 256;

    // Draw histogram
    if (this.currentChannel === 'rgb') {
      // Draw all channels with transparency
      this.drawChannelBars(ctx, this.histogramData.red, maxValue, 'rgba(255, 107, 107, 0.5)', padding, graphHeight, barWidth);
      this.drawChannelBars(ctx, this.histogramData.green, maxValue, 'rgba(81, 207, 102, 0.5)', padding, graphHeight, barWidth);
      this.drawChannelBars(ctx, this.histogramData.blue, maxValue, 'rgba(51, 154, 240, 0.5)', padding, graphHeight, barWidth);
    } else {
      const colors = {
        red: '#ff6b6b',
        green: '#51cf66',
        blue: '#339af0'
      };
      this.drawChannelBars(ctx, this.histogramData[this.currentChannel], maxValue, colors[this.currentChannel], padding, graphHeight, barWidth);
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.fillText('0', padding, height - 2);
    ctx.fillText('255', width - padding - 20, height - 2);
  }

  drawChannelBars(ctx, data, maxValue, color, padding, graphHeight, barWidth) {
    ctx.fillStyle = color;

    for (let i = 0; i < 256; i++) {
      const value = data[i];
      const barHeight = (value / maxValue) * graphHeight;
      const x = padding + i * barWidth;
      const y = padding + graphHeight - barHeight;

      ctx.fillRect(x, y, Math.max(barWidth - 0.5, 1), barHeight);
    }
  }

  download() {
    // Create a larger histogram for download
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    exportCanvas.width = 800;
    exportCanvas.height = 400;

    const width = exportCanvas.width;
    const height = exportCanvas.height;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Background
    exportCtx.fillStyle = '#1a1a2e';
    exportCtx.fillRect(0, 0, width, height);

    // Title
    exportCtx.fillStyle = '#e0e0e0';
    exportCtx.font = 'bold 16px sans-serif';
    exportCtx.fillText('色彩直方圖 - ' + this.getChannelName(), padding, 25);

    // Get max value
    let maxValue = 0;
    if (this.currentChannel === 'rgb') {
      maxValue = Math.max(
        ...this.histogramData.red,
        ...this.histogramData.green,
        ...this.histogramData.blue
      );
    } else {
      maxValue = Math.max(...this.histogramData[this.currentChannel]);
    }

    const barWidth = graphWidth / 256;

    // Draw histogram
    if (this.currentChannel === 'rgb') {
      this.drawChannelBarsExport(exportCtx, this.histogramData.red, maxValue, 'rgba(255, 107, 107, 0.5)', padding, graphHeight, barWidth);
      this.drawChannelBarsExport(exportCtx, this.histogramData.green, maxValue, 'rgba(81, 207, 102, 0.5)', padding, graphHeight, barWidth);
      this.drawChannelBarsExport(exportCtx, this.histogramData.blue, maxValue, 'rgba(51, 154, 240, 0.5)', padding, graphHeight, barWidth);
    } else {
      const colors = {
        red: '#ff6b6b',
        green: '#51cf66',
        blue: '#339af0'
      };
      this.drawChannelBarsExport(exportCtx, this.histogramData[this.currentChannel], maxValue, colors[this.currentChannel], padding, graphHeight, barWidth);
    }

    // Draw axes
    exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    exportCtx.lineWidth = 2;
    exportCtx.beginPath();
    exportCtx.moveTo(padding, padding);
    exportCtx.lineTo(padding, height - padding);
    exportCtx.lineTo(width - padding, height - padding);
    exportCtx.stroke();

    // Draw labels
    exportCtx.fillStyle = '#aaa';
    exportCtx.font = '12px sans-serif';
    exportCtx.fillText('0', padding - 5, height - padding + 15);
    exportCtx.fillText('128', width / 2 - 10, height - padding + 15);
    exportCtx.fillText('255', width - padding - 15, height - padding + 15);

    // Draw stats
    exportCtx.fillStyle = '#888';
    exportCtx.font = '11px sans-serif';
    const statsY = height - 15;
    exportCtx.fillText(`亮度平均: ${this.stats.luminance}`, padding, statsY);
    exportCtx.fillStyle = '#ff6b6b';
    exportCtx.fillText(`R: ${this.stats.red}`, padding + 120, statsY);
    exportCtx.fillStyle = '#51cf66';
    exportCtx.fillText(`G: ${this.stats.green}`, padding + 180, statsY);
    exportCtx.fillStyle = '#339af0';
    exportCtx.fillText(`B: ${this.stats.blue}`, padding + 240, statsY);

    // Download
    exportCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `histogram_${this.currentChannel}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '直方圖已下載');
    }, 'image/png');
  }

  drawChannelBarsExport(ctx, data, maxValue, color, padding, graphHeight, barWidth) {
    ctx.fillStyle = color;

    for (let i = 0; i < 256; i++) {
      const value = data[i];
      const barHeight = (value / maxValue) * graphHeight;
      const x = padding + i * barWidth;
      const y = padding + graphHeight - barHeight;

      ctx.fillRect(x, y, Math.max(barWidth - 0.5, 1), barHeight);
    }
  }

  getChannelName() {
    const names = {
      rgb: 'RGB 綜合',
      red: '紅色通道',
      green: '綠色通道',
      blue: '藍色通道'
    };
    return names[this.currentChannel];
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.currentChannel = 'rgb';

    this.uploadArea.style.display = 'block';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.histogram-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.channel === 'rgb');
    });

    this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    this.histogramCtx.clearRect(0, 0, this.histogramCanvas.width, this.histogramCanvas.height);

    document.getElementById('statLuminance').textContent = '-';
    document.getElementById('statRed').textContent = '-';
    document.getElementById('statGreen').textContent = '-';
    document.getElementById('statBlue').textContent = '-';

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new HistogramTool();
});
