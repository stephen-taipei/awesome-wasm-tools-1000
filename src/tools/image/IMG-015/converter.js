/**
 * IMG-015 指定大小壓縮
 * 將圖片壓縮至指定檔案大小以下
 */

class TargetSizeCompressor {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Settings
    this.targetSizeInput = document.getElementById('targetSize');
    this.sizeUnitSelect = document.getElementById('sizeUnit');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.presetButtons = document.querySelectorAll('.preset-btn');

    // Info displays
    this.originalSizeSpan = document.getElementById('originalSize');
    this.convertedSizeSpan = document.getElementById('convertedSize');
    this.processTimeSpan = document.getElementById('processTime');
    this.iterationsSpan = document.getElementById('iterations');
    this.finalQualitySpan = document.getElementById('finalQuality');
    this.targetSizeInfoSpan = document.getElementById('targetSizeInfo');
    this.actualSizeSpan = document.getElementById('actualSize');
    this.savedSpaceSpan = document.getElementById('savedSpace');

    this.bindEvents();
  }

  bindEvents() {
    // File upload
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

    // Preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.targetSizeInput.value = btn.dataset.size;
        this.sizeUnitSelect.value = btn.dataset.unit;
      });
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;
    this.originalSizeSpan.textContent = this.formatFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('originalImage').src = e.target.result;
        this.previewArea.style.display = 'flex';
        this.convertBtn.disabled = false;
        this.showStatus('success', '圖片載入成功，請設定目標大小後點擊壓縮');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getTargetSizeInBytes() {
    const value = parseInt(this.targetSizeInput.value);
    const unit = this.sizeUnitSelect.value;
    return unit === 'mb' ? value * 1024 * 1024 : value * 1024;
  }

  async compress() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在壓縮圖片...');

    const targetBytes = this.getTargetSizeInBytes();
    const format = this.outputFormatSelect.value;
    const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';

    // Check if original is already smaller
    if (this.originalFile.size <= targetBytes) {
      this.showStatus('success', '原始圖片已經小於目標大小，無需壓縮');
      this.progressContainer.style.display = 'none';
      this.convertBtn.disabled = false;
      return;
    }

    try {
      // Binary search for optimal quality
      let minQuality = 0.01;
      let maxQuality = 1.0;
      let bestBlob = null;
      let iterations = 0;
      let finalQuality = 0;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0);

      // First try with max quality
      let blob = await this.canvasToBlob(canvas, mimeType, maxQuality);
      iterations++;
      this.updateProgress(10, `嘗試品質 ${Math.round(maxQuality * 100)}%...`);

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        finalQuality = maxQuality;
      } else {
        // Binary search
        while (maxQuality - minQuality > 0.01 && iterations < 20) {
          const midQuality = (minQuality + maxQuality) / 2;
          blob = await this.canvasToBlob(canvas, mimeType, midQuality);
          iterations++;

          const progress = 10 + (iterations / 20) * 80;
          this.updateProgress(progress, `嘗試品質 ${Math.round(midQuality * 100)}%... (${this.formatFileSize(blob.size)})`);

          if (blob.size <= targetBytes) {
            bestBlob = blob;
            finalQuality = midQuality;
            minQuality = midQuality;
          } else {
            maxQuality = midQuality;
          }

          await new Promise(r => setTimeout(r, 50)); // Allow UI update
        }

        // If still no valid blob, use lowest quality
        if (!bestBlob) {
          blob = await this.canvasToBlob(canvas, mimeType, minQuality);
          iterations++;
          if (blob.size <= targetBytes) {
            bestBlob = blob;
            finalQuality = minQuality;
          } else {
            // Need to resize
            bestBlob = await this.compressWithResize(canvas, ctx, mimeType, targetBytes);
            finalQuality = 0.5;
            iterations += 5;
          }
        }
      }

      if (!bestBlob) {
        throw new Error('無法達到目標大小');
      }

      this.convertedBlob = bestBlob;
      const endTime = performance.now();

      // Update UI
      this.updateProgress(100, '壓縮完成！');
      document.getElementById('convertedImage').src = URL.createObjectURL(bestBlob);
      this.convertedSizeSpan.textContent = this.formatFileSize(bestBlob.size);

      // Performance info
      this.processTimeSpan.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.iterationsSpan.textContent = `${iterations} 次`;
      this.finalQualitySpan.textContent = `${Math.round(finalQuality * 100)}%`;
      this.targetSizeInfoSpan.textContent = this.formatFileSize(targetBytes);
      this.actualSizeSpan.textContent = this.formatFileSize(bestBlob.size);
      const saved = ((1 - bestBlob.size / this.originalFile.size) * 100).toFixed(1);
      this.savedSpaceSpan.textContent = `${saved}%`;
      this.performanceInfo.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `壓縮完成！檔案大小：${this.formatFileSize(bestBlob.size)}`);

    } catch (error) {
      this.showStatus('error', `壓縮失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  async compressWithResize(canvas, ctx, mimeType, targetBytes) {
    // Try progressively smaller sizes
    let scale = 0.9;
    let blob = null;
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    while (scale >= 0.1) {
      const newWidth = Math.round(originalWidth * scale);
      const newHeight = Math.round(originalHeight * scale);

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(this.originalImage, 0, 0, newWidth, newHeight);

      blob = await this.canvasToBlob(canvas, mimeType, 0.7);

      if (blob.size <= targetBytes) {
        return blob;
      }

      scale -= 0.1;
    }

    // Return smallest possible
    return blob;
  }

  canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const format = this.outputFormatSelect.value;
    const ext = format === 'webp' ? 'webp' : 'jpg';
    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_compressed.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.fileInput.value = '';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.originalSizeSpan.textContent = '-';
    this.convertedSizeSpan.textContent = '-';
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new TargetSizeCompressor();
});
