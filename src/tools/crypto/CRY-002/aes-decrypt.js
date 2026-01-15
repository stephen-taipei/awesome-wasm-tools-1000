/**
 * CRY-002: AES Decryption Tool
 *
 * Uses Web Crypto API to perform AES decryption with support for:
 * - Key sizes: 128, 192, 256 bits
 * - Modes: GCM (recommended), CBC, CTR
 * - Input formats: Base64, Hexadecimal
 *
 * All processing is done locally in the browser.
 */

class AESDecryptor {
  constructor() {
    this.init();
  }

  init() {
    this.ciphertext = document.getElementById('ciphertext');
    this.password = document.getElementById('password');
    this.plaintext = document.getElementById('plaintext');
    this.keySize = document.getElementById('keySize');
    this.mode = document.getElementById('mode');
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
    const ciphertext = this.ciphertext.value.trim();
    const password = this.password.value;

    if (!ciphertext) {
      this.showStatus('error', '請輸入要解密的密文');
      return;
    }

    if (!password) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    const startTime = performance.now();

    try {
      const keySize = parseInt(this.keySize.value);
      const mode = this.mode.value;
      const inputFormat = this.inputFormat.value;

      // Parse the input
      let combined;
      if (inputFormat === 'base64') {
        combined = this.base64ToArrayBuffer(ciphertext);
      } else {
        combined = this.hexToArrayBuffer(ciphertext);
      }

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const ivLength = mode === 'GCM' ? 12 : 16;
      const iv = combined.slice(16, 16 + ivLength);
      const encryptedData = combined.slice(16 + ivLength);

      // Derive key from password using PBKDF2
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: mode === 'GCM' ? 'AES-GCM' : (mode === 'CTR' ? 'AES-CTR' : 'AES-CBC'), length: keySize },
        false,
        ['decrypt']
      );

      // Decrypt the data
      let decryptedData;

      if (mode === 'GCM') {
        decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encryptedData
        );
      } else if (mode === 'CTR') {
        decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-CTR', counter: iv, length: 64 },
          key,
          encryptedData
        );
      } else {
        decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-CBC', iv: iv },
          key,
          encryptedData
        );
      }

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedData);

      this.plaintext.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.decryptionInfo.style.display = 'block';

      this.showStatus('success', '解密完成！');
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
  window.aesDecryptor = new AESDecryptor();
});

export default AESDecryptor;
