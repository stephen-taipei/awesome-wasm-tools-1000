/**
 * CMP-002: ZIP Decompression
 *
 * Uses JSZip library to extract files from a ZIP archive.
 * All processing is done locally in the browser.
 */

class ZipDecompressor {
  constructor() {
    this.zipFile = null;
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
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.showStatus('error', '請選擇 ZIP 格式的檔案');
      return;
    }

    this.zipFile = file;
    this.extractBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name} (${this.formatFileSize(file.size)})`);
  }

  async extract() {
    if (!this.zipFile) {
      this.showStatus('error', '請先選擇 ZIP 檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.extractBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取 ZIP 檔案...');

      const arrayBuffer = await this.zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      this.updateProgress(30, '解析內容...');

      const fileNames = Object.keys(zip.files);
      const totalCount = fileNames.length;
      let processedCount = 0;
      let totalUncompressedSize = 0;

      this.extractedFilesList.innerHTML = '';

      for (const fileName of fileNames) {
        const zipEntry = zip.files[fileName];

        if (!zipEntry.dir) {
          const content = await zipEntry.async('blob');
          totalUncompressedSize += content.size;

          this.extractedFiles.push({
            name: fileName,
            blob: content,
            size: content.size
          });

          const li = document.createElement('li');
          li.innerHTML = `
            <span class="file-name">${fileName}</span>
            <span class="file-size">${this.formatFileSize(content.size)}</span>
            <button class="download-btn" data-index="${this.extractedFiles.length - 1}">下載</button>
          `;
          this.extractedFilesList.appendChild(li);
        }

        processedCount++;
        this.updateProgress(30 + (processedCount / totalCount) * 60, `處理中: ${fileName}`);
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
    link.download = this.zipFile.name.replace('.zip', '_extracted.zip');
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.zipFile = null;
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
  window.decompressor = new ZipDecompressor();
});

export default ZipDecompressor;
