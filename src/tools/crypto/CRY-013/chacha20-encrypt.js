/**
 * CRY-013: ChaCha20-Poly1305 Encryption Tool
 *
 * Uses noble-ciphers library for ChaCha20-Poly1305 AEAD encryption.
 * ChaCha20-Poly1305 is a high-performance authenticated encryption algorithm.
 * All processing is done locally in the browser.
 */

class ChaCha20Encryptor {
  constructor() {
    this.chacha = null;
    this.init();
  }

  async init() {
    // Load noble-ciphers
    try {
      this.chacha = await import('https://cdn.jsdelivr.net/npm/@noble/ciphers@0.4.1/+esm');
    } catch (e) {
      console.warn('Loading chacha from CDN failed');
    }

    this.plaintext = document.getElementById('plaintext');
    this.password = document.getElementById('password');
    this.aad = document.getElementById('aad');
    this.ciphertext = document.getElementById('ciphertext');
    this.outputFormat = document.getElementById('outputFormat');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateKey = document.getElementById('generateKey');
    this.statusMessage = document.getElementById('statusMessage');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.nonceValue = document.getElementById('nonceValue');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
    this.generateKey.addEventListener('click', () => this.generateRandomKey());
  }

  async encrypt() {
    const plaintext = this.plaintext.value;
    const password = this.password.value;
    const aadData = this.aad.value;

    if (!plaintext) {
      this.showStatus('error', '請輸入要加密的文字');
      return;
    }

    if (!password) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    if (!this.chacha) {
      this.showStatus('error', 'ChaCha20 函式庫載入失敗');
      return;
    }

    const startTime = performance.now();

    try {
      const outputFormat = this.outputFormat.value;

      // Derive 32-byte key from password using SHA-256
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const keyHash = await crypto.subtle.digest('SHA-256', passwordData);
      const key = new Uint8Array(keyHash);

      // Generate random 12-byte nonce
      const nonce = crypto.getRandomValues(new Uint8Array(12));

      // Prepare plaintext and AAD
      const plaintextData = encoder.encode(plaintext);
      const aadBytes = aadData ? encoder.encode(aadData) : new Uint8Array(0);

      // Encrypt using ChaCha20-Poly1305
      const chacha = this.chacha.chacha20poly1305(key, nonce, aadBytes);
      const encryptedData = chacha.encrypt(plaintextData);

      // Combine nonce + encrypted data (includes auth tag)
      const combined = new Uint8Array(nonce.length + encryptedData.length);
      combined.set(nonce, 0);
      combined.set(encryptedData, nonce.length);

      // Format output
      let result;
      if (outputFormat === 'base64') {
        result = this.arrayBufferToBase64(combined);
      } else {
        result = this.arrayBufferToHex(combined);
      }

      this.ciphertext.value = result;

      const endTime = performance.now();
      this.nonceValue.textContent = this.arrayBufferToHex(nonce);
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.encryptionInfo.style.display = 'block';

      this.showStatus('success', 'ChaCha20-Poly1305 加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  async generateRandomKey() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    this.password.value = this.arrayBufferToBase64(randomBytes);
    this.password.type = 'text';
    this.togglePassword.textContent = '隱藏';
    this.showStatus('info', '已生成 256 位元隨機金鑰');
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

  copyResult() {
    if (this.ciphertext.value) {
      navigator.clipboard.writeText(this.ciphertext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.plaintext.value = '';
    this.password.value = '';
    this.aad.value = '';
    this.ciphertext.value = '';
    this.encryptionInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  arrayBufferToHex(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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
  window.chacha20Encryptor = new ChaCha20Encryptor();
});

export default ChaCha20Encryptor;
