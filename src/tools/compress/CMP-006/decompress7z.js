/**
 * CMP-006: 7z Decompression
 *
 * Extracts files from 7z archives created by CMP-005.
 * All processing is done locally in the browser.
 */

class SevenZipDecompressor {
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
    this.totalFiles = document.getElementById('totalFiles');
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
    if (!file.name.toLowerCase().endsWith('.7z')) {
      this.showStatus('error', '請選擇 7z 格式的檔案');
      return;
    }

    this.archiveFile = file;
    this.extractBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  async extract() {
    if (!this.archiveFile) {
      this.showStatus('error', '請先選擇 7z 檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.extractBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取 7z 檔案...');

      const arrayBuffer = await this.archiveFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check 7z signature
      const signature = [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C];
      let isValid7z = true;
      for (let i = 0; i < signature.length; i++) {
        if (uint8Array[i] !== signature[i]) {
          isValid7z = false;
          break;
        }
      }

      if (!isValid7z) {
        throw new Error('Invalid 7z file format');
      }

      this.updateProgress(30, '解壓縮中...');

      // Extract compressed data (skip 6-byte header)
      const compressedData = uint8Array.slice(6);

      // Decompress
      const decompressedData = await this.decompressLZMA(compressedData);

      this.updateProgress(60, '解析檔案...');

      // Parse JSON archive structure
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decompressedData);
      const archiveData = JSON.parse(jsonString);

      if (!archiveData.files || !Array.isArray(archiveData.files)) {
        throw new Error('Invalid archive structure');
      }

      this.extractedFilesList.innerHTML = '';
      let totalUncompressedSize = 0;

      for (let i = 0; i < archiveData.files.length; i++) {
        const fileInfo = archiveData.files[i];

        // Decode base64 data
        const binaryString = atob(fileInfo.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const blob = new Blob([bytes], { type: fileInfo.type || 'application/octet-stream' });
        totalUncompressedSize += blob.size;

        this.extractedFiles.push({
          name: fileInfo.name,
          blob: blob,
          size: blob.size
        });

        const li = document.createElement('li');
        li.innerHTML = `
          <span class="file-name">${fileInfo.name}</span>
          <span class="file-size">${this.formatFileSize(blob.size)}</span>
          <button class="download-btn" data-index="${this.extractedFiles.length - 1}">下載</button>
        `;
        this.extractedFilesList.appendChild(li);

        this.updateProgress(60 + (i + 1) / archiveData.files.length * 30, `處理中: ${fileInfo.name}`);
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
      this.totalFiles.textContent = `共 ${this.extractedFiles.length} 個檔案，總大小: ${this.formatFileSize(totalUncompressedSize)}`;

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

  async decompressLZMA(compressedData) {
    // Use DecompressionStream if available (modern browsers)
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(compressedData);
      writer.close();

      const decompressedChunks = [];
      const reader = ds.readable.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        decompressedChunks.push(value);
      }

      const totalLength = decompressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of decompressedChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Fallback: return raw data
    return compressedData;
  }

  downloadFile(index) {
    const file = this.extractedFiles[index];
    if (!file) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.name;
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
    link.download = this.archiveFile.name.replace('.7z', '_extracted.zip');
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
  window.decompressor = new SevenZipDecompressor();
});

export default SevenZipDecompressor;
