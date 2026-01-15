/**
 * CRY-054: JWT Verification Tool
 *
 * Verifies JSON Web Token signatures.
 * All processing is done locally in the browser.
 */

class JWTVerifier {
  constructor() {
    this.init();
  }

  init() {
    this.jwt = document.getElementById('jwt');
    this.secret = document.getElementById('secret');
    this.toggleSecret = document.getElementById('toggleSecret');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.verificationResult = document.getElementById('verificationResult');
    this.signatureResult = document.getElementById('signatureResult');
    this.checkResults = document.getElementById('checkResults');
    this.headerOutput = document.getElementById('headerOutput');
    this.payloadOutput = document.getElementById('payloadOutput');

    this.bindEvents();
  }

  bindEvents() {
    this.toggleSecret.addEventListener('click', () => this.toggleSecretVisibility());
    this.verifyBtn.addEventListener('click', () => this.verify());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  async verify() {
    const jwtValue = this.jwt.value.trim();
    const secretValue = this.secret.value.trim();

    if (!jwtValue) {
      this.showStatus('error', '請輸入 JWT');
      return;
    }

    if (!secretValue) {
      this.showStatus('error', '請輸入密鑰');
      return;
    }

    try {
      const parts = jwtValue.split('.');
      if (parts.length !== 3) {
        this.showStatus('error', 'JWT 格式錯誤，應包含三個部分');
        return;
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Decode header and payload
      const header = JSON.parse(this.base64UrlDecode(encodedHeader));
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // Display header and payload
      this.headerOutput.textContent = JSON.stringify(header, null, 2);
      this.payloadOutput.textContent = JSON.stringify(payload, null, 2);

      // Verify signature
      const checks = [];
      let allValid = true;

      // Check algorithm
      const algorithm = header.alg;
      if (!['HS256', 'HS384', 'HS512'].includes(algorithm)) {
        checks.push({ name: '演算法', status: 'error', message: `不支援的演算法: ${algorithm}` });
        allValid = false;
      } else {
        checks.push({ name: '演算法', status: 'success', message: algorithm });

        // Verify signature
        const data = `${encodedHeader}.${encodedPayload}`;
        const expectedSignature = await this.sign(data, secretValue, algorithm);

        if (signature === expectedSignature) {
          checks.push({ name: '簽章', status: 'success', message: '簽章有效' });
        } else {
          checks.push({ name: '簽章', status: 'error', message: '簽章無效' });
          allValid = false;
        }
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp) {
        if (payload.exp < now) {
          checks.push({ name: '過期時間 (exp)', status: 'error', message: `已過期 (${new Date(payload.exp * 1000).toLocaleString()})` });
          allValid = false;
        } else {
          const remaining = payload.exp - now;
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          checks.push({ name: '過期時間 (exp)', status: 'success', message: `有效 (剩餘 ${hours}h ${minutes}m)` });
        }
      } else {
        checks.push({ name: '過期時間 (exp)', status: 'warning', message: '未設定' });
      }

      // Check not before
      if (payload.nbf) {
        if (payload.nbf > now) {
          checks.push({ name: '生效時間 (nbf)', status: 'error', message: `尚未生效 (${new Date(payload.nbf * 1000).toLocaleString()})` });
          allValid = false;
        } else {
          checks.push({ name: '生效時間 (nbf)', status: 'success', message: '已生效' });
        }
      }

      // Check issued at
      if (payload.iat) {
        checks.push({ name: '簽發時間 (iat)', status: 'info', message: new Date(payload.iat * 1000).toLocaleString() });
      }

      // Check issuer
      if (payload.iss) {
        checks.push({ name: '發行者 (iss)', status: 'info', message: payload.iss });
      }

      // Check subject
      if (payload.sub) {
        checks.push({ name: '主體 (sub)', status: 'info', message: payload.sub });
      }

      // Display results
      this.displayResults(allValid, checks);
      this.verificationResult.style.display = 'block';

      this.showStatus(allValid ? 'success' : 'error', allValid ? 'JWT 驗證通過' : 'JWT 驗證失敗');
    } catch (error) {
      console.error('JWT verification error:', error);
      this.showStatus('error', '驗證失敗：' + error.message);
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

  base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }

  base64UrlEncode(input) {
    let binary = '';
    for (let i = 0; i < input.length; i++) {
      binary += String.fromCharCode(input[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  displayResults(allValid, checks) {
    if (allValid) {
      this.signatureResult.innerHTML = `
        <div style="font-size: 3rem;">✅</div>
        <div style="font-weight: bold; color: #22c55e;">JWT 驗證通過</div>
      `;
      this.signatureResult.style.background = '#f0fdf4';
    } else {
      this.signatureResult.innerHTML = `
        <div style="font-size: 3rem;">❌</div>
        <div style="font-weight: bold; color: #ef4444;">JWT 驗證失敗</div>
      `;
      this.signatureResult.style.background = '#fef2f2';
    }

    this.checkResults.innerHTML = checks.map(check => {
      const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      };
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      return `
        <div class="setting-row">
          <label>${icons[check.status]} ${check.name}</label>
          <span style="color: ${colors[check.status]};">${check.message}</span>
        </div>
      `;
    }).join('');
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

  clear() {
    this.jwt.value = '';
    this.secret.value = '';
    this.verificationResult.style.display = 'none';
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
  window.jwtVerifier = new JWTVerifier();
});

export default JWTVerifier;
