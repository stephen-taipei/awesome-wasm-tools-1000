/**
 * CMP-004: ZIP Password Decryption
 *
 * Decrypts password-protected ZIP files created by CMP-003.
 * Uses CryptoJS for AES decryption.
 * All processing is done locally in the browser.
 */

class ZipDecryptor {
  constructor() {
    this.encryptedFile = null;
    this.extractedFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.password = document.getElementById('password');
    this.fileList = document.getElementById('fileList');
    this.extractedFilesList = document.getElementById('extractedFiles');
    this.totalFiles = document.getElementById('totalFiles');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.encryptionUsed = document.getElementById('encryptionUsed');
    this.fileCount = document.getElementById('fileCount');

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

    this.password.addEventListener('input', () => this.validateForm());

    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    this.encryptedFile = file;
    this.validateForm();
    this.showStatus('info', `已載入: ${file.name}`);
  }

  validateForm() {
    const hasFile = this.encryptedFile !== null;
    const hasPassword = this.password.value.length >= 4;
    this.decryptBtn.disabled = !(hasFile && hasPassword);
  }

  async decrypt() {
    if (!this.encryptedFile) {
      this.showStatus('error', '請先選擇加密檔案');
      return;
    }

    if (!this.password.value) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.decryptBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取加密檔案...');

      const fileContent = await this.encryptedFile.text();
      const separatorIndex = fileContent.indexOf('\n---ENCRYPTED---\n');

      if (separatorIndex === -1) {
        throw new Error('Invalid encrypted file format');
      }

      const headerStr = fileContent.substring(0, separatorIndex);
      const encryptedData = fileContent.substring(separatorIndex + 17);

      let header;
      try {
        header = JSON.parse(headerStr);
      } catch (e) {
        throw new Error('Invalid file header');
      }

      this.updateProgress(30, '解密中...');

      // Decrypt the data
      let decrypted;
      try {
        if (header.encryption === 'AES-256') {
          decrypted = CryptoJS.AES.decrypt(encryptedData, this.password.value, {
            keySize: 256 / 32,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          });
        } else if (header.encryption === 'AES-128') {
          decrypted = CryptoJS.AES.decrypt(encryptedData, this.password.value, {
            keySize: 128 / 32,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
          });
        } else {
          decrypted = CryptoJS.AES.decrypt(encryptedData, this.password.value);
        }

        const decryptedBase64 = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedBase64) {
          throw new Error('Decryption failed - wrong password');
        }

        this.updateProgress(50, '解壓縮中...');

        // Convert base64 to ArrayBuffer
        const binaryString = atob(decryptedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Load and extract ZIP
        const zip = await JSZip.loadAsync(bytes.buffer);
        const fileNames = Object.keys(zip.files);
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
          this.updateProgress(50 + (processedCount / fileNames.length) * 40, `解壓中: ${fileName}`);
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
        this.encryptionUsed.textContent = header.encryption;
        this.fileCount.textContent = `${this.extractedFiles.length} 個檔案`;
        this.totalFiles.textContent = `共 ${this.extractedFiles.length} 個檔案，總大小: ${this.formatFileSize(totalUncompressedSize)}`;

        this.performanceInfo.style.display = 'block';
        this.fileList.style.display = 'block';

        this.updateProgress(100, '解密完成！');

        setTimeout(() => {
          this.progressContainer.classList.remove('active');
          this.showStatus('success', '解密完成！');
          this.downloadAllBtn.style.display = 'inline-flex';
          this.resetBtn.style.display = 'inline-flex';
          this.decryptBtn.disabled = false;
        }, 500);

      } catch (decryptError) {
        throw new Error('密碼錯誤或檔案損壞');
      }

    } catch (error) {
      console.error('Decryption error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '解密失敗，請確認密碼正確');
      this.decryptBtn.disabled = false;
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
    link.download = 'decrypted_files.zip';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.encryptedFile = null;
    this.extractedFiles = [];
    this.password.value = '';
    this.extractedFilesList.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.decryptBtn.disabled = true;
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
  window.decryptor = new ZipDecryptor();
});

export default ZipDecryptor;
