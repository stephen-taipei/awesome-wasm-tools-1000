/**
 * IMG-064 像素化效果
 * 將圖片轉為復古像素風格
 */

class PixelateTool {
  constructor() {
    this.sourceImage = null;
    this.pixelSize = 8;
    this.palette = 'full';

    // Color palettes
    this.palettes = {
      full: null, // No color reduction
      16: this.generate16ColorPalette(),
      8: this.generate8ColorPalette(),
      gameboy: [
        [15, 56, 15],
        [48, 98, 48],
        [139, 172, 15],
        [155, 188, 15]
      ],
      nes: [
        [0, 0, 0], [252, 252, 252], [188, 188, 188], [124, 124, 124],
        [164, 0, 0], [228, 0, 88], [248, 56, 0], [228, 92, 16],
        [172, 124, 0], [0, 184, 0], [0, 168, 0], [0, 168, 68],
        [0, 136, 136], [0, 120, 248], [104, 68, 252], [216, 0, 204]
      ]
    };

    this.init();
  }

  generate16ColorPalette() {
    return [
      [0, 0, 0], [255, 255, 255], [128, 128, 128], [192, 192, 192],
      [128, 0, 0], [255, 0, 0], [128, 128, 0], [255, 255, 0],
      [0, 128, 0], [0, 255, 0], [0, 128, 128], [0, 255, 255],
      [0, 0, 128], [0, 0, 255], [128, 0, 128], [255, 0, 255]
    ];
  }

  generate8ColorPalette() {
    return [
      [0, 0, 0], [255, 255, 255],
      [255, 0, 0], [0, 255, 0],
      [0, 0, 255], [255, 255, 0],
      [255, 0, 255], [0, 255, 255]
    ];
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.pixelSizeSlider = document.getElementById('pixelSizeSlider');
    this.pixelSizeValue = document.getElementById('pixelSizeValue');

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

    // Pixel size slider
    this.pixelSizeSlider.addEventListener('input', () => {
      this.pixelSize = parseInt(this.pixelSizeSlider.value);
      this.pixelSizeValue.textContent = `${this.pixelSize} px`;
      this.updatePresets();
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.pixelSize = parseInt(btn.dataset.size);
        this.pixelSizeSlider.value = this.pixelSize;
        this.pixelSizeValue.textContent = `${this.pixelSize} px`;
        this.updatePresets();
        this.processImage();
      });
    });

    // Palette buttons
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.palette = btn.dataset.palette;
        document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.size) === this.pixelSize);
    });
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
        this.downloadBtn.disabled = false;

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

  findClosestColor(r, g, b, palette) {
    let minDist = Infinity;
    let closest = [r, g, b];

    for (const color of palette) {
      const dist = Math.pow(r - color[0], 2) +
                   Math.pow(g - color[1], 2) +
                   Math.pow(b - color[2], 2);
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }

    return closest;
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Disable image smoothing for sharp pixels
    this.resultCtx.imageSmoothingEnabled = false;

    // Calculate scaled dimensions
    const scaledW = Math.ceil(width / this.pixelSize);
    const scaledH = Math.ceil(height / this.pixelSize);

    // Create temporary canvas for downscaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = scaledW;
    tempCanvas.height = scaledH;
    tempCtx.imageSmoothingEnabled = false;

    // Draw downscaled image
    tempCtx.drawImage(this.sourceImage, 0, 0, scaledW, scaledH);

    // Apply palette if needed
    if (this.palette !== 'full' && this.palettes[this.palette]) {
      const imageData = tempCtx.getImageData(0, 0, scaledW, scaledH);
      const data = imageData.data;
      const palette = this.palettes[this.palette];

      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = this.findClosestColor(data[i], data[i + 1], data[i + 2], palette);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      tempCtx.putImageData(imageData, 0, 0);
    }

    // Scale back up with nearest neighbor
    this.resultCtx.drawImage(tempCanvas, 0, 0, scaledW, scaledH, 0, 0, width, height);

    const paletteNames = {
      full: '全彩',
      16: '16色',
      8: '8色',
      gameboy: 'GameBoy',
      nes: 'NES'
    };

    this.previewInfo.textContent = `${width} × ${height} px | ${this.pixelSize}px 像素 | ${paletteNames[this.palette]}`;
    this.showStatus('success', '像素化效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pixel_${this.pixelSize}px_${this.palette}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '像素圖已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.pixelSize = 8;
    this.pixelSizeSlider.value = 8;
    this.pixelSizeValue.textContent = '8 px';
    this.updatePresets();

    this.palette = 'full';
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.palette === 'full');
    });

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
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
  new PixelateTool();
});
