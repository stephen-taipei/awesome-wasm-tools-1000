/**
 * CRY-060: TOTP Generation Tool
 *
 * Generates Time-based One-Time Passwords.
 * All processing is done locally in the browser.
 */

class TOTPGenerator {
  constructor() {
    this.updateInterval = null;
    this.init();
  }

  init() {
    this.secret = document.getElementById('secret');
    this.digits = document.getElementById('digits');
    this.period = document.getElementById('period');
    this.algorithm = document.getElementById('algorithm');
    this.generateSecret = document.getElementById('generateSecret');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyTotp = document.getElementById('copyTotp');
    this.statusMessage = document.getElementById('statusMessage');
    this.totpResult = document.getElementById('totpResult');
    this.totpDisplay = document.getElementById('totpDisplay');
    this.timeBar = document.getElementById('timeBar');
    this.timeRemaining = document.getElementById('timeRemaining');
    this.timestamp = document.getElementById('timestamp');
    this.counter = document.getElementById('counter');

    this.bindEvents();
  }

  bindEvents() {
    this.generateSecret.addEventListener('click', () => this.generateRandomSecret());
    this.generateBtn.addEventListener('click', () => this.startGeneration());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyTotp.addEventListener('click', () => this.copy());
  }

  generateRandomSecret() {
    // Generate 20 random bytes and encode as Base32
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const secret = this.toBase32(bytes);
    this.secret.value = secret;
    this.showStatus('info', '已生成隨機密鑰');
  }

  toBase32(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, '0');
    }

    let result = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.substring(i, i + 5).padEnd(5, '0');
      result += alphabet[parseInt(chunk, 2)];
    }

    return result;
  }

  fromBase32(secret) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = '';
    for (const char of cleaned) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, '0');
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    return new Uint8Array(bytes);
  }

  startGeneration() {
    const secretValue = this.secret.value.trim();

    if (!secretValue) {
      this.showStatus('error', '請輸入密鑰');
      return;
    }

    // Stop any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.totpResult.style.display = 'block';

    // Generate immediately and then set interval
    this.generate();
    this.updateInterval = setInterval(() => this.generate(), 1000);

    this.showStatus('success', 'TOTP 生成中...');
  }

  async generate() {
    try {
      const secretValue = this.secret.value.trim();
      const digitsCount = parseInt(this.digits.value);
      const periodSeconds = parseInt(this.period.value);
      const algorithmName = this.algorithm.value;

      // Get current time
      const now = Math.floor(Date.now() / 1000);
      const counterValue = Math.floor(now / periodSeconds);

      // Update progress bar
      const elapsed = now % periodSeconds;
      const remaining = periodSeconds - elapsed;
      const percentage = (remaining / periodSeconds) * 100;
      this.timeBar.style.width = percentage + '%';
      this.timeRemaining.textContent = remaining + 's';

      // Update info
      this.timestamp.textContent = now;
      this.counter.textContent = counterValue;

      // Decode secret
      const secretBytes = this.fromBase32(secretValue);

      // Generate HMAC
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: algorithmName },
        false,
        ['sign']
      );

      // Counter to bytes (8 bytes, big-endian)
      const counterBytes = new Uint8Array(8);
      let temp = counterValue;
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = temp & 0xff;
        temp = Math.floor(temp / 256);
      }

      const hmac = await crypto.subtle.sign('HMAC', key, counterBytes);
      const hmacBytes = new Uint8Array(hmac);

      // Dynamic truncation
      const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
      const code = (
        ((hmacBytes[offset] & 0x7f) << 24) |
        ((hmacBytes[offset + 1] & 0xff) << 16) |
        ((hmacBytes[offset + 2] & 0xff) << 8) |
        (hmacBytes[offset + 3] & 0xff)
      ) % Math.pow(10, digitsCount);

      const totp = code.toString().padStart(digitsCount, '0');
      this.totpDisplay.textContent = totp;

      // Change color when time is running low
      if (remaining <= 5) {
        this.totpDisplay.style.color = '#ef4444';
        this.timeBar.style.background = '#ef4444';
      } else {
        this.totpDisplay.style.color = '#22c55e';
        this.timeBar.style.background = '#22c55e';
      }
    } catch (error) {
      console.error('TOTP generation error:', error);
      this.showStatus('error', '生成失敗：' + error.message);
    }
  }

  copy() {
    const totp = this.totpDisplay.textContent;
    if (totp) {
      navigator.clipboard.writeText(totp);
      this.showStatus('success', '驗證碼已複製');
    }
  }

  clear() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.secret.value = '';
    this.totpResult.style.display = 'none';
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
  window.totpGenerator = new TOTPGenerator();
});

export default TOTPGenerator;
