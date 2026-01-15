/**
 * CRY-059: JWK Conversion Tool
 *
 * Converts between JWK and PEM formats.
 * All processing is done locally in the browser.
 */

class JWKConverter {
  constructor() {
    this.outputContent = '';
    this.init();
  }

  init() {
    this.direction = document.getElementById('direction');
    this.jwkInput = document.getElementById('jwkInput');
    this.pemInput = document.getElementById('pemInput');
    this.jwkText = document.getElementById('jwkText');
    this.pemText = document.getElementById('pemText');
    this.pemFile = document.getElementById('pemFile');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.output = document.getElementById('output');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.direction.addEventListener('change', () => this.toggleInputs());
    this.pemFile.addEventListener('change', (e) => this.loadFile(e));
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  toggleInputs() {
    const isJwkToPem = this.direction.value === 'jwk-to-pem';
    this.jwkInput.style.display = isJwkToPem ? 'block' : 'none';
    this.pemInput.style.display = isJwkToPem ? 'none' : 'block';
  }

  async loadFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.pemText.value = text;
      this.showStatus('info', '檔案已載入');
    }
  }

  async convert() {
    try {
      if (this.direction.value === 'jwk-to-pem') {
        await this.jwkToPem();
      } else {
        await this.pemToJwk();
      }
    } catch (error) {
      console.error('Conversion error:', error);
      this.showStatus('error', '轉換失敗：' + error.message);
    }
  }

  async jwkToPem() {
    const jwkText = this.jwkText.value.trim();

    if (!jwkText) {
      this.showStatus('error', '請輸入 JWK');
      return;
    }

    const jwk = JSON.parse(jwkText);

    // Determine key type and import
    let key;
    let isPrivate = false;
    let algorithm;

    if (jwk.kty === 'EC') {
      algorithm = { name: 'ECDSA', namedCurve: jwk.crv };
      isPrivate = !!jwk.d;
      key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        algorithm,
        true,
        isPrivate ? ['sign'] : ['verify']
      );
    } else if (jwk.kty === 'RSA') {
      algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
      isPrivate = !!jwk.d;
      key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        algorithm,
        true,
        isPrivate ? ['sign'] : ['verify']
      );
    } else {
      throw new Error('不支援的金鑰類型: ' + jwk.kty);
    }

    // Export to PEM format
    const format = isPrivate ? 'pkcs8' : 'spki';
    const exported = await crypto.subtle.exportKey(format, key);
    const type = isPrivate ? 'PRIVATE KEY' : 'PUBLIC KEY';

    this.outputContent = this.arrayBufferToPem(exported, type);
    this.output.value = this.outputContent;

    this.showStatus('success', '轉換完成！');
  }

  async pemToJwk() {
    const pemText = this.pemText.value.trim();

    if (!pemText) {
      this.showStatus('error', '請輸入 PEM');
      return;
    }

    // Extract base64 and determine type
    const base64 = this.extractBase64FromPem(pemText);
    const isPrivate = pemText.includes('PRIVATE KEY');
    const derData = this.base64ToArrayBuffer(base64);

    // Try to import as different key types
    let key;
    let algorithm;

    // Try EC first
    try {
      algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
      key = await crypto.subtle.importKey(
        isPrivate ? 'pkcs8' : 'spki',
        derData,
        algorithm,
        true,
        isPrivate ? ['sign'] : ['verify']
      );
    } catch {
      // Try P-384
      try {
        algorithm = { name: 'ECDSA', namedCurve: 'P-384' };
        key = await crypto.subtle.importKey(
          isPrivate ? 'pkcs8' : 'spki',
          derData,
          algorithm,
          true,
          isPrivate ? ['sign'] : ['verify']
        );
      } catch {
        // Try RSA
        try {
          algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
          key = await crypto.subtle.importKey(
            isPrivate ? 'pkcs8' : 'spki',
            derData,
            algorithm,
            true,
            isPrivate ? ['sign'] : ['verify']
          );
        } catch (e) {
          throw new Error('無法識別金鑰類型');
        }
      }
    }

    const jwk = await crypto.subtle.exportKey('jwk', key);
    this.outputContent = JSON.stringify(jwk, null, 2);
    this.output.value = this.outputContent;

    this.showStatus('success', '轉換完成！');
  }

  extractBase64FromPem(pem) {
    const lines = pem.split('\n');
    let base64 = '';
    let inBlock = false;

    for (const line of lines) {
      if (line.includes('-----BEGIN')) {
        inBlock = true;
        continue;
      }
      if (line.includes('-----END')) break;
      if (inBlock && line.trim()) {
        base64 += line.trim();
      }
    }

    return base64;
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  arrayBufferToPem(buffer, type) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
  }

  copy() {
    if (this.outputContent) {
      navigator.clipboard.writeText(this.outputContent);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  download() {
    if (this.outputContent) {
      const isJwk = this.direction.value === 'pem-to-jwk';
      const filename = isJwk ? 'key.jwk' : 'key.pem';
      const type = isJwk ? 'application/json' : 'text/plain';

      const blob = new Blob([this.outputContent], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  clear() {
    this.jwkText.value = '';
    this.pemText.value = '';
    this.output.value = '';
    this.outputContent = '';
    this.pemFile.value = '';
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
  window.jwkConverter = new JWKConverter();
});

export default JWKConverter;
