/**
 * CRY-007: RSA Signature Verification Tool
 *
 * Uses Web Crypto API to verify RSA-PSS digital signatures.
 * All processing is done locally in the browser.
 */

class RSAVerifier {
  constructor() {
    this.init();
  }

  init() {
    this.publicKey = document.getElementById('publicKey');
    this.message = document.getElementById('message');
    this.signature = document.getElementById('signature');
    this.hashAlgorithm = document.getElementById('hashAlgorithm');
    this.saltLength = document.getElementById('saltLength');
    this.inputFormat = document.getElementById('inputFormat');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.verifyResult = document.getElementById('verifyResult');
    this.resultIcon = document.getElementById('resultIcon');
    this.resultText = document.getElementById('resultText');
    this.verifyInfo = document.getElementById('verifyInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  async verify() {
    const publicKeyPem = this.publicKey.value.trim();
    const message = this.message.value;
    const signatureStr = this.signature.value.trim();

    if (!publicKeyPem) {
      this.showStatus('error', '請輸入公鑰');
      return;
    }

    if (!message) {
      this.showStatus('error', '請輸入原始訊息');
      return;
    }

    if (!signatureStr) {
      this.showStatus('error', '請輸入簽章');
      return;
    }

    const startTime = performance.now();

    try {
      const hashAlgorithm = this.hashAlgorithm.value;
      const saltLength = parseInt(this.saltLength.value);
      const inputFormat = this.inputFormat.value;

      // Parse PEM to ArrayBuffer
      const publicKeyBuffer = this.pemToArrayBuffer(publicKeyPem);

      // Import the public key for verification
      const key = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-PSS',
          hash: hashAlgorithm
        },
        false,
        ['verify']
      );

      // Parse signature
      let signatureData;
      if (inputFormat === 'base64') {
        signatureData = this.base64ToArrayBuffer(signatureStr);
      } else {
        signatureData = this.hexToArrayBuffer(signatureStr);
      }

      // Verify the signature
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);

      const isValid = await crypto.subtle.verify(
        {
          name: 'RSA-PSS',
          saltLength: saltLength
        },
        key,
        signatureData,
        messageData
      );

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.verifyInfo.style.display = 'block';

      // Show result
      this.verifyResult.style.display = 'flex';
      if (isValid) {
        this.verifyResult.className = 'result-box success';
        this.resultIcon.textContent = '✓';
        this.resultText.textContent = '簽章驗證成功！訊息是真實且完整的。';
        this.showStatus('success', '簽章驗證通過！');
      } else {
        this.verifyResult.className = 'result-box error';
        this.resultIcon.textContent = '✗';
        this.resultText.textContent = '簽章驗證失敗！訊息可能被竄改或簽章無效。';
        this.showStatus('error', '簽章驗證失敗！');
      }

    } catch (error) {
      console.error('Verification error:', error);
      this.verifyResult.style.display = 'flex';
      this.verifyResult.className = 'result-box error';
      this.resultIcon.textContent = '✗';
      this.resultText.textContent = '驗證過程發生錯誤：' + error.message;
      this.showStatus('error', '驗證失敗：' + error.message);
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

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  clear() {
    this.publicKey.value = '';
    this.message.value = '';
    this.signature.value = '';
    this.verifyResult.style.display = 'none';
    this.verifyInfo.style.display = 'none';
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
  window.rsaVerifier = new RSAVerifier();
});

export default RSAVerifier;
