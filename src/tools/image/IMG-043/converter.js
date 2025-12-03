/**
 * IMG-043 清除 EXIF 資訊
 * 移除圖片所有 EXIF 資訊以保護隱私
 */

class ExifRemoverTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.keepColorProfile = document.getElementById('keepColorProfile');
    this.keepOrientation = document.getElementById('keepOrientation');

    this.originalPreview = document.getElementById('originalPreview');
    this.resultPreview = document.getElementById('resultPreview');
    this.originalInfo = document.getElementById('originalInfo');
    this.resultInfo = document.getElementById('resultInfo');
    this.originalExifStatus = document.getElementById('originalExifStatus');
    this.resultExifStatus = document.getElementById('resultExifStatus');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
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
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.removeExif());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      this.showStatus('error', '僅支援 JPG、PNG、WebP 格式');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalPreview.src = e.target.result;

        // Check if has EXIF (for JPEG)
        const hasExif = this.checkForExif(e.target.result);

        this.originalInfo.textContent = `${img.width} × ${img.height} | ${this.formatSize(file.size)}`;

        if (hasExif) {
          this.originalExifStatus.className = 'exif-status has-exif';
          this.originalExifStatus.innerHTML = '<span>⚠️</span><span>包含 EXIF 資訊</span>';
        } else {
          this.originalExifStatus.className = 'exif-status no-exif';
          this.originalExifStatus.innerHTML = '<span>✓</span><span>無 EXIF 資訊</span>';
        }

        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.convertBtn.disabled = false;
        this.resultPreview.src = '';
        this.resultInfo.textContent = '';
        this.resultExifStatus.style.display = 'none';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkForExif(dataUrl) {
    // Simple check for EXIF marker in JPEG
    if (!dataUrl.startsWith('data:image/jpeg')) {
      return false;
    }

    try {
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);

      // Look for EXIF marker (0xFFE1)
      for (let i = 0; i < Math.min(binary.length - 1, 65535); i++) {
        if (binary.charCodeAt(i) === 0xFF && binary.charCodeAt(i + 1) === 0xE1) {
          return true;
        }
      }
    } catch (e) {
      console.error('EXIF check error:', e);
    }

    return false;
  }

  async removeExif() {
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.updateProgress(10, '準備處理圖片...');

    try {
      const format = document.querySelector('input[name="format"]:checked').value;
      const keepOrientation = this.keepOrientation.checked;

      this.updateProgress(30, '讀取圖片資訊...');

      // Get orientation if needed
      let orientation = 1;
      if (keepOrientation && this.originalFile.type === 'image/jpeg') {
        orientation = await this.getOrientation(this.originalFile);
      }

      this.updateProgress(50, '重新繪製圖片（去除 EXIF）...');

      // Create canvas and draw image without EXIF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Handle orientation
      let width = this.originalImage.width;
      let height = this.originalImage.height;

      if (keepOrientation && [5, 6, 7, 8].includes(orientation)) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      // Apply orientation transform
      if (keepOrientation) {
        this.applyOrientation(ctx, orientation, width, height);
      }

      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(80, '生成乾淨圖片...');

      // Convert to blob
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = format === 'png' ? 1 : 0.92;

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.resultBlob = blob;

      this.updateProgress(100, '完成！');

      // Show result
      const resultUrl = URL.createObjectURL(blob);
      this.resultPreview.src = resultUrl;
      this.resultInfo.textContent = `${canvas.width} × ${canvas.height} | ${this.formatSize(blob.size)}`;
      this.resultExifStatus.style.display = 'flex';

      this.progressContainer.style.display = 'none';
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      const savings = this.originalFile.size - blob.size;
      const savingsPercent = ((savings / this.originalFile.size) * 100).toFixed(1);

      if (savings > 0) {
        this.showStatus('success', `EXIF 已清除！檔案減少 ${this.formatSize(savings)} (${savingsPercent}%)`);
      } else {
        this.showStatus('success', 'EXIF 已清除！');
      }

    } catch (error) {
      console.error('Remove EXIF error:', error);
      this.showStatus('error', `處理失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.convertBtn.disabled = false;
  }

  async getOrientation(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const view = new DataView(e.target.result);

        if (view.getUint16(0, false) !== 0xFFD8) {
          resolve(1);
          return;
        }

        let offset = 2;
        while (offset < view.byteLength) {
          if (view.getUint16(offset, false) === 0xFFE1) {
            const exifStart = offset + 4;
            if (view.getUint32(exifStart, false) !== 0x45786966) {
              resolve(1);
              return;
            }

            const tiffStart = exifStart + 6;
            const littleEndian = view.getUint16(tiffStart, false) === 0x4949;

            const ifdStart = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
            const numEntries = view.getUint16(ifdStart, littleEndian);

            for (let i = 0; i < numEntries; i++) {
              const entryOffset = ifdStart + 2 + i * 12;
              if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
                resolve(view.getUint16(entryOffset + 8, littleEndian));
                return;
              }
            }
            resolve(1);
            return;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
        resolve(1);
      };
      reader.readAsArrayBuffer(file.slice(0, 65536));
    });
  }

  applyOrientation(ctx, orientation, width, height) {
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, height, width); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
    }
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

    const format = document.querySelector('input[name="format"]:checked').value;
    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';
    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_clean.${ext}`;
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
    this.convertBtn.disabled = true;
    this.progressContainer.style.display = 'none';

    this.originalPreview.src = '';
    this.resultPreview.src = '';
    this.originalInfo.textContent = '';
    this.resultInfo.textContent = '';

    this.keepColorProfile.checked = false;
    this.keepOrientation.checked = false;
    document.getElementById('formatJpg').checked = true;

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
  new ExifRemoverTool();
});
