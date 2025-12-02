/**
 * IMG-011: Batch Image Format Converter
 *
 * Converts multiple images to a unified format simultaneously.
 * Supports parallel processing for improved performance.
 *
 * Technical Implementation:
 * 1. Accept multiple files via drag-drop or file picker
 * 2. Process files in parallel using Promise.all
 * 3. Track progress for each file
 * 4. Provide individual and batch download options
 *
 * Features:
 * - Multi-file upload
 * - Unified output format (PNG, JPG, WebP)
 * - Quality control for lossy formats
 * - Progress tracking per file
 * - Batch download
 *
 * Performance: Parallel processing, ~0.5-2 seconds per image
 */

class BatchConverter {
  constructor() {
    this.files = [];
    this.convertedFiles = [];
    this.quality = 0.92;
    this.outputFormat = 'jpg';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.qualityRow = document.getElementById('qualityRow');
    this.fileListContainer = document.getElementById('fileListContainer');
    this.fileList = document.getElementById('fileList');
    this.fileCount = document.getElementById('fileCount');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.successCount = document.getElementById('successCount');
    this.originalTotal = document.getElementById('originalTotal');
    this.convertedTotal = document.getElementById('convertedTotal');
    this.savedSpace = document.getElementById('savedSpace');

    this.bindEvents();
    this.updateQualityVisibility();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      this.addFiles(files);
    });

    this.outputFormatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.updateQualityVisibility();
    });

    this.qualitySlider.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      this.qualityValue.textContent = `${e.target.value}%`;
    });

    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateQualityVisibility() {
    this.qualityRow.style.display = this.outputFormat === 'png' ? 'none' : 'flex';
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.addFiles(files);
  }

  addFiles(files) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'];

    const validFiles = files.filter(file => validTypes.includes(file.type));

    if (validFiles.length !== files.length) {
      this.showStatus('warning', `已過濾 ${files.length - validFiles.length} 個不支援的檔案`);
    }

    if (validFiles.length === 0) {
      this.showStatus('error', '請選擇有效的圖片檔案');
      return;
    }

    // Add to existing files
    this.files = [...this.files, ...validFiles];
    this.updateFileList();
    this.convertBtn.disabled = false;
    this.showStatus('info', `已選擇 ${this.files.length} 個檔案`);
  }

  updateFileList() {
    this.fileList.innerHTML = '';
    this.fileCount.textContent = this.files.length;

    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-list-item';
      item.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <span class="file-status" id="status-${index}">待轉換</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;

      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        this.removeFile(parseInt(e.target.dataset.index));
      });

      this.fileList.appendChild(item);
    });

    this.fileListContainer.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  removeFile(index) {
    this.files.splice(index, 1);
    this.updateFileList();

    if (this.files.length === 0) {
      this.convertBtn.disabled = true;
    }
  }

  async convert() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇圖片檔案');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;
    this.convertedFiles = [];

    let completed = 0;
    let successful = 0;
    let originalTotalSize = 0;
    let convertedTotalSize = 0;

    try {
      // Process files with concurrency limit
      const concurrency = 4;
      const chunks = this.chunkArray(this.files, concurrency);

      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(async (file, chunkIndex) => {
            const globalIndex = this.files.indexOf(file);
            this.updateFileStatus(globalIndex, '轉換中...');

            try {
              const result = await this.convertFile(file);
              this.updateFileStatus(globalIndex, '✓ 完成');
              originalTotalSize += file.size;
              convertedTotalSize += result.blob.size;
              successful++;
              return result;
            } catch (error) {
              this.updateFileStatus(globalIndex, '✗ 失敗');
              console.error(`Failed to convert ${file.name}:`, error);
              return null;
            } finally {
              completed++;
              const progress = (completed / this.files.length) * 100;
              this.updateProgress(progress, `轉換中 ${completed}/${this.files.length}...`);
            }
          })
        );

        this.convertedFiles.push(...results.filter(r => r !== null));
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const savedPercent = ((1 - convertedTotalSize / originalTotalSize) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.successCount.textContent = `${successful}/${this.files.length}`;
      this.originalTotal.textContent = this.formatFileSize(originalTotalSize);
      this.convertedTotal.textContent = this.formatFileSize(convertedTotalSize);
      this.savedSpace.textContent = savedPercent > 0
        ? `${savedPercent}% 減少`
        : `${Math.abs(savedPercent)}% 增加`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '批量轉換完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `成功轉換 ${successful}/${this.files.length} 個檔案`);
        this.downloadAllBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Batch conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '批量轉換發生錯誤');
      this.convertBtn.disabled = false;
    }
  }

  async convertFile(file) {
    const img = await this.loadImage(file);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Fill white background for JPG
    if (this.outputFormat === 'jpg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const mimeType = this.getMimeType(this.outputFormat);
    const quality = this.outputFormat === 'png' ? undefined : this.quality;

    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));

    const originalName = file.name.replace(/\.[^.]+$/, '');
    const extension = this.outputFormat === 'jpg' ? 'jpg' : this.outputFormat;

    return {
      blob,
      filename: `${originalName}.${extension}`,
      originalFile: file
    };
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  getMimeType(format) {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'webp': 'image/webp'
    };
    return mimeTypes[format] || 'image/png';
  }

  updateFileStatus(index, status) {
    const statusEl = document.getElementById(`status-${index}`);
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = `file-status ${status.includes('✓') ? 'success' : status.includes('✗') ? 'error' : ''}`;
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  async downloadAll() {
    if (this.convertedFiles.length === 0) return;

    this.showStatus('info', '正在準備下載...');

    // Download files individually with small delay
    for (let i = 0; i < this.convertedFiles.length; i++) {
      const file = this.convertedFiles[i];
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file.blob);
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // Small delay between downloads
      if (i < this.convertedFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    this.showStatus('success', `已下載 ${this.convertedFiles.length} 個檔案`);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.convertedFiles = [];

    this.fileList.innerHTML = '';
    this.fileListContainer.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    this.outputFormatSelect.value = 'jpg';
    this.outputFormat = 'jpg';
    this.qualitySlider.value = 92;
    this.qualityValue.textContent = '92%';
    this.quality = 0.92;
    this.updateQualityVisibility();
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

    if (type === 'success' || type === 'warning') {
      setTimeout(() => {
        this.statusMessage.classList.remove('active');
      }, 3000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.converter = new BatchConverter();
});

export default BatchConverter;
