/**
 * CMP-068: Archive Encryption
 *
 * Creates encrypted ZIP archives with password protection.
 * Uses Web Crypto API for AES encryption.
 * All processing is done locally in the browser.
 */

class ArchiveEncryptor {
  constructor() {
    this.files = [];
    this.encryptedBlob = null;
    this.compressionLevel = 6;
    this.encryptionMethod = 'aes-256';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileListEl = document.getElementById('fileList');
    this.fileItems = document.getElementById('fileItems');
    this.totalSize = document.getElementById('totalSize');
    this.password = document.getElementById('password');
    this.confirmPassword = document.getElementById('confirmPassword');
    this.encryptionMethodSelect = document.getElementById('encryptionMethod');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.outputFilename = document.getElementById('outputFilename');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.passwordStrength = document.getElementById('passwordStrength');
    this.strengthBar = document.getElementById('strengthBar');
    this.strengthText = document.getElementById('strengthText');
    this.strengthTips = document.getElementById('strengthTips');
    this.resultInfo = document.getElementById('resultInfo');
    this.processTime = document.getElementById('processTime');
    this.originalSize = document.getElementById('originalSize');
    this.encryptedSize = document.getElementById('encryptedSize');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e));

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

    this.password.addEventListener('input', () => this.checkPasswordStrength());
    this.confirmPassword.addEventListener('input', () => this.validateForm());

    this.encryptionMethodSelect.addEventListener('change', (e) => {
      this.encryptionMethod = e.target.value;
    });

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFiles(event) {
    this.addFiles(event.target.files);
  }

  addFiles(fileList) {
    for (const file of fileList) {
      this.files.push(file);
    }
    this.updateFileList();
    this.validateForm();
    this.resetBtn.style.display = this.files.length > 0 ? 'inline-flex' : 'none';
  }

  updateFileList() {
    this.fileItems.innerHTML = '';
    let total = 0;

    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span>📄 ${file.name} (${this.formatFileSize(file.size)})</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.fileItems.appendChild(item);
      total += file.size;
    });

    this.fileItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.files.splice(index, 1);
        this.updateFileList();
        this.validateForm();
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileListEl.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  checkPasswordStrength() {
    const pwd = this.password.value;
    if (!pwd) {
      this.passwordStrength.style.display = 'none';
      return;
    }

    let score = 0;
    const tips = [];

    // Length
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (pwd.length < 8) tips.push('密碼長度至少 8 個字元');

    // Character types
    if (/[a-z]/.test(pwd)) score += 1;
    else tips.push('加入小寫字母');

    if (/[A-Z]/.test(pwd)) score += 1;
    else tips.push('加入大寫字母');

    if (/[0-9]/.test(pwd)) score += 1;
    else tips.push('加入數字');

    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;
    else tips.push('加入特殊字元');

    // No common patterns
    if (!/^(123|abc|password|qwerty)/i.test(pwd)) score += 1;

    const maxScore = 8;
    const percentage = (score / maxScore) * 100;

    let strengthLabel, strengthClass;
    if (percentage < 25) {
      strengthLabel = '非常弱';
      strengthClass = 'weak';
    } else if (percentage < 50) {
      strengthLabel = '弱';
      strengthClass = 'fair';
    } else if (percentage < 75) {
      strengthLabel = '中等';
      strengthClass = 'good';
    } else {
      strengthLabel = '強';
      strengthClass = 'strong';
    }

    this.strengthBar.style.width = `${percentage}%`;
    this.strengthBar.className = `progress-fill ${strengthClass}`;
    this.strengthText.textContent = `密碼強度: ${strengthLabel}`;

    this.strengthTips.innerHTML = tips.map(t => `<li>💡 ${t}</li>`).join('');
    this.passwordStrength.style.display = 'block';

    this.validateForm();
  }

  validateForm() {
    const hasFiles = this.files.length > 0;
    const hasPassword = this.password.value.length >= 4;
    const passwordsMatch = this.password.value === this.confirmPassword.value;

    this.encryptBtn.disabled = !(hasFiles && hasPassword && passwordsMatch);
  }

  async encrypt() {
    if (this.files.length === 0) return;

    const pwd = this.password.value;
    if (pwd !== this.confirmPassword.value) {
      this.showStatus('error', '密碼不一致');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備檔案...');

    try {
      // Create ZIP
      const zip = new JSZip();
      let totalOriginalSize = 0;

      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        const content = await file.arrayBuffer();
        zip.file(file.name, content);
        totalOriginalSize += file.size;
        this.updateProgress((i / this.files.length) * 30, `加入: ${file.name}`);
      }

      this.updateProgress(30, '壓縮中...');

      const zipBlob = await zip.generateAsync({
        type: 'arraybuffer',
        compression: this.compressionLevel > 0 ? 'DEFLATE' : 'STORE',
        compressionOptions: { level: this.compressionLevel }
      }, (metadata) => {
        this.updateProgress(30 + metadata.percent * 0.3, '壓縮中...');
      });

      this.updateProgress(60, '加密中...');

      // Encrypt the ZIP
      const encryptedData = await this.encryptData(new Uint8Array(zipBlob), pwd);

      this.updateProgress(90, '封裝加密檔案...');

      // Create encrypted archive format
      // Format: [4 bytes: magic] [4 bytes: version] [4 bytes: method] [16 bytes: salt] [12 bytes: iv] [rest: encrypted data]
      const magic = new TextEncoder().encode('ECMP'); // Encrypted Compression
      const version = new Uint8Array([0, 0, 0, 1]);
      const method = new Uint8Array([
        this.encryptionMethod === 'aes-256' ? 2 : 1,
        0, 0, 0
      ]);

      const finalData = new Uint8Array(
        4 + 4 + 4 + encryptedData.salt.length + encryptedData.iv.length + encryptedData.data.length
      );

      let offset = 0;
      finalData.set(magic, offset); offset += 4;
      finalData.set(version, offset); offset += 4;
      finalData.set(method, offset); offset += 4;
      finalData.set(encryptedData.salt, offset); offset += encryptedData.salt.length;
      finalData.set(encryptedData.iv, offset); offset += encryptedData.iv.length;
      finalData.set(new Uint8Array(encryptedData.data), offset);

      this.encryptedBlob = new Blob([finalData], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(totalOriginalSize);
      this.encryptedSize.textContent = this.formatFileSize(this.encryptedBlob.size);
      this.resultInfo.style.display = 'block';

      this.updateProgress(100, '加密完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '加密完成！');
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Encryption error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '加密失敗: ' + error.message);
    }
  }

  async encryptData(data, password) {
    // Generate salt and derive key
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const keyLength = this.encryptionMethod === 'aes-256' ? 256 : 128;

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: keyLength },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return { data: encrypted, salt, iv };
  }

  download() {
    if (!this.encryptedBlob) return;

    const filename = `${this.outputFilename.value || 'encrypted'}.ecmp`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.encryptedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.encryptedBlob = null;
    this.password.value = '';
    this.confirmPassword.value = '';
    this.outputFilename.value = 'encrypted';
    this.fileListEl.style.display = 'none';
    this.passwordStrength.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.resultInfo.style.display = 'none';
    this.encryptBtn.disabled = true;
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
  window.encryptor = new ArchiveEncryptor();
});

export default ArchiveEncryptor;
