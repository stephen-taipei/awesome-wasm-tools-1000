/**
 * IMG-044 批量清除 EXIF
 * 批量移除多張圖片的 EXIF 資訊
 */

class BatchExifRemoverTool {
  constructor() {
    this.files = [];
    this.results = [];
    this.zipBlob = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.fileList = document.getElementById('fileList');
    this.fileItems = document.getElementById('fileItems');
    this.fileCount = document.getElementById('fileCount');

    this.keepOrientation = document.getElementById('keepOrientation');

    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.resultSummary = document.getElementById('resultSummary');
    this.statProcessed = document.getElementById('statProcessed');
    this.statOriginalSize = document.getElementById('statOriginalSize');
    this.statNewSize = document.getElementById('statNewSize');
    this.statSaved = document.getElementById('statSaved');

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
      this.addFiles(e.dataTransfer.files);
    });
    this.fileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Action buttons
    this.processBtn.addEventListener('click', () => this.processAll());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  addFiles(fileList) {
    for (const file of fileList) {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        continue;
      }

      // Check for duplicates
      if (this.files.some(f => f.file.name === file.name && f.file.size === file.size)) {
        continue;
      }

      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      this.files.push({
        id,
        file,
        status: 'pending',
        thumb: null,
        result: null
      });
    }

    this.renderFileList();
    this.updateUI();
  }

  renderFileList() {
    this.fileItems.innerHTML = '';

    this.files.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.id = `file-${item.id}`;

      // Create thumbnail
      if (!item.thumb) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.thumb = e.target.result;
          const img = div.querySelector('.file-thumb');
          if (img) img.src = item.thumb;
        };
        reader.readAsDataURL(item.file);
      }

      div.innerHTML = `
        <img class="file-thumb" src="${item.thumb || ''}" alt="${item.file.name}">
        <div class="file-info">
          <div class="file-name">${item.file.name}</div>
          <div class="file-size">${this.formatSize(item.file.size)}</div>
        </div>
        <span class="file-status ${item.status}">${this.getStatusText(item.status)}</span>
        <button class="file-remove" data-id="${item.id}">×</button>
      `;

      div.querySelector('.file-remove').addEventListener('click', () => {
        this.removeFile(item.id);
      });

      this.fileItems.appendChild(div);
    });

    this.fileCount.textContent = `${this.files.length} 張`;
  }

  removeFile(id) {
    this.files = this.files.filter(f => f.id !== id);
    this.renderFileList();
    this.updateUI();
  }

  getStatusText(status) {
    switch (status) {
      case 'pending': return '等待中';
      case 'processing': return '處理中...';
      case 'done': return '已完成';
      case 'error': return '失敗';
      default: return status;
    }
  }

  updateUI() {
    const hasFiles = this.files.length > 0;
    this.optionsPanel.style.display = hasFiles ? 'block' : 'none';
    this.fileList.style.display = hasFiles ? 'block' : 'none';
    this.processBtn.disabled = !hasFiles;
  }

  async processAll() {
    this.progressContainer.style.display = 'block';
    this.processBtn.disabled = true;
    this.results = [];

    const format = document.querySelector('input[name="format"]:checked').value;
    const keepOrientation = this.keepOrientation.checked;

    let totalOriginalSize = 0;
    let totalNewSize = 0;

    for (let i = 0; i < this.files.length; i++) {
      const item = this.files[i];
      item.status = 'processing';
      this.updateFileStatus(item.id, 'processing');

      const percent = ((i + 1) / this.files.length * 100).toFixed(0);
      this.updateProgress(percent, `處理中 ${i + 1}/${this.files.length}：${item.file.name}`);

      try {
        const result = await this.processFile(item.file, format, keepOrientation);
        item.result = result;
        item.status = 'done';
        this.updateFileStatus(item.id, 'done');

        totalOriginalSize += item.file.size;
        totalNewSize += result.blob.size;

        this.results.push({
          name: result.name,
          blob: result.blob
        });

      } catch (error) {
        console.error('Process error:', error);
        item.status = 'error';
        this.updateFileStatus(item.id, 'error');
      }
    }

    this.progressContainer.style.display = 'none';

    // Create ZIP
    await this.createZip();

    // Show summary
    this.statProcessed.textContent = this.results.length;
    this.statOriginalSize.textContent = this.formatSize(totalOriginalSize);
    this.statNewSize.textContent = this.formatSize(totalNewSize);

    const savedPercent = totalOriginalSize > 0 ?
      ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1) : 0;
    this.statSaved.textContent = `${savedPercent}%`;

    this.resultSummary.style.display = 'block';
    this.downloadBtn.style.display = 'inline-flex';
    this.resetBtn.style.display = 'inline-flex';

    this.showStatus('success', `成功處理 ${this.results.length} 張圖片，EXIF 已全部清除`);
  }

  async processFile(file, format, keepOrientation) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const img = new Image();

          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = e.target.result;
          });

          // Get orientation if needed
          let orientation = 1;
          if (keepOrientation && file.type === 'image/jpeg') {
            orientation = await this.getOrientation(file);
          }

          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;

          if (keepOrientation && [5, 6, 7, 8].includes(orientation)) {
            canvas.width = height;
            canvas.height = width;
          } else {
            canvas.width = width;
            canvas.height = height;
          }

          if (keepOrientation) {
            this.applyOrientation(ctx, orientation, width, height);
          }

          ctx.drawImage(img, 0, 0);

          // Determine output format
          let mimeType, ext;
          if (format === 'original') {
            if (file.type === 'image/png') {
              mimeType = 'image/png';
              ext = 'png';
            } else {
              mimeType = 'image/jpeg';
              ext = 'jpg';
            }
          } else if (format === 'png') {
            mimeType = 'image/png';
            ext = 'png';
          } else {
            mimeType = 'image/jpeg';
            ext = 'jpg';
          }

          const quality = mimeType === 'image/png' ? 1 : 0.92;

          const blob = await new Promise((res) => {
            canvas.toBlob(res, mimeType, quality);
          });

          const baseName = file.name.replace(/\.[^/.]+$/, '');

          resolve({
            name: `${baseName}_clean.${ext}`,
            blob
          });

        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  updateFileStatus(id, status) {
    const item = document.querySelector(`#file-${id} .file-status`);
    if (item) {
      item.className = `file-status ${status}`;
      item.textContent = this.getStatusText(status);
    }
  }

  async createZip() {
    const zip = new JSZip();

    for (const result of this.results) {
      zip.file(result.name, result.blob);
    }

    this.zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  downloadZip() {
    if (!this.zipBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.zipBlob);
    link.download = `exif_removed_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'ZIP 已下載');
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

  reset() {
    this.files = [];
    this.results = [];
    this.zipBlob = null;

    this.fileInput.value = '';
    this.fileItems.innerHTML = '';
    this.optionsPanel.style.display = 'none';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.processBtn.disabled = true;
    this.progressContainer.style.display = 'none';
    this.resultSummary.style.display = 'none';

    this.keepOrientation.checked = false;
    document.getElementById('formatOriginal').checked = true;

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
  new BatchExifRemoverTool();
});
