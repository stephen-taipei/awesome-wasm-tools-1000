/**
 * CRY-053: JWT Generation Tool
 *
 * Generates JSON Web Tokens.
 * All processing is done locally in the browser.
 */

class JWTGenerator {
  constructor() {
    this.init();
  }

  init() {
    this.algorithm = document.getElementById('algorithm');
    this.secret = document.getElementById('secret');
    this.toggleSecret = document.getElementById('toggleSecret');
    this.generateSecret = document.getElementById('generateSecret');
    this.payload = document.getElementById('payload');
    this.expiresIn = document.getElementById('expiresIn');
    this.issuer = document.getElementById('issuer');
    this.subject = document.getElementById('subject');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.jwtOutput = document.getElementById('jwtOutput');
    this.jwtInfo = document.getElementById('jwtInfo');
    this.headerDisplay = document.getElementById('headerDisplay');
    this.payloadDisplay = document.getElementById('payloadDisplay');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.toggleSecret.addEventListener('click', () => this.toggleSecretVisibility());
    this.generateSecret.addEventListener('click', () => this.generateRandomSecret());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  async generate() {
    const secretValue = this.secret.value.trim();

    if (!secretValue) {
      this.showStatus('error', '請輸入密鑰');
      return;
    }

    let payloadObj;
    try {
      payloadObj = this.payload.value.trim() ? JSON.parse(this.payload.value) : {};
    } catch (e) {
      this.showStatus('error', 'Payload JSON 格式錯誤');
      return;
    }

    try {
      // Add standard claims
      const now = Math.floor(Date.now() / 1000);

      if (!payloadObj.iat) {
        payloadObj.iat = now;
      }

      if (this.expiresIn.value && !payloadObj.exp) {
        payloadObj.exp = now + parseInt(this.expiresIn.value);
      }

      if (this.issuer.value.trim() && !payloadObj.iss) {
        payloadObj.iss = this.issuer.value.trim();
      }

      if (this.subject.value.trim() && !payloadObj.sub) {
        payloadObj.sub = this.subject.value.trim();
      }

      // Create header
      const header = {
        alg: this.algorithm.value,
        typ: 'JWT'
      };

      // Encode header and payload
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payloadObj));

      // Create signature
      const data = `${encodedHeader}.${encodedPayload}`;
      const signature = await this.sign(data, secretValue, this.algorithm.value);

      // Create JWT
      const jwt = `${data}.${signature}`;
      this.jwtOutput.value = jwt;

      // Display info
      this.headerDisplay.textContent = JSON.stringify(header, null, 2);
      this.payloadDisplay.textContent = JSON.stringify(payloadObj, null, 2);
      this.jwtInfo.style.display = 'block';

      this.showStatus('success', 'JWT 生成完成！');
    } catch (error) {
      console.error('JWT generation error:', error);
      this.showStatus('error', 'JWT 生成失敗：' + error.message);
    }
  }

  async sign(data, secret, algorithm) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const hashAlgorithm = {
      'HS256': 'SHA-256',
      'HS384': 'SHA-384',
      'HS512': 'SHA-512'
    }[algorithm];

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlgorithm },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );

    return this.base64UrlEncode(new Uint8Array(signature));
  }

  base64UrlEncode(input) {
    let base64;
    if (typeof input === 'string') {
      base64 = btoa(unescape(encodeURIComponent(input)));
    } else {
      let binary = '';
      for (let i = 0; i < input.length; i++) {
        binary += String.fromCharCode(input[i]);
      }
      base64 = btoa(binary);
    }

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  generateRandomSecret() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    this.secret.value = btoa(binary);
    this.secret.type = 'text';
    this.toggleSecret.textContent = '隱藏';
    this.showStatus('info', '已生成隨機密鑰');
  }

  toggleSecretVisibility() {
    if (this.secret.type === 'password') {
      this.secret.type = 'text';
      this.toggleSecret.textContent = '隱藏';
    } else {
      this.secret.type = 'password';
      this.toggleSecret.textContent = '顯示';
    }
  }

  copy() {
    if (this.jwtOutput.value) {
      navigator.clipboard.writeText(this.jwtOutput.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.secret.value = '';
    this.payload.value = '';
    this.issuer.value = '';
    this.subject.value = '';
    this.jwtOutput.value = '';
    this.jwtInfo.style.display = 'none';
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
  window.jwtGenerator = new JWTGenerator();
});

export default JWTGenerator;
