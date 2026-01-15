/**
 * CRY-058: JWK Generation Tool
 *
 * Generates JSON Web Keys.
 * All processing is done locally in the browser.
 */

class JWKGenerator {
  constructor() {
    this.publicJwkData = null;
    this.privateJwkData = null;
    this.init();
  }

  init() {
    this.keyType = document.getElementById('keyType');
    this.rsaSize = document.getElementById('rsaSize');
    this.ecCurve = document.getElementById('ecCurve');
    this.octSize = document.getElementById('octSize');
    this.rsaOptions = document.getElementById('rsaOptions');
    this.ecOptions = document.getElementById('ecOptions');
    this.octOptions = document.getElementById('octOptions');
    this.keyUse = document.getElementById('keyUse');
    this.keyId = document.getElementById('keyId');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.jwkResult = document.getElementById('jwkResult');
    this.publicJwk = document.getElementById('publicJwk');
    this.privateJwk = document.getElementById('privateJwk');
    this.privateKeySection = document.getElementById('privateKeySection');
    this.copyPublic = document.getElementById('copyPublic');
    this.copyPrivate = document.getElementById('copyPrivate');
    this.downloadPublic = document.getElementById('downloadPublic');
    this.downloadPrivate = document.getElementById('downloadPrivate');

    this.bindEvents();
  }

  bindEvents() {
    this.keyType.addEventListener('change', () => this.toggleOptions());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyPublic.addEventListener('click', () => this.copyToClipboard(JSON.stringify(this.publicJwkData, null, 2), '公鑰'));
    this.copyPrivate.addEventListener('click', () => this.copyToClipboard(JSON.stringify(this.privateJwkData, null, 2), '私鑰'));
    this.downloadPublic.addEventListener('click', () => this.download(JSON.stringify(this.publicJwkData, null, 2), 'public-key.jwk'));
    this.downloadPrivate.addEventListener('click', () => this.download(JSON.stringify(this.privateJwkData, null, 2), 'private-key.jwk'));
  }

  toggleOptions() {
    const type = this.keyType.value;
    this.rsaOptions.style.display = type === 'RSA' ? 'flex' : 'none';
    this.ecOptions.style.display = type === 'EC' ? 'flex' : 'none';
    this.octOptions.style.display = type === 'oct' ? 'flex' : 'none';
  }

  async generate() {
    try {
      const type = this.keyType.value;
      const use = this.keyUse.value;
      const kid = this.keyId.value.trim() || this.generateKid();

      if (type === 'oct') {
        await this.generateSymmetricKey(use, kid);
      } else if (type === 'RSA') {
        await this.generateRSAKey(use, kid);
      } else {
        await this.generateECKey(use, kid);
      }

      this.jwkResult.style.display = 'block';
      this.showStatus('success', 'JWK 生成完成！');
    } catch (error) {
      console.error('JWK generation error:', error);
      this.showStatus('error', '生成失敗：' + error.message);
    }
  }

  async generateECKey(use, kid) {
    const curve = this.ecCurve.value;
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: curve },
      true,
      ['sign', 'verify']
    );

    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Add standard fields
    publicJwk.kid = kid;
    privateJwk.kid = kid;
    if (use) {
      publicJwk.use = use;
      privateJwk.use = use;
    }

    this.publicJwkData = publicJwk;
    this.privateJwkData = privateJwk;

    this.publicJwk.value = JSON.stringify(publicJwk, null, 2);
    this.privateJwk.value = JSON.stringify(privateJwk, null, 2);
    this.privateKeySection.style.display = 'block';
  }

  async generateRSAKey(use, kid) {
    const modulusLength = parseInt(this.rsaSize.value);
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );

    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Add standard fields
    publicJwk.kid = kid;
    privateJwk.kid = kid;
    if (use) {
      publicJwk.use = use;
      privateJwk.use = use;
    }

    this.publicJwkData = publicJwk;
    this.privateJwkData = privateJwk;

    this.publicJwk.value = JSON.stringify(publicJwk, null, 2);
    this.privateJwk.value = JSON.stringify(privateJwk, null, 2);
    this.privateKeySection.style.display = 'block';
  }

  async generateSymmetricKey(use, kid) {
    const keySize = parseInt(this.octSize.value);
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: keySize },
      true,
      ['encrypt', 'decrypt']
    );

    const jwk = await crypto.subtle.exportKey('jwk', key);

    // Add standard fields
    jwk.kid = kid;
    if (use) {
      jwk.use = use;
    }

    this.publicJwkData = jwk;
    this.privateJwkData = null;

    this.publicJwk.value = JSON.stringify(jwk, null, 2);
    this.privateKeySection.style.display = 'none';
  }

  generateKid() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    this.showStatus('success', `${label}已複製到剪貼簿`);
  }

  download(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.keyId.value = '';
    this.publicJwk.value = '';
    this.privateJwk.value = '';
    this.publicJwkData = null;
    this.privateJwkData = null;
    this.jwkResult.style.display = 'none';
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
  window.jwkGenerator = new JWKGenerator();
});

export default JWKGenerator;
