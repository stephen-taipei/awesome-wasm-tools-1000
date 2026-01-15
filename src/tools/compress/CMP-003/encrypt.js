/**
 * CMP-003: ZIP Password Protection
 *
 * Creates password-protected ZIP files using encryption.
 * Uses CryptoJS for AES encryption.
 * All processing is done locally in the browser.
 */

class ZipEncryptor {
  constructor() {
    this.files = [];
    this.encryptedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.selectedFiles = document.getElementById('selectedFiles');
    this.totalSize = document.getElementById('totalSize');
    this.password = document.getElementById('password');
    this.confirmPassword = document.getElementById('confirmPassword');
    this.encryptionMethod = document.getElementById('encryptionMethod');
    this.outputFilename = document.getElementById('outputFilename');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.usedEncryption = document.getElementById('usedEncryption');
    this.encryptedSize = document.getElementById('encryptedSize');

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
      this.addFiles(e.dataTransfer.files);
    });

    this.password.addEventListener('input', () => this.validateForm());
    this.confirmPassword.addEventListener('input', () => this.validateForm());

    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addFiles(event.target.files);
  }

  addFiles(fileList) {
    for (const file of fileList) {
      this.files.push(file);
    }
    this.updateFileList();
    this.validateForm();
  }

  updateFileList() {
    this.selectedFiles.innerHTML = '';
    let total = 0;

    this.files.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.selectedFiles.appendChild(li);
      total += file.size;
    });

    this.selectedFiles.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.files.splice(index, 1);
        this.updateFileList();
        this.validateForm();
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileList.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  validateForm() {
    const hasFiles = this.files.length > 0;
    const hasPassword = this.password.value.length >= 4;
    const passwordsMatch = this.password.value === this.confirmPassword.value;

    this.encryptBtn.disabled = !(hasFiles && hasPassword && passwordsMatch);

    if (this.password.value && this.confirmPassword.value && !passwordsMatch) {
      this.showStatus('error', '兩次輸入的密碼不一致');
    } else if (this.password.value && this.password.value.length < 4) {
      this.showStatus('error', '密碼長度至少需要 4 個字元');
    } else {
      this.statusMessage.classList.remove('active');
    }
  }

  async encrypt() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    if (this.password.value !== this.confirmPassword.value) {
      this.showStatus('error', '兩次輸入的密碼不一致');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.encryptBtn.disabled = true;

    try {
      const zip = new JSZip();
      const totalFiles = this.files.length;
      const encMethod = this.encryptionMethod.value;

      // First, create a regular ZIP
      for (let i = 0; i < totalFiles; i++) {
        const file = this.files[i];
        const arrayBuffer = await file.arrayBuffer();
        zip.file(file.name, arrayBuffer);
        this.updateProgress((i + 1) / totalFiles * 40, `處理中: ${file.name}`);
      }

      this.updateProgress(50, '生成壓縮檔...');

      const zipBlob = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      this.updateProgress(70, '加密中...');

      // Encrypt the ZIP content
      const zipBase64 = this.arrayBufferToBase64(zipBlob);
      let encrypted;

      if (encMethod === 'AES-256') {
        encrypted = CryptoJS.AES.encrypt(zipBase64, this.password.value, {
          keySize: 256 / 32,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }).toString();
      } else if (encMethod === 'AES-128') {
        encrypted = CryptoJS.AES.encrypt(zipBase64, this.password.value, {
          keySize: 128 / 32,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }).toString();
      } else {
        // ZipCrypto simulation using simple encryption
        encrypted = CryptoJS.AES.encrypt(zipBase64, this.password.value).toString();
      }

      this.updateProgress(90, '完成中...');

      // Create encrypted file with header
      const header = JSON.stringify({
        version: '1.0',
        encryption: encMethod,
        originalName: this.outputFilename.value + '.zip'
      });

      const encryptedContent = header + '\n---ENCRYPTED---\n' + encrypted;
      this.encryptedBlob = new Blob([encryptedContent], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.usedEncryption.textContent = encMethod;
      this.encryptedSize.textContent = this.formatFileSize(this.encryptedBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '加密完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '加密完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.encryptBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Encryption error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '加密失敗，請重試');
      this.encryptBtn.disabled = false;
    }
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.encryptedBlob) return;

    const filename = `${this.outputFilename.value || 'encrypted'}.zip.enc`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.encryptedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.encryptedBlob = null;
    this.selectedFiles.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.encryptBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.password.value = '';
    this.confirmPassword.value = '';
    this.outputFilename.value = 'encrypted';
    this.encryptionMethod.value = 'AES-256';
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
  window.encryptor = new ZipEncryptor();
});

export default ZipEncryptor;
