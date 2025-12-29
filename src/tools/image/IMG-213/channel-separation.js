/**
 * IMG-213 圖片通道分離工具
 */
class ChannelSeparationTool {
  constructor() {
    this.originalImage = null;
    this.canvases = {
      original: document.getElementById('originalCanvas'),
      red: document.getElementById('redCanvas'),
      green: document.getElementById('greenCanvas'),
      blue: document.getElementById('blueCanvas')
    };
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => this.downloadChannel(btn.dataset.channel));
    });

    document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAll());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
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
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Set all canvas sizes
    Object.values(this.canvases).forEach(canvas => {
      canvas.width = w;
      canvas.height = h;
    });

    // Draw original
    const origCtx = this.canvases.original.getContext('2d');
    origCtx.drawImage(this.originalImage, 0, 0);

    // Get image data
    const imageData = origCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Create channel data
    const redData = new ImageData(w, h);
    const greenData = new ImageData(w, h);
    const blueData = new ImageData(w, h);

    for (let i = 0; i < data.length; i += 4) {
      // Red channel (shown as grayscale)
      redData.data[i] = data[i];
      redData.data[i + 1] = data[i];
      redData.data[i + 2] = data[i];
      redData.data[i + 3] = 255;

      // Green channel
      greenData.data[i] = data[i + 1];
      greenData.data[i + 1] = data[i + 1];
      greenData.data[i + 2] = data[i + 1];
      greenData.data[i + 3] = 255;

      // Blue channel
      blueData.data[i] = data[i + 2];
      blueData.data[i + 1] = data[i + 2];
      blueData.data[i + 2] = data[i + 2];
      blueData.data[i + 3] = 255;
    }

    this.canvases.red.getContext('2d').putImageData(redData, 0, 0);
    this.canvases.green.getContext('2d').putImageData(greenData, 0, 0);
    this.canvases.blue.getContext('2d').putImageData(blueData, 0, 0);
  }

  downloadChannel(channel) {
    const canvas = this.canvases[channel];
    if (!canvas.width) return;
    const link = document.createElement('a');
    link.download = `${channel}_channel_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  downloadAll() {
    ['red', 'green', 'blue'].forEach((channel, i) => {
      setTimeout(() => this.downloadChannel(channel), i * 200);
    });
  }

  reset() {
    this.originalImage = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => new ChannelSeparationTool());
