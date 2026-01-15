/**
 * CRY-062: HOTP Generation Tool
 *
 * Generates HMAC-based One-Time Passwords.
 * All processing is done locally in the browser.
 */

class HOTPGenerator {
  constructor() {
    this.history = [];
    this.init();
  }

  init() {
    this.secret = document.getElementById('secret');
    this.counter = document.getElementById('counter');
    this.digits = document.getElementById('digits');
    this.generateSecret = document.getElementById('generateSecret');
    this.incrementCounter = document.getElementById('incrementCounter');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyHotp = document.getElementById('copyHotp');
    this.statusMessage = document.getElementById('statusMessage');
    this.hotpResult = document.getElementById('hotpResult');
    this.hotpDisplay = document.getElementById('hotpDisplay');
    this.usedCounter = document.getElementById('usedCounter');
    this.hotpHistory = document.getElementById('hotpHistory');
    this.historyTable = document.getElementById('historyTable');

    this.bindEvents();
  }

  bindEvents() {
    this.generateSecret.addEventListener('click', () => this.generateRandomSecret());
    this.incrementCounter.addEventListener('click', () => this.increment());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyHotp.addEventListener('click', () => this.copy());
  }

  generateRandomSecret() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const secret = this.toBase32(bytes);
    this.secret.value = secret;
    this.showStatus('info', '已生成隨機密鑰');
  }

  increment() {
    this.counter.value = parseInt(this.counter.value) + 1;
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

  async generate() {
    const secretValue = this.secret.value.trim();
    const counterValue = parseInt(this.counter.value);

    if (!secretValue) {
      this.showStatus('error', '請輸入密鑰');
      return;
    }

    if (isNaN(counterValue) || counterValue < 0) {
      this.showStatus('error', '請輸入有效的計數器值');
      return;
    }

    try {
      const digitsCount = parseInt(this.digits.value);
      const secretBytes = this.fromBase32(secretValue);

      const hotp = await this.generateHOTP(secretBytes, counterValue, digitsCount);

      this.hotpDisplay.textContent = hotp;
      this.usedCounter.textContent = counterValue;
      this.hotpResult.style.display = 'block';

      // Add to history
      this.history.unshift({ counter: counterValue, hotp: hotp });
      if (this.history.length > 10) {
        this.history.pop();
      }
      this.updateHistory();

      // Auto increment counter
      this.counter.value = counterValue + 1;

      this.showStatus('success', 'HOTP 生成成功');
    } catch (error) {
      console.error('HOTP generation error:', error);
      this.showStatus('error', '生成失敗：' + error.message);
    }
  }

  async generateHOTP(secretBytes, counterValue, digitsCount) {
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const counterBytes = new Uint8Array(8);
    let temp = counterValue;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }

    const hmac = await crypto.subtle.sign('HMAC', key, counterBytes);
    const hmacBytes = new Uint8Array(hmac);

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const code = (
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff)
    ) % Math.pow(10, digitsCount);

    return code.toString().padStart(digitsCount, '0');
  }

  updateHistory() {
    this.historyTable.innerHTML = this.history.map(item => `
      <tr>
        <td class="mono">${item.counter}</td>
        <td class="mono">${item.hotp}</td>
      </tr>
    `).join('');
    this.hotpHistory.style.display = this.history.length > 0 ? 'block' : 'none';
  }

  copy() {
    const hotp = this.hotpDisplay.textContent;
    if (hotp) {
      navigator.clipboard.writeText(hotp);
      this.showStatus('success', '驗證碼已複製');
    }
  }

  clear() {
    this.secret.value = '';
    this.counter.value = '0';
    this.history = [];
    this.hotpResult.style.display = 'none';
    this.hotpHistory.style.display = 'none';
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
  window.hotpGenerator = new HOTPGenerator();
});

export default HOTPGenerator;
