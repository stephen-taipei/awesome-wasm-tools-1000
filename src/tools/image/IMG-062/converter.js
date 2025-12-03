/**
 * IMG-062 色調分離
 * 減少圖片色彩數量，產生海報風格效果
 */

class PosterizeTool {
  constructor() {
    this.sourceImage = null;
    this.levels = 4;

    this.init();
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

    this.levelsSlider = document.getElementById('levelsSlider');
    this.levelsValue = document.getElementById('levelsValue');

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

    // Levels slider
    this.levelsSlider.addEventListener('input', () => {
      this.levels = parseInt(this.levelsSlider.value);
      this.levelsValue.textContent = `${this.levels} 色階`;
      this.updatePresets();
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.levels = parseInt(btn.dataset.levels);
        this.levelsSlider.value = this.levels;
        this.levelsValue.textContent = `${this.levels} 色階`;
        this.updatePresets();
        this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.levels) === this.levels);
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

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Draw original to result canvas
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Get pixel data
    const imageData = this.resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate the step size for posterization
    const step = 255 / (this.levels - 1);

    // Apply posterization
    for (let i = 0; i < data.length; i += 4) {
      // For each RGB channel
      data[i] = Math.round(Math.round(data[i] / step) * step);         // R
      data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step); // G
      data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step); // B
      // Alpha remains unchanged
    }

    this.resultCtx.putImageData(imageData, 0, 0);

    this.previewInfo.textContent = `${width} × ${height} px | ${this.levels} 色階`;
    this.showStatus('success', '色調分離效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `posterize_${this.levels}levels_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.levels = 4;
    this.levelsSlider.value = 4;
    this.levelsValue.textContent = '4 色階';
    this.updatePresets();

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
  new PosterizeTool();
});
