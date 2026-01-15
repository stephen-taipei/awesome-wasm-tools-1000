/**
 * CRY-042: File Decryption Tool (AES-GCM)
 *
 * Uses Web Crypto API to perform AES-GCM file decryption.
 * All processing is done locally in the browser.
 */

class FileDecryptor {
  constructor() {
    this.decryptedBlob = null;
    this.originalFileName = '';
    this.init();
  }

  init() {
    this.fileInput = document.getElementById('fileInput');
    this.password = document.getElementById('password');
    this.keySize = document.getElementById('keySize');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.statusMessage = document.getElementById('statusMessage');
    this.fileInfo = document.getElementById('fileInfo');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    this.decryptionInfo = document.getElementById('decryptionInfo');
    this.originalName = document.getElementById('originalName');
    this.decryptedSize = document.getElementById('decryptedSize');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.fileInfo.style.display = 'block';
      this.fileInfo.innerHTML = `
        <strong>檔案名稱：</strong>${file.name}<br>
        <strong>檔案大小：</strong>${this.formatSize(file.size)}
      `;
    }
  }

  async decrypt() {
    const file = this.fileInput.files[0];
    const password = this.password.value;

    if (!file) {
      this.showStatus('error', '請選擇要解密的檔案');
      return;
    }

    if (!password) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.style.display = 'block';
    this.updateProgress(0);

    try {
      const keySize = parseInt(this.keySize.value);

      // Read file
      this.updateProgress(10);
      const fileData = await this.readFile(file);
      const data = new Uint8Array(fileData);

      // Parse header
      this.updateProgress(20);
      let offset = 0;
      const fileNameLength = new DataView(data.buffer).getUint32(offset, true);
      offset += 4;
      const fileNameBytes = data.slice(offset, offset + fileNameLength);
      this.originalFileName = new TextDecoder().decode(fileNameBytes);
      offset += fileNameLength;

      // Extract salt and IV
      const salt = data.slice(offset, offset + 16);
      offset += 16;
      const iv = data.slice(offset, offset + 12);
      offset += 12;

      // Extract encrypted data
      const encryptedData = data.slice(offset);

      // Derive key from password
      this.updateProgress(30);
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      this.updateProgress(50);
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: keySize },
        false,
        ['decrypt']
      );

      // Decrypt the file
      this.updateProgress(70);
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
      );

      this.updateProgress(100);
      this.decryptedBlob = new Blob([decryptedData]);

      const endTime = performance.now();
      this.originalName.textContent = this.originalFileName;
      this.decryptedSize.textContent = this.formatSize(decryptedData.byteLength);
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.decryptionInfo.style.display = 'block';

      this.showStatus('success', '檔案解密完成！');
    } catch (error) {
      console.error('Decryption error:', error);
      if (error.name === 'OperationError') {
        this.showStatus('error', '解密失敗：密碼錯誤或檔案已損壞');
      } else {
        this.showStatus('error', '解密失敗：' + error.message);
      }
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  download() {
    if (!this.decryptedBlob) {
      this.showStatus('error', '沒有可下載的解密檔案');
      return;
    }

    const url = URL.createObjectURL(this.decryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.originalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  togglePasswordVisibility() {
    if (this.password.type === 'password') {
      this.password.type = 'text';
      this.togglePassword.textContent = '隱藏';
    } else {
      this.password.type = 'password';
      this.togglePassword.textContent = '顯示';
    }
  }

  updateProgress(percent) {
    this.progressBar.style.width = percent + '%';
    this.progressText.textContent = percent + '%';
  }

  clear() {
    this.fileInput.value = '';
    this.password.value = '';
    this.fileInfo.style.display = 'none';
    this.progressContainer.style.display = 'none';
    this.decryptionInfo.style.display = 'none';
    this.decryptedBlob = null;
    this.statusMessage.classList.remove('active');
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.fileDecryptor = new FileDecryptor();
});

export default FileDecryptor;
