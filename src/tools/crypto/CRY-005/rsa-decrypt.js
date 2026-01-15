/**
 * CRY-005: RSA Decryption Tool
 *
 * Uses Web Crypto API to perform RSA-OAEP decryption.
 * All processing is done locally in the browser.
 */

class RSADecryptor {
  constructor() {
    this.init();
  }

  init() {
    this.privateKey = document.getElementById('privateKey');
    this.ciphertext = document.getElementById('ciphertext');
    this.plaintext = document.getElementById('plaintext');
    this.hashAlgorithm = document.getElementById('hashAlgorithm');
    this.inputFormat = document.getElementById('inputFormat');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.decryptionInfo = document.getElementById('decryptionInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
  }

  async decrypt() {
    const privateKeyPem = this.privateKey.value.trim();
    const ciphertext = this.ciphertext.value.trim();

    if (!privateKeyPem) {
      this.showStatus('error', '請輸入私鑰');
      return;
    }

    if (!ciphertext) {
      this.showStatus('error', '請輸入要解密的密文');
      return;
    }

    const startTime = performance.now();

    try {
      const hashAlgorithm = this.hashAlgorithm.value;
      const inputFormat = this.inputFormat.value;

      // Parse PEM to ArrayBuffer
      const privateKeyBuffer = this.pemToArrayBuffer(privateKeyPem);

      // Import the private key
      const key = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: hashAlgorithm
        },
        false,
        ['decrypt']
      );

      // Parse ciphertext
      let encryptedData;
      if (inputFormat === 'base64') {
        encryptedData = this.base64ToArrayBuffer(ciphertext);
      } else {
        encryptedData = this.hexToArrayBuffer(ciphertext);
      }

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedData);

      this.plaintext.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.decryptionInfo.style.display = 'block';

      this.showStatus('success', 'RSA 解密完成！');
    } catch (error) {
      console.error('Decryption error:', error);
      this.showStatus('error', '解密失敗：私鑰錯誤或資料損壞');
    }
  }

  pemToArrayBuffer(pem) {
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
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

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  copyResult() {
    if (this.plaintext.value) {
      navigator.clipboard.writeText(this.plaintext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.privateKey.value = '';
    this.ciphertext.value = '';
    this.plaintext.value = '';
    this.decryptionInfo.style.display = 'none';
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
  window.rsaDecryptor = new RSADecryptor();
});

export default RSADecryptor;
