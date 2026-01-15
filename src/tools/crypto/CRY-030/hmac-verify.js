/**
 * CRY-030: HMAC Verification Tool
 * Uses Web Crypto API to verify HMAC values.
 */

class HMACVerifier {
  constructor() { this.init(); }

  init() {
    this.secretKey = document.getElementById('secretKey');
    this.message = document.getElementById('message');
    this.hmacValue = document.getElementById('hmacValue');
    this.algorithm = document.getElementById('algorithm');
    this.inputFormat = document.getElementById('inputFormat');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.toggleKey = document.getElementById('toggleKey');
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
    this.toggleKey.addEventListener('click', () => {
      this.secretKey.type = this.secretKey.type === 'password' ? 'text' : 'password';
      this.toggleKey.textContent = this.secretKey.type === 'password' ? '顯示' : '隱藏';
    });
  }

  async verify() {
    if (!this.secretKey.value) { this.showStatus('error', '請輸入密鑰'); return; }
    if (!this.message.value) { this.showStatus('error', '請輸入訊息'); return; }
    if (!this.hmacValue.value) { this.showStatus('error', '請輸入 HMAC 值'); return; }

    const startTime = performance.now();
    try {
      const algorithm = this.algorithm.value;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.secretKey.value);
      const messageData = encoder.encode(this.message.value);

      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: algorithm }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const computedHmac = new Uint8Array(signature);

      // Parse the provided HMAC
      const inputFormat = this.inputFormat.value;
      let providedHmac;
      if (inputFormat === 'hex') {
        providedHmac = this.hexToBytes(this.hmacValue.value.trim().toLowerCase());
      } else {
        providedHmac = this.base64ToBytes(this.hmacValue.value.trim());
      }

      // Constant-time comparison
      const isValid = this.timingSafeEqual(computedHmac, providedHmac);

      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.verifyInfo.style.display = 'block';

      this.verifyResult.style.display = 'flex';
      if (isValid) {
        this.verifyResult.className = 'result-box success';
        this.resultIcon.textContent = '✓';
        this.resultText.textContent = 'HMAC 驗證成功！訊息是真實且完整的。';
        this.showStatus('success', 'HMAC 驗證通過！');
      } else {
        this.verifyResult.className = 'result-box error';
        this.resultIcon.textContent = '✗';
        this.resultText.textContent = 'HMAC 驗證失敗！訊息可能被竄改或密鑰錯誤。';
        this.showStatus('error', 'HMAC 驗證失敗！');
      }
    } catch (e) {
      this.verifyResult.style.display = 'flex';
      this.verifyResult.className = 'result-box error';
      this.resultIcon.textContent = '✗';
      this.resultText.textContent = '驗證過程發生錯誤：' + e.message;
      this.showStatus('error', '驗證失敗：' + e.message);
    }
  }

  timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  clear() { this.secretKey.value = ''; this.message.value = ''; this.hmacValue.value = ''; this.verifyResult.style.display = 'none'; this.verifyInfo.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.hmacVerifier = new HMACVerifier(); });
export default HMACVerifier;
