/**
 * CRY-012: Ed25519 Signature Verification Tool
 *
 * Uses noble-ed25519 library for Ed25519 signature verification.
 * All processing is done locally in the browser.
 */

class Ed25519Verifier {
  constructor() {
    this.ed25519 = null;
    this.init();
  }

  async init() {
    // Load noble-ed25519
    try {
      this.ed25519 = await import('https://cdn.jsdelivr.net/npm/@noble/ed25519@2.0.0/+esm');
    } catch (e) {
      console.warn('Loading ed25519 from CDN failed');
    }

    this.publicKeyEl = document.getElementById('publicKey');
    this.message = document.getElementById('message');
    this.signature = document.getElementById('signature');
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
    const publicKeyStr = this.publicKeyEl.value.trim();
    const message = this.message.value;
    const signatureStr = this.signature.value.trim();

    if (!publicKeyStr) {
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

    if (!this.ed25519) {
      this.showStatus('error', 'Ed25519 函式庫載入失敗');
      return;
    }

    const startTime = performance.now();

    try {
      const publicKey = this.parseKey(publicKeyStr, 32);
      const signatureData = this.parseKey(signatureStr, 64);

      // Verify the signature
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);

      const isValid = await this.ed25519.verifyAsync(signatureData, messageData, publicKey);

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.verifyInfo.style.display = 'block';

      // Show result
      this.verifyResult.style.display = 'flex';
      if (isValid) {
        this.verifyResult.className = 'result-box success';
        this.resultIcon.textContent = '✓';
        this.resultText.textContent = 'Ed25519 簽章驗證成功！訊息是真實且完整的。';
        this.showStatus('success', '簽章驗證通過！');
      } else {
        this.verifyResult.className = 'result-box error';
        this.resultIcon.textContent = '✗';
        this.resultText.textContent = 'Ed25519 簽章驗證失敗！訊息可能被竄改或簽章無效。';
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

  parseKey(keyStr, expectedLength) {
    // Try to detect format
    if (keyStr.length === expectedLength * 2 && /^[0-9a-fA-F]+$/.test(keyStr)) {
      // Hex format
      return this.hexToArrayBuffer(keyStr);
    } else {
      // Try Base64
      return this.base64ToArrayBuffer(keyStr);
    }
  }

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  clear() {
    this.publicKeyEl.value = '';
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
  window.ed25519Verifier = new Ed25519Verifier();
});

export default Ed25519Verifier;
