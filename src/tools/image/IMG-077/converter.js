/**
 * IMG-077 色彩通道分離
 * 分離並顯示 RGB 各色彩通道
 */

class ChannelSplitTool {
  constructor() {
    this.sourceImage = null;
    this.displayMode = 'grayscale';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.redCanvas = document.getElementById('redCanvas');
    this.redCtx = this.redCanvas.getContext('2d');
    this.greenCanvas = document.getElementById('greenCanvas');
    this.greenCtx = this.greenCanvas.getContext('2d');
    this.blueCanvas = document.getElementById('blueCanvas');
    this.blueCtx = this.blueCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.downloadAllBtn = document.getElementById('downloadAllBtn');
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

    // Display mode buttons
    document.querySelectorAll('.display-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.displayMode = btn.dataset.mode;
        document.querySelectorAll('.display-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Individual channel downloads
    document.querySelectorAll('.channel-download').forEach(btn => {
      btn.addEventListener('click', () => {
        this.downloadChannel(btn.dataset.channel);
      });
    });

    // Buttons
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
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
        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.downloadAllBtn.disabled = false;

        // Draw original
        this.originalCanvas.width = img.width;
        this.originalCanvas.height = img.height;
        this.originalCtx.drawImage(img, 0, 0);

        // Process
        this.processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    // Set canvas sizes
    this.redCanvas.width = width;
    this.redCanvas.height = height;
    this.greenCanvas.width = width;
    this.greenCanvas.height = height;
    this.blueCanvas.width = width;
    this.blueCanvas.height = height;

    // Get source image data
    const srcData = this.originalCtx.getImageData(0, 0, width, height);
    const src = srcData.data;

    // Create image data for each channel
    const redData = this.redCtx.createImageData(width, height);
    const greenData = this.greenCtx.createImageData(width, height);
    const blueData = this.blueCtx.createImageData(width, height);

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const a = src[i + 3];

      if (this.displayMode === 'grayscale') {
        // Show each channel as grayscale
        redData.data[i] = r;
        redData.data[i + 1] = r;
        redData.data[i + 2] = r;
        redData.data[i + 3] = a;

        greenData.data[i] = g;
        greenData.data[i + 1] = g;
        greenData.data[i + 2] = g;
        greenData.data[i + 3] = a;

        blueData.data[i] = b;
        blueData.data[i + 1] = b;
        blueData.data[i + 2] = b;
        blueData.data[i + 3] = a;
      } else {
        // Show each channel in its original color
        redData.data[i] = r;
        redData.data[i + 1] = 0;
        redData.data[i + 2] = 0;
        redData.data[i + 3] = a;

        greenData.data[i] = 0;
        greenData.data[i + 1] = g;
        greenData.data[i + 2] = 0;
        greenData.data[i + 3] = a;

        blueData.data[i] = 0;
        blueData.data[i + 1] = 0;
        blueData.data[i + 2] = b;
        blueData.data[i + 3] = a;
      }
    }

    // Put image data
    this.redCtx.putImageData(redData, 0, 0);
    this.greenCtx.putImageData(greenData, 0, 0);
    this.blueCtx.putImageData(blueData, 0, 0);

    // Calculate channel statistics
    const stats = this.calculateStats(src, width * height);

    this.previewInfo.textContent = `${width} × ${height} px | R 平均: ${stats.r} | G 平均: ${stats.g} | B 平均: ${stats.b}`;
    this.showStatus('success', '色彩通道分離完成');
  }

  calculateStats(data, pixelCount) {
    let rSum = 0, gSum = 0, bSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }

    return {
      r: Math.round(rSum / pixelCount),
      g: Math.round(gSum / pixelCount),
      b: Math.round(bSum / pixelCount)
    };
  }

  downloadChannel(channel) {
    let canvas;
    let filename;

    switch (channel) {
      case 'red':
        canvas = this.redCanvas;
        filename = 'channel_R';
        break;
      case 'green':
        canvas = this.greenCanvas;
        filename = 'channel_G';
        break;
      case 'blue':
        canvas = this.blueCanvas;
        filename = 'channel_B';
        break;
    }

    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', `${channel.toUpperCase()} 通道已下載`);
    }, 'image/png');
  }

  downloadAll() {
    // Download all channels as separate files
    const channels = ['red', 'green', 'blue'];
    const canvases = [this.redCanvas, this.greenCanvas, this.blueCanvas];
    const names = ['R', 'G', 'B'];

    const timestamp = Date.now();

    channels.forEach((channel, idx) => {
      setTimeout(() => {
        canvases[idx].toBlob((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `channel_${names[idx]}_${timestamp}.png`;
          link.click();
          URL.revokeObjectURL(link.href);
        }, 'image/png');
      }, idx * 300);
    });

    this.showStatus('success', '全部通道已下載');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadAllBtn.disabled = true;

    this.displayMode = 'grayscale';
    document.querySelectorAll('.display-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'grayscale');
    });

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.redCtx.clearRect(0, 0, this.redCanvas.width, this.redCanvas.height);
    this.greenCtx.clearRect(0, 0, this.greenCanvas.width, this.greenCanvas.height);
    this.blueCtx.clearRect(0, 0, this.blueCanvas.width, this.blueCanvas.height);
    this.previewInfo.textContent = '';

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
  new ChannelSplitTool();
});
