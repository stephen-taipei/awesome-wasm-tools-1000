/**
 * CRY-033: bcrypt Password Hashing Tool
 * Uses noble-hashes library for bcrypt password hashing.
 * bcrypt is a widely used password hashing algorithm based on Blowfish.
 */

class BcryptHash {
  constructor() { this.bcrypt = null; this.init(); }

  async init() {
    try { this.bcrypt = await import('https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.2/+esm'); } catch (e) { console.warn('bcrypt library load failed'); }
    this.password = document.getElementById('password');
    this.hashResult = document.getElementById('hashResult');
    this.costFactor = document.getElementById('costFactor');
    this.hashBtn = document.getElementById('hashBtn');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.verifyResult = document.getElementById('verifyResult');
    this.resultIcon = document.getElementById('resultIcon');
    this.resultText = document.getElementById('resultText');
    this.hashInfo = document.getElementById('hashInfo');
    this.processTime = document.getElementById('processTime');
    this.bindEvents();
  }

  bindEvents() {
    this.hashBtn.addEventListener('click', () => this.hash());
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => {
      this.password.type = this.password.type === 'password' ? 'text' : 'password';
      this.togglePassword.textContent = this.password.type === 'password' ? '顯示' : '隱藏';
    });
  }

  async hash() {
    if (!this.bcrypt) { this.showStatus('error', 'bcrypt 函式庫載入失敗'); return; }
    if (!this.password.value) { this.showStatus('error', '請輸入密碼'); return; }

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '30%';
    this.progressText.textContent = '計算中...';
    this.hashBtn.disabled = true;

    const startTime = performance.now();
    try {
      await new Promise(r => setTimeout(r, 50));

      const encoder = new TextEncoder();
      const passwordData = encoder.encode(this.password.value);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const cost = parseInt(this.costFactor.value);

      this.progressFill.style.width = '60%';

      const hash = this.bcrypt.bcrypt(passwordData, salt, { cost });

      // Format as bcrypt string
      const saltB64 = this.toBase64Bcrypt(salt);
      const hashB64 = this.toBase64Bcrypt(hash);
      const bcryptHash = `$2b$${cost.toString().padStart(2, '0')}$${saltB64}${hashB64}`;

      this.progressFill.style.width = '100%';
      this.hashResult.value = bcryptHash;
      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'bcrypt 雜湊完成！');
        this.hashBtn.disabled = false;
      }, 300);
    } catch (e) {
      this.progressContainer.classList.remove('active');
      this.hashBtn.disabled = false;
      this.showStatus('error', '雜湊失敗：' + e.message);
    }
  }

  async verify() {
    if (!this.password.value) { this.showStatus('error', '請輸入密碼'); return; }
    if (!this.hashResult.value) { this.showStatus('error', '請輸入要驗證的雜湊值'); return; }

    const startTime = performance.now();
    try {
      const bcryptStr = this.hashResult.value.trim();
      const parts = bcryptStr.match(/^\$2[aby]?\$(\d{2})\$(.{22})(.{31})$/);
      if (!parts) { this.showStatus('error', '無效的 bcrypt 雜湊格式'); return; }

      const cost = parseInt(parts[1]);
      const saltB64 = parts[2];
      const hashB64 = parts[3];

      const salt = this.fromBase64Bcrypt(saltB64);
      const storedHash = this.fromBase64Bcrypt(hashB64);

      const encoder = new TextEncoder();
      const passwordData = encoder.encode(this.password.value);
      const computedHash = this.bcrypt.bcrypt(passwordData, salt, { cost });

      const isValid = this.timingSafeEqual(storedHash, computedHash);

      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';
      this.verifyResult.style.display = 'flex';

      if (isValid) {
        this.verifyResult.className = 'result-box success';
        this.resultIcon.textContent = '✓';
        this.resultText.textContent = '密碼驗證成功！';
        this.showStatus('success', '密碼正確！');
      } else {
        this.verifyResult.className = 'result-box error';
        this.resultIcon.textContent = '✗';
        this.resultText.textContent = '密碼驗證失敗！';
        this.showStatus('error', '密碼錯誤！');
      }
    } catch (e) { this.showStatus('error', '驗證失敗：' + e.message); }
  }

  timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
    return result === 0;
  }

  toBase64Bcrypt(bytes) {
    const bcryptChars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i], b2 = bytes[i + 1] || 0, b3 = bytes[i + 2] || 0;
      result += bcryptChars[b1 >> 2];
      result += bcryptChars[((b1 & 3) << 4) | (b2 >> 4)];
      if (i + 1 < bytes.length) result += bcryptChars[((b2 & 15) << 2) | (b3 >> 6)];
      if (i + 2 < bytes.length) result += bcryptChars[b3 & 63];
    }
    return result;
  }

  fromBase64Bcrypt(str) {
    const bcryptChars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = [];
    for (let i = 0; i < str.length; i += 4) {
      const c1 = bcryptChars.indexOf(str[i]), c2 = bcryptChars.indexOf(str[i + 1]);
      const c3 = bcryptChars.indexOf(str[i + 2]), c4 = bcryptChars.indexOf(str[i + 3]);
      bytes.push((c1 << 2) | (c2 >> 4));
      if (c3 >= 0) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
      if (c4 >= 0) bytes.push(((c3 & 3) << 6) | c4);
    }
    return new Uint8Array(bytes);
  }

  copyResult() { if (this.hashResult.value) { navigator.clipboard.writeText(this.hashResult.value); this.showStatus('success', '已複製到剪貼簿'); }}
  clear() { this.password.value = ''; this.hashResult.value = ''; this.hashInfo.style.display = 'none'; this.verifyResult.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.bcryptHash = new BcryptHash(); });
export default BcryptHash;
