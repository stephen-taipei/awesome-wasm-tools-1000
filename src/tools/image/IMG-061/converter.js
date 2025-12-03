/**
 * IMG-061 負片效果
 * 將圖片轉為負片效果（色彩反轉）
 */

class NegativeEffectTool {
  constructor() {
    this.sourceImage = null;
    this.invertR = true;
    this.invertG = true;
    this.invertB = true;

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

    this.invertRCheck = document.getElementById('invertR');
    this.invertGCheck = document.getElementById('invertG');
    this.invertBCheck = document.getElementById('invertB');

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

    // Channel toggles
    this.invertRCheck.addEventListener('change', () => {
      this.invertR = this.invertRCheck.checked;
      this.processImage();
    });
    this.invertGCheck.addEventListener('change', () => {
      this.invertG = this.invertGCheck.checked;
      this.processImage();
    });
    this.invertBCheck.addEventListener('change', () => {
      this.invertB = this.invertBCheck.checked;
      this.processImage();
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

    // Invert colors
    for (let i = 0; i < data.length; i += 4) {
      if (this.invertR) data[i] = 255 - data[i];         // R
      if (this.invertG) data[i + 1] = 255 - data[i + 1]; // G
      if (this.invertB) data[i + 2] = 255 - data[i + 2]; // B
      // Alpha channel (data[i + 3]) remains unchanged
    }

    this.resultCtx.putImageData(imageData, 0, 0);

    this.previewInfo.textContent = `${width} × ${height} px`;
    this.showStatus('success', '負片效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `negative_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '負片圖已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.invertR = true;
    this.invertG = true;
    this.invertB = true;
    this.invertRCheck.checked = true;
    this.invertGCheck.checked = true;
    this.invertBCheck.checked = true;

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
  new NegativeEffectTool();
});
