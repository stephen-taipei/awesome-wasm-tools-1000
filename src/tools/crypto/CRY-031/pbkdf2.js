/**
 * CRY-031: PBKDF2 Key Derivation Tool
 * Uses Web Crypto API to derive keys using PBKDF2.
 */

class PBKDF2 {
  constructor() { this.init(); }

  init() {
    this.password = document.getElementById('password');
    this.salt = document.getElementById('salt');
    this.derivedKey = document.getElementById('derivedKey');
    this.algorithm = document.getElementById('algorithm');
    this.iterations = document.getElementById('iterations');
    this.keyLength = document.getElementById('keyLength');
    this.outputFormat = document.getElementById('outputFormat');
    this.deriveBtn = document.getElementById('deriveBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateSalt = document.getElementById('generateSalt');
    this.statusMessage = document.getElementById('statusMessage');
    this.deriveInfo = document.getElementById('deriveInfo');
    this.processTime = document.getElementById('processTime');
    this.bindEvents();
  }

  bindEvents() {
    this.deriveBtn.addEventListener('click', () => this.derive());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => {
      this.password.type = this.password.type === 'password' ? 'text' : 'password';
      this.togglePassword.textContent = this.password.type === 'password' ? '顯示' : '隱藏';
    });
    this.generateSalt.addEventListener('click', () => {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      this.salt.value = this.toHex(saltBytes);
      this.showStatus('info', '已生成 128 位元隨機鹽值');
    });
  }

  async derive() {
    if (!this.password.value) { this.showStatus('error', '請輸入密碼'); return; }
    if (!this.salt.value) { this.showStatus('error', '請輸入或生成鹽值'); return; }

    const startTime = performance.now();
    try {
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(this.password.value);
      const saltData = this.parseInput(this.salt.value.trim());
      const iterations = parseInt(this.iterations.value);
      const keyLengthBits = parseInt(this.keyLength.value);

      const keyMaterial = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: saltData,
        iterations: iterations,
        hash: this.algorithm.value
      }, keyMaterial, keyLengthBits);

      const key = new Uint8Array(derivedBits);
      const fmt = this.outputFormat.value;
      this.derivedKey.value = fmt === 'hex' ? this.toHex(key) : this.toBase64(key);
      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.deriveInfo.style.display = 'block';
      this.showStatus('success', 'PBKDF2 金鑰衍生完成！');
    } catch (e) { this.showStatus('error', '金鑰衍生失敗：' + e.message); }
  }

  parseInput(input) {
    if (/^[0-9a-fA-F]+$/.test(input)) return this.hexToBytes(input);
    try { return this.base64ToBytes(input); } catch { return new TextEncoder().encode(input); }
  }

  copyResult() { if (this.derivedKey.value) { navigator.clipboard.writeText(this.derivedKey.value); this.showStatus('success', '已複製到剪貼簿'); }}
  clear() { this.password.value = ''; this.salt.value = ''; this.derivedKey.value = ''; this.deriveInfo.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  toHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
  toBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
  hexToBytes(hex) { const b = new Uint8Array(hex.length / 2); for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16); return b; }
  base64ToBytes(b64) { const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return bytes; }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.pbkdf2 = new PBKDF2(); });
export default PBKDF2;
