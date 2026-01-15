/**
 * CRY-063: HOTP Verification Tool
 *
 * Verifies HMAC-based One-Time Passwords.
 * All processing is done locally in the browser.
 */

class HOTPVerifier {
  constructor() {
    this.init();
  }

  init() {
    this.secret = document.getElementById('secret');
    this.token = document.getElementById('token');
    this.counter = document.getElementById('counter');
    this.digits = document.getElementById('digits');
    this.lookAhead = document.getElementById('lookAhead');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.verifyResult = document.getElementById('verifyResult');
    this.resultDisplay = document.getElementById('resultDisplay');
    this.matchedCounter = document.getElementById('matchedCounter');
    this.matchedValue = document.getElementById('matchedValue');

    this.bindEvents();
  }

  bindEvents() {
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.token.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.verify();
    });
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

  async verify() {
    const secretValue = this.secret.value.trim();
    const tokenValue = this.token.value.trim();
    const counterValue = parseInt(this.counter.value);

    if (!secretValue) {
      this.showStatus('error', '請輸入密鑰');
      return;
    }

    if (!tokenValue) {
      this.showStatus('error', '請輸入驗證碼');
      return;
    }

    if (isNaN(counterValue) || counterValue < 0) {
      this.showStatus('error', '請輸入有效的計數器值');
      return;
    }

    try {
      const digitsCount = parseInt(this.digits.value);
      const lookAheadWindow = parseInt(this.lookAhead.value);
      const secretBytes = this.fromBase32(secretValue);

      let isValid = false;
      let matchedAt = -1;

      // Check current counter and look-ahead window
      for (let offset = 0; offset <= lookAheadWindow; offset++) {
        const hotp = await this.generateHOTP(secretBytes, counterValue + offset, digitsCount);
        if (hotp === tokenValue) {
          isValid = true;
          matchedAt = counterValue + offset;
          break;
        }
      }

      this.verifyResult.style.display = 'block';

      if (isValid) {
        this.resultDisplay.innerHTML = `
          <div style="font-size: 4rem;">✅</div>
          <div style="font-weight: bold; color: #22c55e; font-size: 1.5rem;">驗證成功</div>
          <div style="color: #666; margin-top: 0.5rem;">驗證碼有效</div>
        `;
        this.resultDisplay.style.background = '#f0fdf4';

        this.matchedCounter.style.display = 'flex';
        this.matchedValue.textContent = matchedAt;

        // Update counter to next expected value
        this.counter.value = matchedAt + 1;

        this.showStatus('success', '驗證成功');
      } else {
        this.resultDisplay.innerHTML = `
          <div style="font-size: 4rem;">❌</div>
          <div style="font-weight: bold; color: #ef4444; font-size: 1.5rem;">驗證失敗</div>
          <div style="color: #666; margin-top: 0.5rem;">驗證碼無效</div>
        `;
        this.resultDisplay.style.background = '#fef2f2';
        this.matchedCounter.style.display = 'none';

        this.showStatus('error', '驗證失敗');
      }
    } catch (error) {
      console.error('HOTP verification error:', error);
      this.showStatus('error', '驗證失敗：' + error.message);
    }
  }

  clear() {
    this.secret.value = '';
    this.token.value = '';
    this.counter.value = '0';
    this.verifyResult.style.display = 'none';
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
  window.hotpVerifier = new HOTPVerifier();
});

export default HOTPVerifier;
