/**
 * CRY-008: ECC Key Generation Tool
 *
 * Uses Web Crypto API to generate Elliptic Curve key pairs with support for:
 * - Curves: P-256, P-384, P-521
 * - Usage: ECDSA (signing) or ECDH (key exchange)
 * - Output formats: PEM, JWK
 *
 * All processing is done locally in the browser.
 */

class ECCKeyGenerator {
  constructor() {
    this.init();
  }

  init() {
    this.curve = document.getElementById('curve');
    this.usage = document.getElementById('usage');
    this.outputFormat = document.getElementById('outputFormat');
    this.generateBtn = document.getElementById('generateBtn');
    this.publicKey = document.getElementById('publicKey');
    this.privateKey = document.getElementById('privateKey');
    this.copyPublicBtn = document.getElementById('copyPublicBtn');
    this.copyPrivateBtn = document.getElementById('copyPrivateBtn');
    this.downloadPrivateBtn = document.getElementById('downloadPrivateBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.keyInfo = document.getElementById('keyInfo');
    this.curveInfo = document.getElementById('curveInfo');
    this.usageInfo = document.getElementById('usageInfo');
    this.processTime = document.getElementById('processTime');
    this.fingerprint = document.getElementById('fingerprint');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyPublicBtn.addEventListener('click', () => this.copyToClipboard(this.publicKey.value, '公鑰'));
    this.copyPrivateBtn.addEventListener('click', () => this.copyToClipboard(this.privateKey.value, '私鑰'));
    this.downloadPrivateBtn.addEventListener('click', () => this.downloadPrivateKey());
  }

  async generate() {
    const curve = this.curve.value;
    const usage = this.usage.value;
    const outputFormat = this.outputFormat.value;

    this.generateBtn.disabled = true;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '初始化...');

    const startTime = performance.now();

    try {
      this.updateProgress(30, '生成金鑰對中...');

      const algorithm = usage === 'sign' ? 'ECDSA' : 'ECDH';
      const keyUsages = usage === 'sign' ? ['sign', 'verify'] : ['deriveKey', 'deriveBits'];

      // Generate ECC key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: algorithm,
          namedCurve: curve
        },
        true, // extractable
        keyUsages
      );

      this.updateProgress(70, '匯出金鑰...');

      let publicKeyStr, privateKeyStr;

      if (outputFormat === 'pem') {
        // Export as SPKI/PKCS8 and convert to PEM
        const publicKeySpki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
        const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        publicKeyStr = this.arrayBufferToPem(publicKeySpki, 'PUBLIC KEY');
        privateKeyStr = this.arrayBufferToPem(privateKeyPkcs8, 'PRIVATE KEY');
      } else {
        // Export as JWK
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

        publicKeyStr = JSON.stringify(publicKeyJwk, null, 2);
        privateKeyStr = JSON.stringify(privateKeyJwk, null, 2);
      }

      this.updateProgress(90, '計算指紋...');

      // Calculate fingerprint
      const publicKeySpki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const fingerprintHash = await crypto.subtle.digest('SHA-256', publicKeySpki);
      const fingerprintHex = this.arrayBufferToHex(fingerprintHash);

      this.publicKey.value = publicKeyStr;
      this.privateKey.value = privateKeyStr;

      const endTime = performance.now();

      this.curveInfo.textContent = curve;
      this.usageInfo.textContent = usage === 'sign' ? 'ECDSA 簽章' : 'ECDH 金鑰交換';
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.fingerprint.textContent = fingerprintHex.match(/.{2}/g).join(':').toUpperCase();
      this.keyInfo.style.display = 'block';

      this.updateProgress(100, '完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'ECC 金鑰對生成完成！');
        this.generateBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Key generation error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '金鑰生成失敗：' + error.message);
      this.generateBtn.disabled = false;
    }
  }

  arrayBufferToPem(buffer, label) {
    const base64 = this.arrayBufferToBase64(buffer);
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  copyToClipboard(text, label) {
    if (text) {
      navigator.clipboard.writeText(text);
      this.showStatus('success', `${label}已複製到剪貼簿`);
    }
  }

  downloadPrivateKey() {
    if (!this.privateKey.value) return;

    const format = this.outputFormat.value;
    const extension = format === 'pem' ? 'pem' : 'json';
    const filename = `ecc_private_key.${extension}`;

    const blob = new Blob([this.privateKey.value], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('info', '私鑰已下載，請妥善保管！');
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
  window.eccKeyGenerator = new ECCKeyGenerator();
});

export default ECCKeyGenerator;
