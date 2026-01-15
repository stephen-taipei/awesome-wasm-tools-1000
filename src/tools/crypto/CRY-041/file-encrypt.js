/**
 * CRY-041: File Encryption Tool (AES-GCM)
 *
 * Uses Web Crypto API to perform AES-GCM file encryption.
 * All processing is done locally in the browser.
 */

class FileEncryptor {
  constructor() {
    this.encryptedBlob = null;
    this.originalFileName = '';
    this.init();
  }

  init() {
    this.fileInput = document.getElementById('fileInput');
    this.password = document.getElementById('password');
    this.confirmPassword = document.getElementById('confirmPassword');
    this.keySize = document.getElementById('keySize');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateKey = document.getElementById('generateKey');
    this.statusMessage = document.getElementById('statusMessage');
    this.fileInfo = document.getElementById('fileInfo');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.originalSize = document.getElementById('originalSize');
    this.encryptedSize = document.getElementById('encryptedSize');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
    this.generateKey.addEventListener('click', () => this.generateRandomKey());
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.originalFileName = file.name;
      this.fileInfo.style.display = 'block';
      this.fileInfo.innerHTML = `
        <strong>檔案名稱：</strong>${file.name}<br>
        <strong>檔案大小：</strong>${this.formatSize(file.size)}<br>
        <strong>檔案類型：</strong>${file.type || '未知'}
      `;
    }
  }

  async encrypt() {
    const file = this.fileInput.files[0];
    const password = this.password.value;
    const confirmPassword = this.confirmPassword.value;

    if (!file) {
      this.showStatus('error', '請選擇要加密的檔案');
      return;
    }

    if (!password) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    if (password !== confirmPassword) {
      this.showStatus('error', '兩次密碼輸入不一致');
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

      // Derive key from password
      this.updateProgress(20);
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      this.updateProgress(30);
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
        ['encrypt']
      );

      // Encrypt the file
      this.updateProgress(50);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        fileData
      );

      this.updateProgress(80);

      // Create header with metadata
      const fileNameBytes = encoder.encode(file.name);
      const header = new Uint8Array(4 + fileNameBytes.length);
      new DataView(header.buffer).setUint32(0, fileNameBytes.length, true);
      header.set(fileNameBytes, 4);

      // Combine: header + salt + iv + encrypted data
      const combined = new Uint8Array(
        header.length + salt.length + iv.length + encryptedData.byteLength
      );
      let offset = 0;
      combined.set(header, offset); offset += header.length;
      combined.set(salt, offset); offset += salt.length;
      combined.set(iv, offset); offset += iv.length;
      combined.set(new Uint8Array(encryptedData), offset);

      this.updateProgress(100);
      this.encryptedBlob = new Blob([combined], { type: 'application/octet-stream' });

      const endTime = performance.now();
      this.originalSize.textContent = this.formatSize(file.size);
      this.encryptedSize.textContent = this.formatSize(combined.length);
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.encryptionInfo.style.display = 'block';

      this.showStatus('success', '檔案加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  download() {
    if (!this.encryptedBlob) {
      this.showStatus('error', '沒有可下載的加密檔案');
      return;
    }

    const url = URL.createObjectURL(this.encryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.originalFileName + '.encrypted';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async generateRandomKey() {
    const keySize = parseInt(this.keySize.value);
    const keyBytes = keySize / 8;
    const randomBytes = crypto.getRandomValues(new Uint8Array(keyBytes));
    const key = this.arrayBufferToBase64(randomBytes);
    this.password.value = key;
    this.confirmPassword.value = key;
    this.password.type = 'text';
    this.togglePassword.textContent = '隱藏';
    this.showStatus('info', `已生成 ${keySize} 位元隨機金鑰`);
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
    this.confirmPassword.value = '';
    this.fileInfo.style.display = 'none';
    this.progressContainer.style.display = 'none';
    this.encryptionInfo.style.display = 'none';
    this.encryptedBlob = null;
    this.statusMessage.classList.remove('active');
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
  window.fileEncryptor = new FileEncryptor();
});

export default FileEncryptor;
