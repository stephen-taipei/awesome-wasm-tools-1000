/**
 * CRY-055: JWT Decode Tool
 *
 * Decodes JWT without verification.
 * All processing is done locally in the browser.
 */

class JWTDecoder {
  constructor() {
    this.header = null;
    this.payload = null;
    this.init();
  }

  init() {
    this.jwt = document.getElementById('jwt');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyHeader = document.getElementById('copyHeader');
    this.copyPayload = document.getElementById('copyPayload');
    this.statusMessage = document.getElementById('statusMessage');
    this.decodeResult = document.getElementById('decodeResult');
    this.headerOutput = document.getElementById('headerOutput');
    this.payloadOutput = document.getElementById('payloadOutput');
    this.signatureOutput = document.getElementById('signatureOutput');
    this.claimsList = document.getElementById('claimsList');

    this.bindEvents();
  }

  bindEvents() {
    this.jwt.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyHeader.addEventListener('click', () => this.copyToClipboard(JSON.stringify(this.header, null, 2), 'Header'));
    this.copyPayload.addEventListener('click', () => this.copyToClipboard(JSON.stringify(this.payload, null, 2), 'Payload'));
  }

  decode() {
    const jwtValue = this.jwt.value.trim();

    if (!jwtValue) {
      this.decodeResult.style.display = 'none';
      return;
    }

    try {
      const parts = jwtValue.split('.');
      if (parts.length !== 3) {
        this.showStatus('error', 'JWT 格式錯誤，應包含三個部分');
        this.decodeResult.style.display = 'none';
        return;
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Decode header
      this.header = JSON.parse(this.base64UrlDecode(encodedHeader));
      this.headerOutput.textContent = JSON.stringify(this.header, null, 2);

      // Decode payload
      this.payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      this.payloadOutput.textContent = JSON.stringify(this.payload, null, 2);

      // Show signature
      this.signatureOutput.textContent = signature;

      // Parse standard claims
      this.parseClaims(this.payload);

      this.decodeResult.style.display = 'block';
      this.showStatus('success', 'JWT 解碼完成');
    } catch (error) {
      console.error('JWT decode error:', error);
      this.showStatus('error', '解碼失敗：' + error.message);
      this.decodeResult.style.display = 'none';
    }
  }

  parseClaims(payload) {
    const claims = [];
    const now = Math.floor(Date.now() / 1000);

    const claimNames = {
      iss: '發行者 (Issuer)',
      sub: '主體 (Subject)',
      aud: '受眾 (Audience)',
      exp: '過期時間 (Expiration)',
      nbf: '生效時間 (Not Before)',
      iat: '簽發時間 (Issued At)',
      jti: 'JWT ID'
    };

    for (const [key, label] of Object.entries(claimNames)) {
      if (payload[key] !== undefined) {
        let value = payload[key];
        let status = 'info';
        let displayValue = value;

        if (key === 'exp') {
          const expDate = new Date(value * 1000);
          displayValue = expDate.toLocaleString();
          if (value < now) {
            status = 'error';
            displayValue += ' (已過期)';
          } else {
            const remaining = value - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            displayValue += ` (剩餘 ${hours}h ${minutes}m)`;
            status = 'success';
          }
        } else if (key === 'nbf') {
          const nbfDate = new Date(value * 1000);
          displayValue = nbfDate.toLocaleString();
          if (value > now) {
            status = 'warning';
            displayValue += ' (尚未生效)';
          } else {
            status = 'success';
            displayValue += ' (已生效)';
          }
        } else if (key === 'iat') {
          displayValue = new Date(value * 1000).toLocaleString();
        } else if (key === 'aud') {
          displayValue = Array.isArray(value) ? value.join(', ') : value;
        }

        claims.push({ key, label, value: displayValue, status });
      }
    }

    // Count custom claims
    const standardClaims = Object.keys(claimNames);
    const customClaims = Object.keys(payload).filter(k => !standardClaims.includes(k));
    if (customClaims.length > 0) {
      claims.push({
        key: 'custom',
        label: '自定義聲明',
        value: customClaims.join(', '),
        status: 'info'
      });
    }

    this.claimsList.innerHTML = claims.map(claim => {
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
          <label>${icons[claim.status]} ${claim.label}</label>
          <span style="color: ${colors[claim.status]};">${claim.value}</span>
        </div>
      `;
    }).join('');
  }

  base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }

  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    this.showStatus('success', `${label} 已複製到剪貼簿`);
  }

  clear() {
    this.jwt.value = '';
    this.header = null;
    this.payload = null;
    this.decodeResult.style.display = 'none';
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
  window.jwtDecoder = new JWTDecoder();
});

export default JWTDecoder;
