/**
 * CRY-029: HMAC Generation Tool
 * Uses Web Crypto API to generate HMAC (Hash-based Message Authentication Code).
 */

class HMACGenerator {
  constructor() { this.init(); }

  init() {
    this.secretKey = document.getElementById('secretKey');
    this.message = document.getElementById('message');
    this.hmacResult = document.getElementById('hmacResult');
    this.algorithm = document.getElementById('algorithm');
    this.outputFormat = document.getElementById('outputFormat');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.toggleKey = document.getElementById('toggleKey');
    this.generateKey = document.getElementById('generateKey');
    this.statusMessage = document.getElementById('statusMessage');
    this.hmacInfo = document.getElementById('hmacInfo');
    this.processTime = document.getElementById('processTime');
    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.toggleKey.addEventListener('click', () => {
      this.secretKey.type = this.secretKey.type === 'password' ? 'text' : 'password';
      this.toggleKey.textContent = this.secretKey.type === 'password' ? '顯示' : '隱藏';
    });
    this.generateKey.addEventListener('click', () => {
      const keyBytes = crypto.getRandomValues(new Uint8Array(32));
      this.secretKey.value = this.toBase64(keyBytes);
      this.secretKey.type = 'text';
      this.toggleKey.textContent = '隱藏';
      this.showStatus('info', '已生成 256 位元隨機密鑰');
    });
  }

  async generate() {
    if (!this.secretKey.value) { this.showStatus('error', '請輸入密鑰'); return; }
    if (!this.message.value) { this.showStatus('error', '請輸入訊息'); return; }

    const startTime = performance.now();
    try {
      const algorithm = this.algorithm.value;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.secretKey.value);
      const messageData = encoder.encode(this.message.value);

      const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: algorithm }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const hmac = new Uint8Array(signature);

      const fmt = this.outputFormat.value;
      this.hmacResult.value = fmt === 'hex' ? this.toHex(hmac) : fmt === 'HEX' ? this.toHex(hmac).toUpperCase() : this.toBase64(hmac);
      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.hmacInfo.style.display = 'block';
      this.showStatus('success', 'HMAC 生成完成！');
    } catch (e) { this.showStatus('error', 'HMAC 生成失敗：' + e.message); }
  }

  copyResult() { if (this.hmacResult.value) { navigator.clipboard.writeText(this.hmacResult.value); this.showStatus('success', '已複製到剪貼簿'); }}
  clear() { this.secretKey.value = ''; this.message.value = ''; this.hmacResult.value = ''; this.hmacInfo.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  toHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
  toBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.hmacGenerator = new HMACGenerator(); });
export default HMACGenerator;
