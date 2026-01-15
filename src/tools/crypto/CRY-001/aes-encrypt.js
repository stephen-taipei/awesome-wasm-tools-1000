/**
 * CRY-001: AES Encryption Tool
 *
 * Uses Web Crypto API to perform AES encryption with support for:
 * - Key sizes: 128, 192, 256 bits
 * - Modes: GCM (recommended), CBC, CTR
 * - Output formats: Base64, Hexadecimal
 *
 * All processing is done locally in the browser.
 */

class AESEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.plaintext = document.getElementById('plaintext');
    this.password = document.getElementById('password');
    this.ciphertext = document.getElementById('ciphertext');
    this.keySize = document.getElementById('keySize');
    this.mode = document.getElementById('mode');
    this.outputFormat = document.getElementById('outputFormat');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateKey = document.getElementById('generateKey');
    this.statusMessage = document.getElementById('statusMessage');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.ivValue = document.getElementById('ivValue');
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
    const plaintext = this.plaintext.value.trim();
    const password = this.password.value;

    if (!plaintext) {
      this.showStatus('error', '請輸入要加密的文字');
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
      const outputFormat = this.outputFormat.value;

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

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(mode === 'GCM' ? 12 : 16));

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
        ['encrypt']
      );

      // Encrypt the data
      const plaintextData = encoder.encode(plaintext);
      let encryptedData;

      if (mode === 'GCM') {
        encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          plaintextData
        );
      } else if (mode === 'CTR') {
        encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-CTR', counter: iv, length: 64 },
          key,
          plaintextData
        );
      } else {
        encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv: iv },
          key,
          plaintextData
        );
      }

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // Format output
      let result;
      if (outputFormat === 'base64') {
        result = this.arrayBufferToBase64(combined);
      } else {
        result = this.arrayBufferToHex(combined);
      }

      this.ciphertext.value = result;

      const endTime = performance.now();
      this.ivValue.textContent = this.arrayBufferToHex(iv);
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.encryptionInfo.style.display = 'block';

      this.showStatus('success', '加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  async generateRandomKey() {
    const keySize = parseInt(this.keySize.value);
    const keyBytes = keySize / 8;
    const randomBytes = crypto.getRandomValues(new Uint8Array(keyBytes));
    this.password.value = this.arrayBufferToBase64(randomBytes);
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

  copyResult() {
    if (this.ciphertext.value) {
      navigator.clipboard.writeText(this.ciphertext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.plaintext.value = '';
    this.password.value = '';
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
  window.aesEncryptor = new AESEncryptor();
});

export default AESEncryptor;
