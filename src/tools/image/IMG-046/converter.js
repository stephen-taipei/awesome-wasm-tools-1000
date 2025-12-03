/**
 * IMG-046 智慧去背
 * AI 自動辨識並移除圖片背景
 */

class SmartBackgroundRemovalTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;
    this.isModelLoaded = false;

    this.init();
  }

  async init() {
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingProgressFill = document.getElementById('loadingProgressFill');

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.featherSlider = document.getElementById('featherSlider');
    this.featherValue = document.getElementById('featherValue');
    this.thresholdSlider = document.getElementById('thresholdSlider');
    this.thresholdValue = document.getElementById('thresholdValue');

    this.originalPreview = document.getElementById('originalPreview');
    this.resultPreview = document.getElementById('resultPreview');
    this.originalInfo = document.getElementById('originalInfo');
    this.resultInfo = document.getElementById('resultInfo');

    this.removeBtn = document.getElementById('removeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();

    // Pre-load model
    await this.preloadModel();
  }

  async preloadModel() {
    try {
      this.loadingText.textContent = '載入 AI 去背模型中（約 20MB）...';
      this.loadingProgressFill.style.width = '30%';

      // Check if library is loaded
      if (typeof imglyRemoveBackground === 'undefined') {
        throw new Error('AI 模型庫載入失敗');
      }

      this.loadingProgressFill.style.width = '100%';
      this.loadingText.textContent = '模型載入完成！';

      setTimeout(() => {
        this.loadingOverlay.classList.add('hidden');
        this.isModelLoaded = true;
      }, 500);

    } catch (error) {
      console.error('Model load error:', error);
      this.loadingText.textContent = '模型載入失敗，請重新整理頁面';
    }
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
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Slider events
    this.featherSlider.addEventListener('input', () => {
      this.featherValue.textContent = `${this.featherSlider.value}px`;
    });
    this.thresholdSlider.addEventListener('input', () => {
      this.thresholdValue.textContent = `${this.thresholdSlider.value}%`;
    });

    // Action buttons
    this.removeBtn.addEventListener('click', () => this.removeBackground());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalPreview.src = e.target.result;
        this.originalInfo.textContent = `${img.width} × ${img.height} | ${this.formatSize(file.size)}`;

        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.removeBtn.disabled = false;

        this.resultPreview.src = '';
        this.resultInfo.textContent = '';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async removeBackground() {
    if (!this.isModelLoaded) {
      this.showStatus('error', 'AI 模型尚未載入完成，請稍候');
      return;
    }

    this.progressContainer.style.display = 'block';
    this.removeBtn.disabled = true;
    this.updateProgress(10, 'AI 分析圖片中...');

    try {
      const feather = parseInt(this.featherSlider.value);
      const threshold = parseInt(this.thresholdSlider.value) / 100;

      this.updateProgress(30, '辨識前景物體...');

      // Use imgly background removal
      const blob = await imglyRemoveBackground(this.originalFile, {
        progress: (key, current, total) => {
          const percent = 30 + Math.round((current / total) * 50);
          this.updateProgress(percent, `處理中... ${Math.round(current / total * 100)}%`);
        }
      });

      this.updateProgress(85, '套用邊緣處理...');

      // Apply feathering if needed
      if (feather > 0) {
        this.resultBlob = await this.applyFeathering(blob, feather);
      } else {
        this.resultBlob = blob;
      }

      this.updateProgress(100, '完成！');

      // Show result
      const resultUrl = URL.createObjectURL(this.resultBlob);
      this.resultPreview.src = resultUrl;
      this.resultInfo.textContent = `PNG 透明背景 | ${this.formatSize(this.resultBlob.size)}`;

      this.progressContainer.style.display = 'none';
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', 'AI 去背完成！背景已成功移除');

    } catch (error) {
      console.error('Background removal error:', error);
      this.showStatus('error', `去背失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.removeBtn.disabled = false;
  }

  async applyFeathering(blob, radius) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply slight blur to edges for feathering effect
        ctx.filter = `blur(${radius * 0.5}px)`;
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';

        // Draw original on top with alpha
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(resolve, 'image/png');
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  download() {
    if (!this.resultBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_nobg.png`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;

    this.fileInput.value = '';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.removeBtn.disabled = true;
    this.progressContainer.style.display = 'none';

    this.originalPreview.src = '';
    this.resultPreview.src = '';
    this.originalInfo.textContent = '';
    this.resultInfo.textContent = '';

    this.featherSlider.value = 2;
    this.featherValue.textContent = '2px';
    this.thresholdSlider.value = 50;
    this.thresholdValue.textContent = '50%';

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
  new SmartBackgroundRemovalTool();
});
