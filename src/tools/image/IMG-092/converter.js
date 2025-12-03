/**
 * IMG-092 色彩取樣器
 * 從圖片中取樣顏色，顯示色碼
 */

class ColorPickerTool {
  constructor() {
    this.sourceImage = null;
    this.imageData = null;
    this.currentColor = { r: 0, g: 0, b: 0, a: 255 };
    this.pickedColors = [];

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorLayout = document.getElementById('editorLayout');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.magnifier = document.getElementById('magnifier');
    this.magnifierCanvas = document.getElementById('magnifierCanvas');
    this.magnifierCtx = this.magnifierCanvas.getContext('2d');

    this.colorPreview = document.getElementById('colorPreview');
    this.hexValue = document.getElementById('hexValue');
    this.rgbValue = document.getElementById('rgbValue');
    this.hslValue = document.getElementById('hslValue');
    this.rgbaValue = document.getElementById('rgbaValue');
    this.colorHistory = document.getElementById('colorHistory');

    this.exportBtn = document.getElementById('exportBtn');
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

    // Canvas events
    this.previewCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.previewCanvas.addEventListener('mouseleave', () => this.hideMagnifier());
    this.previewCanvas.addEventListener('click', (e) => this.pickColor(e));

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copyColor(btn.dataset.format));
    });

    // Buttons
    this.exportBtn.addEventListener('click', () => this.exportColors());
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
        this.editorLayout.classList.add('active');
        this.exportBtn.disabled = false;

        this.previewCanvas.width = img.width;
        this.previewCanvas.height = img.height;
        this.previewCtx.drawImage(img, 0, 0);
        this.imageData = this.previewCtx.getImageData(0, 0, img.width, img.height);

        this.showStatus('success', '圖片載入成功，點擊取樣顏色');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getCanvasCoords(e) {
    const rect = this.previewCanvas.getBoundingClientRect();
    const scaleX = this.previewCanvas.width / rect.width;
    const scaleY = this.previewCanvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY)
    };
  }

  onMouseMove(e) {
    if (!this.imageData) return;

    const coords = this.getCanvasCoords(e);
    const color = this.getPixelColor(coords.x, coords.y);

    this.currentColor = color;
    this.updateColorDisplay(color);
    this.showMagnifier(e, coords);
  }

  getPixelColor(x, y) {
    if (x < 0 || x >= this.imageData.width || y < 0 || y >= this.imageData.height) {
      return { r: 0, g: 0, b: 0, a: 255 };
    }

    const index = (y * this.imageData.width + x) * 4;
    return {
      r: this.imageData.data[index],
      g: this.imageData.data[index + 1],
      b: this.imageData.data[index + 2],
      a: this.imageData.data[index + 3]
    };
  }

  updateColorDisplay(color) {
    const hex = this.rgbToHex(color.r, color.g, color.b);
    const hsl = this.rgbToHsl(color.r, color.g, color.b);

    this.colorPreview.style.background = hex;
    this.hexValue.textContent = hex;
    this.rgbValue.textContent = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.hslValue.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    this.rgbaValue.textContent = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a / 255).toFixed(2)})`;
  }

  showMagnifier(e, coords) {
    const zoom = 8;
    const size = 15; // pixels to show

    this.magnifier.style.display = 'block';
    this.magnifier.style.left = (e.clientX + 20) + 'px';
    this.magnifier.style.top = (e.clientY - 60) + 'px';

    // Draw magnified area
    this.magnifierCtx.imageSmoothingEnabled = false;
    this.magnifierCtx.clearRect(0, 0, 120, 120);

    const startX = coords.x - Math.floor(size / 2);
    const startY = coords.y - Math.floor(size / 2);

    this.magnifierCtx.drawImage(
      this.previewCanvas,
      startX, startY, size, size,
      0, 0, 120, 120
    );
  }

  hideMagnifier() {
    this.magnifier.style.display = 'none';
  }

  pickColor(e) {
    if (!this.imageData) return;

    const coords = this.getCanvasCoords(e);
    const color = this.getPixelColor(coords.x, coords.y);

    // Add to picked colors if not already exists
    const hex = this.rgbToHex(color.r, color.g, color.b);
    if (!this.pickedColors.find(c => c.hex === hex)) {
      this.pickedColors.push({
        ...color,
        hex: hex
      });
      this.updateColorHistory();
    }

    this.showStatus('success', `已取樣顏色 ${hex}`);
  }

  updateColorHistory() {
    this.colorHistory.innerHTML = '';
    this.pickedColors.forEach((color, index) => {
      const div = document.createElement('div');
      div.className = 'color-history-item';
      div.style.background = color.hex;
      div.title = color.hex;
      div.addEventListener('click', () => {
        this.currentColor = color;
        this.updateColorDisplay(color);
      });
      this.colorHistory.appendChild(div);
    });
  }

  copyColor(format) {
    let text = '';
    switch (format) {
      case 'hex':
        text = this.hexValue.textContent;
        break;
      case 'rgb':
        text = this.rgbValue.textContent;
        break;
      case 'hsl':
        text = this.hslValue.textContent;
        break;
      case 'rgba':
        text = this.rgbaValue.textContent;
        break;
    }

    navigator.clipboard.writeText(text).then(() => {
      this.showStatus('success', `已複製 ${text}`);
    });
  }

  exportColors() {
    if (this.pickedColors.length === 0) {
      this.showStatus('error', '尚未取樣任何顏色');
      return;
    }

    let text = '取樣顏色列表\n============\n\n';
    this.pickedColors.forEach((color, index) => {
      const hsl = this.rgbToHsl(color.r, color.g, color.b);
      text += `顏色 ${index + 1}\n`;
      text += `HEX:  ${color.hex}\n`;
      text += `RGB:  rgb(${color.r}, ${color.g}, ${color.b})\n`;
      text += `HSL:  hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      this.showStatus('success', `已匯出 ${this.pickedColors.length} 個顏色到剪貼簿`);
    });
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  reset() {
    this.sourceImage = null;
    this.imageData = null;
    this.pickedColors = [];
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorLayout.classList.remove('active');
    this.exportBtn.disabled = true;

    this.colorPreview.style.background = '#000';
    this.hexValue.textContent = '#000000';
    this.rgbValue.textContent = 'rgb(0, 0, 0)';
    this.hslValue.textContent = 'hsl(0, 0%, 0%)';
    this.rgbaValue.textContent = 'rgba(0, 0, 0, 1)';
    this.colorHistory.innerHTML = '';

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.style.display = 'none';
      }, 2000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ColorPickerTool();
});
