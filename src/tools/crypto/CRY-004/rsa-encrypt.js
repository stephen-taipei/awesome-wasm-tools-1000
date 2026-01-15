/**
 * CRY-004: RSA Encryption Tool
 *
 * Uses Web Crypto API to perform RSA-OAEP encryption.
 * All processing is done locally in the browser.
 */

class RSAEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.publicKey = document.getElementById('publicKey');
    this.plaintext = document.getElementById('plaintext');
    this.ciphertext = document.getElementById('ciphertext');
    this.hashAlgorithm = document.getElementById('hashAlgorithm');
    this.outputFormat = document.getElementById('outputFormat');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.processTime = document.getElementById('processTime');
    this.inputLength = document.getElementById('inputLength');
    this.outputLength = document.getElementById('outputLength');

    this.bindEvents();
  }

  bindEvents() {
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
  }

  async encrypt() {
    const publicKeyPem = this.publicKey.value.trim();
    const plaintext = this.plaintext.value;

    if (!publicKeyPem) {
      this.showStatus('error', '請輸入公鑰');
      return;
    }

    if (!plaintext) {
      this.showStatus('error', '請輸入要加密的文字');
      return;
    }

    const startTime = performance.now();

    try {
      const hashAlgorithm = this.hashAlgorithm.value;
      const outputFormat = this.outputFormat.value;

      // Parse PEM to ArrayBuffer
      const publicKeyBuffer = this.pemToArrayBuffer(publicKeyPem);

      // Import the public key
      const key = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: hashAlgorithm
        },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const encoder = new TextEncoder();
      const plaintextData = encoder.encode(plaintext);

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        key,
        plaintextData
      );

      // Format output
      let result;
      if (outputFormat === 'base64') {
        result = this.arrayBufferToBase64(encryptedData);
      } else {
        result = this.arrayBufferToHex(encryptedData);
      }

      this.ciphertext.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.inputLength.textContent = `${plaintextData.length} bytes`;
      this.outputLength.textContent = `${encryptedData.byteLength} bytes`;
      this.encryptionInfo.style.display = 'block';

      this.showStatus('success', 'RSA 加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  pemToArrayBuffer(pem) {
    const base64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    return this.base64ToArrayBuffer(base64);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  copyResult() {
    if (this.ciphertext.value) {
      navigator.clipboard.writeText(this.ciphertext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.publicKey.value = '';
    this.plaintext.value = '';
    this.ciphertext.value = '';
    this.encryptionInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
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
  window.rsaEncryptor = new RSAEncryptor();
});

export default RSAEncryptor;
