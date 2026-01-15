/**
 * CRY-006: RSA Digital Signature Tool
 *
 * Uses Web Crypto API to create RSA-PSS digital signatures.
 * All processing is done locally in the browser.
 */

class RSASigner {
  constructor() {
    this.init();
  }

  init() {
    this.privateKey = document.getElementById('privateKey');
    this.message = document.getElementById('message');
    this.signature = document.getElementById('signature');
    this.hashAlgorithm = document.getElementById('hashAlgorithm');
    this.saltLength = document.getElementById('saltLength');
    this.outputFormat = document.getElementById('outputFormat');
    this.signBtn = document.getElementById('signBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.signInfo = document.getElementById('signInfo');
    this.processTime = document.getElementById('processTime');
    this.signatureLength = document.getElementById('signatureLength');

    this.bindEvents();
  }

  bindEvents() {
    this.signBtn.addEventListener('click', () => this.sign());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
  }

  async sign() {
    const privateKeyPem = this.privateKey.value.trim();
    const message = this.message.value;

    if (!privateKeyPem) {
      this.showStatus('error', '請輸入私鑰');
      return;
    }

    if (!message) {
      this.showStatus('error', '請輸入要簽章的訊息');
      return;
    }

    const startTime = performance.now();

    try {
      const hashAlgorithm = this.hashAlgorithm.value;
      const saltLength = parseInt(this.saltLength.value);
      const outputFormat = this.outputFormat.value;

      // Parse PEM to ArrayBuffer
      const privateKeyBuffer = this.pemToArrayBuffer(privateKeyPem);

      // Import the private key for signing
      const key = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'RSA-PSS',
          hash: hashAlgorithm
        },
        false,
        ['sign']
      );

      // Sign the message
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);

      const signatureData = await crypto.subtle.sign(
        {
          name: 'RSA-PSS',
          saltLength: saltLength
        },
        key,
        messageData
      );

      // Format output
      let result;
      if (outputFormat === 'base64') {
        result = this.arrayBufferToBase64(signatureData);
      } else {
        result = this.arrayBufferToHex(signatureData);
      }

      this.signature.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.signatureLength.textContent = `${signatureData.byteLength} bytes`;
      this.signInfo.style.display = 'block';

      this.showStatus('success', '數位簽章建立完成！');
    } catch (error) {
      console.error('Signing error:', error);
      this.showStatus('error', '簽章失敗：' + error.message);
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
    if (this.signature.value) {
      navigator.clipboard.writeText(this.signature.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.privateKey.value = '';
    this.message.value = '';
    this.signature.value = '';
    this.signInfo.style.display = 'none';
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
  window.rsaSigner = new RSASigner();
});

export default RSASigner;
