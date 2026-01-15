/**
 * TXT-060: Image to ASCII Art Converter
 *
 * Converts images to ASCII art.
 */

class ImageToAscii {
  constructor() {
    this.charsets = {
      standard: '@%#*+=-:. ',
      blocks: '█▓▒░ ',
      detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
      simple: '#. '
    };
    this.init();
  }

  init() {
    this.fileInput = document.getElementById('fileInput');
    this.widthInput = document.getElementById('widthInput');
    this.charsetSelect = document.getElementById('charsetSelect');
    this.invertCheck = document.getElementById('invertCheck');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.ctx = this.previewCanvas.getContext('2d');
    this.currentImage = null;

    this.bindEvents();
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.loadImage(e));
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  loadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.showStatus('success', '圖片載入完成，請點擊轉換');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  convert() {
    if (!this.currentImage) {
      this.showStatus('error', '請先上傳圖片');
      return;
    }

    const targetWidth = parseInt(this.widthInput.value) || 80;
    const charset = this.charsets[this.charsetSelect.value];
    const invert = this.invertCheck.checked;

    const aspectRatio = this.currentImage.height / this.currentImage.width;
    const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5);

    this.previewCanvas.width = targetWidth;
    this.previewCanvas.height = targetHeight;

    this.ctx.drawImage(this.currentImage, 0, 0, targetWidth, targetHeight);

    const imageData = this.ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imageData.data;

    let ascii = '';
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const idx = (y * targetWidth + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];

        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (invert) brightness = 1 - brightness;

        const charIndex = Math.floor(brightness * (charset.length - 1));
        ascii += charset[charIndex];
      }
      ascii += '\n';
    }

    this.outputText.textContent = ascii;
    this.resultArea.style.display = 'block';
    this.showStatus('success', 'ASCII 藝術轉換完成');
  }

  clear() {
    this.fileInput.value = '';
    this.currentImage = null;
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.textContent;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.imageToAscii = new ImageToAscii();
});

export default ImageToAscii;
