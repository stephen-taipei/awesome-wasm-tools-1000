/**
 * IMG-020 批量縮放
 * 批量調整多張圖片至相同尺寸
 */

class BatchResizer {
  constructor() {
    this.files = [];
    this.processedFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.fileListPanel = document.getElementById('fileListPanel');
    this.fileList = document.getElementById('fileList');
    this.fileCount = document.getElementById('fileCount');
    this.clearAllBtn = document.getElementById('clearAllBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.batchStats = document.getElementById('batchStats');

    // Settings
    this.resizeModeSelect = document.getElementById('resizeMode');
    this.dimensionSettings = document.getElementById('dimensionSettings');
    this.percentageSettings = document.getElementById('percentageSettings');
    this.maxSizeSettings = document.getElementById('maxSizeSettings');
    this.widthInput = document.getElementById('widthInput');
    this.heightInput = document.getElementById('heightInput');
    this.percentageSlider = document.getElementById('percentageSlider');
    this.percentageValue = document.getElementById('percentageValue');
    this.maxSizeInput = document.getElementById('maxSizeInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.presetButtons = document.querySelectorAll('.preset-btn');

    // Stats
    this.totalCountSpan = document.getElementById('totalCount');
    this.completedCountSpan = document.getElementById('completedCount');
    this.failedCountSpan = document.getElementById('failedCount');
    this.savedSizeSpan = document.getElementById('savedSize');

    this.bindEvents();
    this.updateModeUI();
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
      this.addFiles(e.dataTransfer.files);
    });
    this.fileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Mode change
    this.resizeModeSelect.addEventListener('change', () => this.updateModeUI());

    // Sliders
    this.percentageSlider.addEventListener('input', () => {
      this.percentageValue.textContent = `${this.percentageSlider.value}%`;
    });
    this.qualitySlider.addEventListener('input', () => {
      this.qualityValue.textContent = `${this.qualitySlider.value}%`;
    });

    // Preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.widthInput.value = btn.dataset.width;
        this.heightInput.value = btn.dataset.height;
        if (this.resizeModeSelect.value !== 'dimensions') {
          this.resizeModeSelect.value = 'dimensions';
          this.updateModeUI();
        }
      });
    });

    // Clear all
    this.clearAllBtn.addEventListener('click', () => this.clearAll());

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.process());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateModeUI() {
    const mode = this.resizeModeSelect.value;

    this.dimensionSettings.style.display = 'none';
    this.percentageSettings.style.display = 'none';
    this.maxSizeSettings.style.display = 'none';

    switch (mode) {
      case 'dimensions':
        this.dimensionSettings.style.display = 'block';
        break;
      case 'percentage':
        this.percentageSettings.style.display = 'flex';
        break;
      case 'width':
        this.dimensionSettings.style.display = 'block';
        document.querySelector('#dimensionSettings .setting-row:last-child').style.display = 'none';
        break;
      case 'height':
        this.dimensionSettings.style.display = 'block';
        document.querySelector('#dimensionSettings .setting-row:first-child').style.display = 'none';
        break;
      case 'maxSize':
        this.maxSizeSettings.style.display = 'flex';
        break;
    }

    // Reset dimension visibility
    if (mode === 'dimensions') {
      document.querySelectorAll('#dimensionSettings .setting-row').forEach(row => {
        row.style.display = 'flex';
      });
    }
  }

  addFiles(fileList) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];

    for (const file of fileList) {
      if (!validTypes.includes(file.type)) continue;
      if (this.files.some(f => f.name === file.name && f.size === file.size)) continue;

      this.files.push(file);
    }

    this.updateFileList();
    this.convertBtn.disabled = this.files.length === 0;

    if (this.files.length > 0) {
      this.showStatus('success', `已選擇 ${this.files.length} 個檔案`);
    }
  }

  updateFileList() {
    this.fileCount.textContent = this.files.length;
    this.fileListPanel.style.display = this.files.length > 0 ? 'block' : 'none';

    this.fileList.innerHTML = this.files.map((file, index) => {
      const url = URL.createObjectURL(file);
      return `
        <div class="file-item" data-index="${index}">
          <img src="${url}" alt="${file.name}">
          <div class="info">
            <div class="name">${file.name}</div>
            <div class="meta">${this.formatFileSize(file.size)}</div>
          </div>
          <span class="status pending" data-status="${index}">待處理</span>
          <button class="remove-btn" data-remove="${index}">×</button>
        </div>
      `;
    }).join('');

    // Add remove handlers
    this.fileList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.remove);
        this.files.splice(index, 1);
        this.updateFileList();
        this.convertBtn.disabled = this.files.length === 0;
      });
    });
  }

  clearAll() {
    this.files = [];
    this.updateFileList();
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';
  }

  getTargetDimensions(originalWidth, originalHeight) {
    const mode = this.resizeModeSelect.value;
    let width, height;

    switch (mode) {
      case 'dimensions':
        width = parseInt(this.widthInput.value) || 800;
        height = parseInt(this.heightInput.value) || 600;
        break;

      case 'percentage':
        const scale = parseInt(this.percentageSlider.value) / 100;
        width = Math.round(originalWidth * scale);
        height = Math.round(originalHeight * scale);
        break;

      case 'width':
        width = parseInt(this.widthInput.value) || 800;
        height = Math.round(width * (originalHeight / originalWidth));
        break;

      case 'height':
        height = parseInt(this.heightInput.value) || 600;
        width = Math.round(height * (originalWidth / originalHeight));
        break;

      case 'maxSize':
        const maxSize = parseInt(this.maxSizeInput.value) || 1920;
        if (originalWidth > originalHeight) {
          width = Math.min(maxSize, originalWidth);
          height = Math.round(width * (originalHeight / originalWidth));
        } else {
          height = Math.min(maxSize, originalHeight);
          width = Math.round(height * (originalWidth / originalHeight));
        }
        break;

      default:
        width = originalWidth;
        height = originalHeight;
    }

    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  async process() {
    if (this.files.length === 0) return;

    this.progressContainer.style.display = 'block';
    this.batchStats.style.display = 'flex';
    this.convertBtn.disabled = true;
    this.processedFiles = [];

    let completed = 0;
    let failed = 0;
    let totalOriginalSize = 0;
    let totalNewSize = 0;

    this.totalCountSpan.textContent = this.files.length;
    this.completedCountSpan.textContent = '0';
    this.failedCountSpan.textContent = '0';

    for (let i = 0; i < this.files.length; i++) {
      const file = this.files[i];
      const statusEl = document.querySelector(`[data-status="${i}"]`);

      if (statusEl) {
        statusEl.textContent = '處理中...';
        statusEl.className = 'status processing';
      }

      const progress = ((i + 1) / this.files.length * 100).toFixed(0);
      this.updateProgress(progress, `處理中 ${i + 1}/${this.files.length}: ${file.name}`);

      try {
        const result = await this.resizeImage(file);
        this.processedFiles.push({
          name: file.name,
          blob: result.blob,
          ext: result.ext
        });

        totalOriginalSize += file.size;
        totalNewSize += result.blob.size;
        completed++;

        if (statusEl) {
          statusEl.textContent = '完成';
          statusEl.className = 'status done';
        }
      } catch (error) {
        failed++;
        if (statusEl) {
          statusEl.textContent = '失敗';
          statusEl.className = 'status error';
        }
      }

      this.completedCountSpan.textContent = completed;
      this.failedCountSpan.textContent = failed;
    }

    // Calculate saved space
    const savedPercent = totalOriginalSize > 0
      ? ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1)
      : 0;
    this.savedSizeSpan.textContent = `${savedPercent}%`;

    this.progressContainer.style.display = 'none';

    if (this.processedFiles.length > 0) {
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `批量處理完成！成功 ${completed} 個，失敗 ${failed} 個`);
    } else {
      this.showStatus('error', '所有檔案處理失敗');
      this.convertBtn.disabled = false;
    }
  }

  resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const { width, height } = this.getTargetDimensions(img.naturalWidth, img.naturalHeight);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Get output format
            let mimeType, ext;
            const format = this.outputFormatSelect.value;
            if (format === 'original') {
              mimeType = file.type;
              ext = file.name.split('.').pop();
            } else {
              mimeType = format === 'png' ? 'image/png' :
                         format === 'webp' ? 'image/webp' : 'image/jpeg';
              ext = format;
            }

            const quality = mimeType === 'image/png' ? undefined :
                           parseInt(this.qualitySlider.value) / 100;

            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ blob, ext });
              } else {
                reject(new Error('Failed to create blob'));
              }
            }, mimeType, quality);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async download() {
    if (this.processedFiles.length === 0) return;

    this.showStatus('info', '正在打包 ZIP...');

    try {
      const zip = new JSZip();

      for (const file of this.processedFiles) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        zip.file(`${baseName}_resized.${file.ext}`, file.blob);
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `batch_resized_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', 'ZIP 下載完成！');
    } catch (error) {
      this.showStatus('error', `打包失敗：${error.message}`);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  reset() {
    this.files = [];
    this.processedFiles = [];
    this.fileInput.value = '';
    this.updateFileList();
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.batchStats.style.display = 'none';
    this.convertBtn.disabled = true;
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
  new BatchResizer();
});
