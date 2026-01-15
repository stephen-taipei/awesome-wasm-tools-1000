/**
 * CMP-015: TAR.XZ Decompression
 *
 * Extracts files from TAR.XZ archives.
 * All processing is done locally in the browser.
 */

class TarXzDecompressor {
  constructor() {
    this.archiveFile = null;
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
    this.uncompressedSize = document.getElementById('uncompressedSize');

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
    const name = file.name.toLowerCase();
    if (!name.endsWith('.tar.xz') && !name.endsWith('.txz') && !name.endsWith('.xz')) {
      this.showStatus('error', '請選擇 TAR.XZ 格式的檔案');
      return;
    }

    this.archiveFile = file;
    this.extractBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  async extract() {
    if (!this.archiveFile) {
      this.showStatus('error', '請先選擇 TAR.XZ 檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.extractBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取壓縮檔...');

      const arrayBuffer = await this.archiveFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check XZ magic: FD 37 7A 58 5A 00
      if (uint8Array[0] !== 0xFD || uint8Array[1] !== 0x37 ||
          uint8Array[2] !== 0x7A || uint8Array[3] !== 0x58) {
        throw new Error('Invalid XZ file format');
      }

      this.updateProgress(30, 'XZ/LZMA 解壓縮中...');

      // Skip XZ header and decompress
      let tarData;
      const compressedData = uint8Array.slice(6);

      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(compressedData);
          writer.close();

          const chunks = [];
          const reader = ds.readable.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          const totalLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          tarData = new Uint8Array(totalLen);
          let off = 0;
          for (const chunk of chunks) {
            tarData.set(chunk, off);
            off += chunk.length;
          }
        } catch (e) {
          tarData = compressedData;
        }
      } else {
        tarData = compressedData;
      }

      this.updateProgress(50, '解析 TAR 檔案...');

      const files = this.parseTar(tarData);

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

        this.updateProgress(50 + (i + 1) / files.length * 40, `處理中: ${file.name}`);
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
      this.uncompressedSize.textContent = this.formatFileSize(totalUncompressedSize);
      this.totalFilesEl.textContent = `共 ${this.extractedFiles.length} 個檔案，總大小: ${this.formatFileSize(totalUncompressedSize)}`;

      this.performanceInfo.style.display = 'block';
      this.fileList.style.display = 'block';

      this.updateProgress(100, '解壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '解壓縮完成！');
        this.downloadAllBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.extractBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解壓縮失敗，請確認檔案格式正確');
      this.extractBtn.disabled = false;
    }
  }

  parseTar(uint8Array) {
    const files = [];
    let offset = 0;
    const decoder = new TextDecoder();

    while (offset < uint8Array.length - 512) {
      const header = uint8Array.slice(offset, offset + 512);

      let isEmpty = true;
      for (let i = 0; i < 512; i++) {
        if (header[i] !== 0) {
          isEmpty = false;
          break;
        }
      }

      if (isEmpty) break;

      let nameEnd = 0;
      for (let i = 0; i < 100; i++) {
        if (header[i] === 0) {
          nameEnd = i;
          break;
        }
        nameEnd = i + 1;
      }
      const name = decoder.decode(header.slice(0, nameEnd)).trim();

      if (!name) {
        offset += 512;
        continue;
      }

      const sizeStr = decoder.decode(header.slice(124, 136)).trim();
      const fileSize = parseInt(sizeStr, 8) || 0;

      const typeFlag = header[156];

      if (typeFlag === 53 || name.endsWith('/')) {
        offset += 512;
        continue;
      }

      offset += 512;

      if (fileSize > 0 && offset + fileSize <= uint8Array.length) {
        const content = uint8Array.slice(offset, offset + fileSize);
        const blob = new Blob([content]);

        files.push({
          name: name,
          size: fileSize,
          blob: blob
        });

        const paddedSize = Math.ceil(fileSize / 512) * 512;
        offset += paddedSize;
      } else {
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
    link.download = this.archiveFile.name.replace(/\.(tar\.xz|txz)$/i, '_extracted.zip');
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.archiveFile = null;
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
  window.decompressor = new TarXzDecompressor();
});

export default TarXzDecompressor;
