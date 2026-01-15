/**
 * CRY-014: ChaCha20-Poly1305 Decryption Tool
 *
 * Uses noble-ciphers library for ChaCha20-Poly1305 AEAD decryption.
 * All processing is done locally in the browser.
 */

class ChaCha20Decryptor {
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

    this.ciphertext = document.getElementById('ciphertext');
    this.password = document.getElementById('password');
    this.aad = document.getElementById('aad');
    this.plaintext = document.getElementById('plaintext');
    this.inputFormat = document.getElementById('inputFormat');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.statusMessage = document.getElementById('statusMessage');
    this.decryptionInfo = document.getElementById('decryptionInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
  }

  async decrypt() {
    const ciphertextStr = this.ciphertext.value.trim();
    const password = this.password.value;
    const aadData = this.aad.value;

    if (!ciphertextStr) {
      this.showStatus('error', '請輸入要解密的密文');
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
      const inputFormat = this.inputFormat.value;

      // Parse ciphertext
      let combined;
      if (inputFormat === 'base64') {
        combined = this.base64ToArrayBuffer(ciphertextStr);
      } else {
        combined = this.hexToArrayBuffer(ciphertextStr);
      }

      // Extract nonce (first 12 bytes) and encrypted data
      const nonce = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Derive 32-byte key from password using SHA-256
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const keyHash = await crypto.subtle.digest('SHA-256', passwordData);
      const key = new Uint8Array(keyHash);

      // Prepare AAD
      const aadBytes = aadData ? encoder.encode(aadData) : new Uint8Array(0);

      // Decrypt using ChaCha20-Poly1305
      const chacha = this.chacha.chacha20poly1305(key, nonce, aadBytes);
      const decryptedData = chacha.decrypt(encryptedData);

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedData);

      this.plaintext.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.decryptionInfo.style.display = 'block';

      this.showStatus('success', 'ChaCha20-Poly1305 解密完成！');
    } catch (error) {
      console.error('Decryption error:', error);
      this.showStatus('error', '解密失敗：密碼錯誤或資料損壞');
    }
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
    if (this.plaintext.value) {
      navigator.clipboard.writeText(this.plaintext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.ciphertext.value = '';
    this.password.value = '';
    this.aad.value = '';
    this.plaintext.value = '';
    this.decryptionInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
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
  window.chacha20Decryptor = new ChaCha20Decryptor();
});

export default ChaCha20Decryptor;
