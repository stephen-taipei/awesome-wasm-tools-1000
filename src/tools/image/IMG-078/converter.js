/**
 * IMG-078 色彩通道合併
 * 將獨立的 RGB 通道圖合併為彩色圖
 */

class ChannelMergeTool {
  constructor() {
    this.redImage = null;
    this.greenImage = null;
    this.blueImage = null;

    this.init();
  }

  init() {
    this.redDropzone = document.getElementById('redDropzone');
    this.greenDropzone = document.getElementById('greenDropzone');
    this.blueDropzone = document.getElementById('blueDropzone');

    this.redInput = document.getElementById('redInput');
    this.greenInput = document.getElementById('greenInput');
    this.blueInput = document.getElementById('blueInput');

    this.redCanvas = document.getElementById('redCanvas');
    this.redCtx = this.redCanvas.getContext('2d');
    this.greenCanvas = document.getElementById('greenCanvas');
    this.greenCtx = this.greenCanvas.getContext('2d');
    this.blueCanvas = document.getElementById('blueCanvas');
    this.blueCtx = this.blueCanvas.getContext('2d');

    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.previewInfo = document.getElementById('previewInfo');
    this.sizeWarning = document.getElementById('sizeWarning');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Red channel
    this.setupDropzone(this.redDropzone, this.redInput, 'red');
    // Green channel
    this.setupDropzone(this.greenDropzone, this.greenInput, 'green');
    // Blue channel
    this.setupDropzone(this.blueDropzone, this.blueInput, 'blue');

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  setupDropzone(dropzone, input, channel) {
    dropzone.addEventListener('click', () => input.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadChannelImage(file, channel);
    });

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadChannelImage(file, channel);
    });
  }

  loadChannelImage(file, channel) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        switch (channel) {
          case 'red':
            this.redImage = img;
            this.updateChannelPreview(this.redCanvas, this.redCtx, this.redDropzone, img);
            break;
          case 'green':
            this.greenImage = img;
            this.updateChannelPreview(this.greenCanvas, this.greenCtx, this.greenDropzone, img);
            break;
          case 'blue':
            this.blueImage = img;
            this.updateChannelPreview(this.blueCanvas, this.blueCtx, this.blueDropzone, img);
            break;
        }

        this.checkAndMerge();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateChannelPreview(canvas, ctx, dropzone, img) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    canvas.style.display = 'block';
    dropzone.classList.add('has-image');

    // Hide text
    const text = dropzone.querySelector('.dropzone-text');
    const hint = dropzone.querySelector('.dropzone-hint');
    if (text) text.style.display = 'none';
    if (hint) hint.style.display = 'none';
  }

  checkAndMerge() {
    // Check if all channels are loaded
    if (this.redImage && this.greenImage && this.blueImage) {
      // Check size consistency
      const sizes = [
        { w: this.redImage.width, h: this.redImage.height },
        { w: this.greenImage.width, h: this.greenImage.height },
        { w: this.blueImage.width, h: this.blueImage.height }
      ];

      const sameSize = sizes.every(s => s.w === sizes[0].w && s.h === sizes[0].h);
      this.sizeWarning.style.display = sameSize ? 'none' : 'block';

      this.mergeChannels();
      this.previewSection.style.display = 'block';
      this.downloadBtn.disabled = false;
    }
  }

  mergeChannels() {
    // Use the first image's dimensions
    const width = this.redImage.width;
    const height = this.redImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Create temporary canvases to get scaled channel data
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Get red channel data
    tempCtx.drawImage(this.redImage, 0, 0, width, height);
    const redData = tempCtx.getImageData(0, 0, width, height).data;

    // Get green channel data
    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(this.greenImage, 0, 0, width, height);
    const greenData = tempCtx.getImageData(0, 0, width, height).data;

    // Get blue channel data
    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(this.blueImage, 0, 0, width, height);
    const blueData = tempCtx.getImageData(0, 0, width, height).data;

    // Create merged image
    const resultData = this.resultCtx.createImageData(width, height);

    for (let i = 0; i < redData.length; i += 4) {
      // For grayscale input, take the red component as the channel value
      // For colored input, take the respective channel
      const r = redData[i];
      const g = greenData[i + 1] || greenData[i]; // Green from green channel, or grayscale
      const b = blueData[i + 2] || blueData[i]; // Blue from blue channel, or grayscale

      // Use luminosity of each channel image as the channel value
      const rLum = redData[i] * 0.299 + redData[i + 1] * 0.587 + redData[i + 2] * 0.114;
      const gLum = greenData[i] * 0.299 + greenData[i + 1] * 0.587 + greenData[i + 2] * 0.114;
      const bLum = blueData[i] * 0.299 + blueData[i + 1] * 0.587 + blueData[i + 2] * 0.114;

      resultData.data[i] = rLum;
      resultData.data[i + 1] = gLum;
      resultData.data[i + 2] = bLum;
      resultData.data[i + 3] = 255; // Full opacity
    }

    this.resultCtx.putImageData(resultData, 0, 0);

    this.previewInfo.textContent = `${width} × ${height} px | RGB 通道已合併`;
    this.showStatus('success', '色彩通道合併完成');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `merged_rgb_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '合併圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.redImage = null;
    this.greenImage = null;
    this.blueImage = null;

    this.redInput.value = '';
    this.greenInput.value = '';
    this.blueInput.value = '';

    // Reset dropzones
    [this.redDropzone, this.greenDropzone, this.blueDropzone].forEach(dropzone => {
      dropzone.classList.remove('has-image');
      const text = dropzone.querySelector('.dropzone-text');
      const hint = dropzone.querySelector('.dropzone-hint');
      if (text) text.style.display = 'block';
      if (hint) hint.style.display = 'block';
    });

    // Hide canvases
    this.redCanvas.style.display = 'none';
    this.greenCanvas.style.display = 'none';
    this.blueCanvas.style.display = 'none';

    // Clear canvases
    this.redCtx.clearRect(0, 0, this.redCanvas.width, this.redCanvas.height);
    this.greenCtx.clearRect(0, 0, this.greenCanvas.width, this.greenCanvas.height);
    this.blueCtx.clearRect(0, 0, this.blueCanvas.width, this.blueCanvas.height);
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);

    this.previewSection.style.display = 'none';
    this.sizeWarning.style.display = 'none';
    this.downloadBtn.disabled = true;
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
  new ChannelMergeTool();
});
