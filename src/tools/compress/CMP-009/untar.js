/**
 * CMP-009: TAR Unpacker
 *
 * Extracts files from TAR archives.
 * All processing is done locally in the browser.
 */

class TarUnpacker {
  constructor() {
    this.tarFile = null;
    this.extractedFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.extractedFilesList = document.getElementById('extractedFiles');
    this.totalFilesEl = document.getElementById('totalFiles');
    this.extractBtn = document.getElementById('extractBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.fileCount = document.getElementById('fileCount');
    this.totalSize = document.getElementById('totalSize');

    this.bindEvents();
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
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    this.extractBtn.addEventListener('click', () => this.extract());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    if (!file.name.toLowerCase().endsWith('.tar')) {
      this.showStatus('error', '請選擇 TAR 格式的檔案');
      return;
    }

    this.tarFile = file;
    this.extractBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  async extract() {
    if (!this.tarFile) {
      this.showStatus('error', '請先選擇 TAR 檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.extractBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取 TAR 檔案...');

      const arrayBuffer = await this.tarFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.updateProgress(30, '解析內容...');

      const files = this.parseTar(uint8Array);

      this.extractedFilesList.innerHTML = '';
      let totalUncompressedSize = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        totalUncompressedSize += file.size;

        this.extractedFiles.push(file);

        const li = document.createElement('li');
        li.innerHTML = `
          <span class="file-name">${file.name}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
          <button class="download-btn" data-index="${i}">下載</button>
        `;
        this.extractedFilesList.appendChild(li);

        this.updateProgress(30 + (i + 1) / files.length * 60, `處理中: ${file.name}`);
      }

      this.extractedFilesList.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);
          this.downloadFile(index);
        });
      });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.fileCount.textContent = `${this.extractedFiles.length} 個檔案`;
      this.totalSize.textContent = this.formatFileSize(totalUncompressedSize);
      this.totalFilesEl.textContent = `共 ${this.extractedFiles.length} 個檔案，總大小: ${this.formatFileSize(totalUncompressedSize)}`;

      this.performanceInfo.style.display = 'block';
      this.fileList.style.display = 'block';

      this.updateProgress(100, '解包完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '解包完成！');
        this.downloadAllBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.extractBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解包失敗，請確認檔案格式正確');
      this.extractBtn.disabled = false;
    }
  }

  parseTar(uint8Array) {
    const files = [];
    let offset = 0;
    const decoder = new TextDecoder();

    while (offset < uint8Array.length - 512) {
      // Read header
      const header = uint8Array.slice(offset, offset + 512);

      // Check if this is an empty block (end of archive)
      let isEmpty = true;
      for (let i = 0; i < 512; i++) {
        if (header[i] !== 0) {
          isEmpty = false;
          break;
        }
      }

      if (isEmpty) {
        break;
      }

      // Parse file name (0-99)
      let nameEnd = 0;
      for (let i = 0; i < 100; i++) {
        if (header[i] === 0) {
          nameEnd = i;
          break;
        }
        nameEnd = i + 1;
      }
      const name = decoder.decode(header.slice(0, nameEnd)).trim();

      // Skip if no name (invalid entry)
      if (!name) {
        offset += 512;
        continue;
      }

      // Parse file size (124-135) - octal string
      const sizeStr = decoder.decode(header.slice(124, 136)).trim();
      const fileSize = parseInt(sizeStr, 8) || 0;

      // Get type flag (156)
      const typeFlag = header[156];

      // Skip directories (typeFlag === 53 is '5')
      if (typeFlag === 53 || name.endsWith('/')) {
        offset += 512;
        continue;
      }

      // Move to file content
      offset += 512;

      if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
        // Extract file content
        const content = uint8Array.slice(offset, offset + fileSize);
        const blob = new Blob([content]);

        files.push({
          name: name,
          size: fileSize,
          blob: blob
        });

        // Move past content and padding
        const paddedSize = Math.ceil(fileSize / 512) * 512;
        offset += paddedSize;
      } else {
        // Invalid file size or offset
        break;
      }
    }

    return files;
  }

  downloadFile(index) {
    const file = this.extractedFiles[index];
    if (!file) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.name.split('/').pop();
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async downloadAll() {
    if (this.extractedFiles.length === 0) return;

    const zip = new JSZip();

    for (const file of this.extractedFiles) {
      zip.file(file.name, file.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = this.tarFile.name.replace('.tar', '_extracted.zip');
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.tarFile = null;
    this.extractedFiles = [];
    this.extractedFilesList.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.extractBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
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
  window.unpacker = new TarUnpacker();
});

export default TarUnpacker;
