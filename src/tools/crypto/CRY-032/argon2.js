/**
 * CRY-032: Argon2 Password Hashing Tool
 * Uses noble-hashes library for Argon2 password hashing.
 * Argon2 is the winner of the Password Hashing Competition.
 */

class Argon2Hash {
  constructor() { this.argon2 = null; this.init(); }

  async init() {
    try { this.argon2 = await import('https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.2/+esm'); } catch (e) { console.warn('Argon2 library load failed'); }
    this.password = document.getElementById('password');
    this.salt = document.getElementById('salt');
    this.hashResult = document.getElementById('hashResult');
    this.variant = document.getElementById('variant');
    this.memory = document.getElementById('memory');
    this.iterations = document.getElementById('iterations');
    this.parallelism = document.getElementById('parallelism');
    this.hashLength = document.getElementById('hashLength');
    this.hashBtn = document.getElementById('hashBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateSalt = document.getElementById('generateSalt');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.hashInfo = document.getElementById('hashInfo');
    this.processTime = document.getElementById('processTime');
    this.bindEvents();
  }

  bindEvents() {
    this.hashBtn.addEventListener('click', () => this.hash());
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

  async hash() {
    if (!this.argon2) { this.showStatus('error', 'Argon2 函式庫載入失敗'); return; }
    if (!this.password.value) { this.showStatus('error', '請輸入密碼'); return; }
    if (!this.salt.value) { this.showStatus('error', '請輸入或生成鹽值'); return; }

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '30%';
    this.progressText.textContent = '計算中...';
    this.hashBtn.disabled = true;

    const startTime = performance.now();
    try {
      await new Promise(r => setTimeout(r, 50)); // Allow UI update

      const encoder = new TextEncoder();
      const passwordData = encoder.encode(this.password.value);
      const saltData = this.hexToBytes(this.salt.value.trim());

      const variant = this.variant.value;
      const m = parseInt(this.memory.value);
      const t = parseInt(this.iterations.value);
      const p = parseInt(this.parallelism.value);
      const dkLen = parseInt(this.hashLength.value);

      this.progressFill.style.width = '60%';

      let hash;
      if (variant === 'argon2id') hash = this.argon2.argon2id(passwordData, saltData, { t, m, p, dkLen });
      else if (variant === 'argon2i') hash = this.argon2.argon2i(passwordData, saltData, { t, m, p, dkLen });
      else hash = this.argon2.argon2d(passwordData, saltData, { t, m, p, dkLen });

      this.progressFill.style.width = '100%';
      this.hashResult.value = this.toHex(hash);
      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'Argon2 雜湊完成！');
        this.hashBtn.disabled = false;
      }, 300);
    } catch (e) {
      this.progressContainer.classList.remove('active');
      this.hashBtn.disabled = false;
      this.showStatus('error', '雜湊失敗：' + e.message);
    }
  }

  copyResult() { if (this.hashResult.value) { navigator.clipboard.writeText(this.hashResult.value); this.showStatus('success', '已複製到剪貼簿'); }}
  clear() { this.password.value = ''; this.salt.value = ''; this.hashResult.value = ''; this.hashInfo.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  toHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
  hexToBytes(hex) { const b = new Uint8Array(hex.length / 2); for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16); return b; }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.argon2Hash = new Argon2Hash(); });
export default Argon2Hash;
