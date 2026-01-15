/**
 * CRY-011: Ed25519 Digital Signature Tool
 *
 * Uses noble-ed25519 library for Ed25519 signatures.
 * Ed25519 is a high-performance EdDSA signature scheme.
 * All processing is done locally in the browser.
 */

class Ed25519Signer {
  constructor() {
    this.ed25519 = null;
    this.init();
  }

  async init() {
    // Load noble-ed25519
    try {
      this.ed25519 = await import('https://cdn.jsdelivr.net/npm/@noble/ed25519@2.0.0/+esm');
    } catch (e) {
      console.warn('Loading ed25519 from CDN failed, using fallback');
    }

    this.privateKeyEl = document.getElementById('privateKey');
    this.publicKeyEl = document.getElementById('publicKey');
    this.message = document.getElementById('message');
    this.signature = document.getElementById('signature');
    this.outputFormat = document.getElementById('outputFormat');
    this.signBtn = document.getElementById('signBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.copyPublicBtn = document.getElementById('copyPublicBtn');
    this.generateKeyBtn = document.getElementById('generateKeyBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.signInfo = document.getElementById('signInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.signBtn.addEventListener('click', () => this.sign());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.copyPublicBtn.addEventListener('click', () => this.copyPublicKey());
    this.generateKeyBtn.addEventListener('click', () => this.generateKeyPair());
    this.privateKeyEl.addEventListener('input', () => this.updatePublicKey());
  }

  async generateKeyPair() {
    const privateKey = crypto.getRandomValues(new Uint8Array(32));
    const outputFormat = this.outputFormat.value;

    if (outputFormat === 'base64') {
      this.privateKeyEl.value = this.arrayBufferToBase64(privateKey);
    } else {
      this.privateKeyEl.value = this.arrayBufferToHex(privateKey);
    }

    await this.updatePublicKey();
    this.showStatus('success', 'Ed25519 金鑰對已生成！');
  }

  async updatePublicKey() {
    const privateKeyStr = this.privateKeyEl.value.trim();
    if (!privateKeyStr || !this.ed25519) return;

    try {
      const privateKey = this.parseKey(privateKeyStr);
      const publicKey = await this.ed25519.getPublicKeyAsync(privateKey);
      const outputFormat = this.outputFormat.value;

      if (outputFormat === 'base64') {
        this.publicKeyEl.value = this.arrayBufferToBase64(publicKey);
      } else {
        this.publicKeyEl.value = this.arrayBufferToHex(publicKey);
      }
    } catch (e) {
      this.publicKeyEl.value = '';
    }
  }

  async sign() {
    const privateKeyStr = this.privateKeyEl.value.trim();
    const message = this.message.value;

    if (!privateKeyStr) {
      this.showStatus('error', '請輸入私鑰');
      return;
    }

    if (!message) {
      this.showStatus('error', '請輸入要簽章的訊息');
      return;
    }

    if (!this.ed25519) {
      this.showStatus('error', 'Ed25519 函式庫載入失敗');
      return;
    }

    const startTime = performance.now();

    try {
      const outputFormat = this.outputFormat.value;
      const privateKey = this.parseKey(privateKeyStr);

      // Sign the message
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);

      const signatureData = await this.ed25519.signAsync(messageData, privateKey);

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
      this.signInfo.style.display = 'block';

      this.showStatus('success', 'Ed25519 數位簽章建立完成！');
    } catch (error) {
      console.error('Signing error:', error);
      this.showStatus('error', '簽章失敗：' + error.message);
    }
  }

  parseKey(keyStr) {
    // Try to detect format
    if (keyStr.length === 64 && /^[0-9a-fA-F]+$/.test(keyStr)) {
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

  copyResult() {
    if (this.signature.value) {
      navigator.clipboard.writeText(this.signature.value);
      this.showStatus('success', '簽章已複製到剪貼簿');
    }
  }

  copyPublicKey() {
    if (this.publicKeyEl.value) {
      navigator.clipboard.writeText(this.publicKeyEl.value);
      this.showStatus('success', '公鑰已複製到剪貼簿');
    }
  }

  clear() {
    this.privateKeyEl.value = '';
    this.publicKeyEl.value = '';
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
  window.ed25519Signer = new Ed25519Signer();
});

export default Ed25519Signer;
