/**
 * CRY-022: SHA-1 Hash Tool
 *
 * Uses Web Crypto API to compute SHA-1 hash.
 * SHA-1 produces a 160-bit (20-byte) hash value.
 *
 * WARNING: SHA-1 is cryptographically broken and should not be used for security purposes.
 *
 * All processing is done locally in the browser.
 */

class SHA1Hash {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.fileInput = document.getElementById('fileInput');
    this.hashResult = document.getElementById('hashResult');
    this.inputType = document.getElementById('inputType');
    this.outputFormat = document.getElementById('outputFormat');
    this.hashBtn = document.getElementById('hashBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.uploadArea = document.getElementById('uploadArea');
    this.textInputGroup = document.getElementById('textInputGroup');
    this.fileInputGroup = document.getElementById('fileInputGroup');
    this.fileName = document.getElementById('fileName');
    this.statusMessage = document.getElementById('statusMessage');
    this.hashInfo = document.getElementById('hashInfo');
    this.inputLength = document.getElementById('inputLength');
    this.processTime = document.getElementById('processTime');

    this.selectedFile = null;
    this.bindEvents();
  }

  bindEvents() {
    this.hashBtn.addEventListener('click', () => this.hash());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());

    this.inputType.addEventListener('change', (e) => {
      if (e.target.value === 'text') {
        this.textInputGroup.style.display = 'block';
        this.fileInputGroup.style.display = 'none';
      } else {
        this.textInputGroup.style.display = 'none';
        this.fileInputGroup.style.display = 'block';
      }
    });

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
      if (e.dataTransfer.files[0]) {
        this.selectedFile = e.dataTransfer.files[0];
        this.fileName.textContent = `已選擇: ${this.selectedFile.name}`;
      }
    });
  }

  handleFileSelect(e) {
    if (e.target.files[0]) {
      this.selectedFile = e.target.files[0];
      this.fileName.textContent = `已選擇: ${this.selectedFile.name}`;
    }
  }

  async hash() {
    const inputType = this.inputType.value;
    let data;
    let dataLength;

    if (inputType === 'text') {
      const text = this.inputText.value;
      if (!text) {
        this.showStatus('error', '請輸入文字');
        return;
      }
      const encoder = new TextEncoder();
      data = encoder.encode(text);
      dataLength = text.length + ' 字元';
    } else {
      if (!this.selectedFile) {
        this.showStatus('error', '請選擇檔案');
        return;
      }
      const buffer = await this.selectedFile.arrayBuffer();
      data = new Uint8Array(buffer);
      dataLength = this.formatFileSize(data.length);
    }

    const startTime = performance.now();

    try {
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hash = new Uint8Array(hashBuffer);
      const outputFormat = this.outputFormat.value;

      let result;
      if (outputFormat === 'hex') {
        result = this.arrayBufferToHex(hash);
      } else if (outputFormat === 'HEX') {
        result = this.arrayBufferToHex(hash).toUpperCase();
      } else {
        result = this.arrayBufferToBase64(hash);
      }

      this.hashResult.value = result;

      const endTime = performance.now();
      this.inputLength.textContent = dataLength;
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';

      this.showStatus('success', 'SHA-1 雜湊計算完成！');
    } catch (error) {
      console.error('Hash error:', error);
      this.showStatus('error', '雜湊計算失敗：' + error.message);
    }
  }

  copyResult() {
    if (this.hashResult.value) {
      navigator.clipboard.writeText(this.hashResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.inputText.value = '';
    this.hashResult.value = '';
    this.selectedFile = null;
    this.fileName.textContent = '';
    this.fileInput.value = '';
    this.hashInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  arrayBufferToHex(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  formatFileSize(bytes) {
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
  window.sha1Hash = new SHA1Hash();
});

export default SHA1Hash;
