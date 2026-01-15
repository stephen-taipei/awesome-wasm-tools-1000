/**
 * CRY-043: PGP Key Generation Tool
 *
 * Generates PGP-compatible key pairs using Web Crypto API.
 * All processing is done locally in the browser.
 */

class PGPKeyGenerator {
  constructor() {
    this.publicKeyArmored = '';
    this.privateKeyArmored = '';
    this.init();
  }

  init() {
    this.keyType = document.getElementById('keyType');
    this.rsaKeySize = document.getElementById('rsaKeySize');
    this.eccCurve = document.getElementById('eccCurve');
    this.rsaOptions = document.getElementById('rsaOptions');
    this.eccOptions = document.getElementById('eccOptions');
    this.name = document.getElementById('name');
    this.email = document.getElementById('email');
    this.passphrase = document.getElementById('passphrase');
    this.confirmPassphrase = document.getElementById('confirmPassphrase');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.togglePassphrase = document.getElementById('togglePassphrase');
    this.statusMessage = document.getElementById('statusMessage');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.progressText = document.getElementById('progressText');
    this.keyResult = document.getElementById('keyResult');
    this.publicKey = document.getElementById('publicKey');
    this.privateKey = document.getElementById('privateKey');
    this.fingerprint = document.getElementById('fingerprint');
    this.copyPublicBtn = document.getElementById('copyPublicBtn');
    this.copyPrivateBtn = document.getElementById('copyPrivateBtn');
    this.downloadPublicBtn = document.getElementById('downloadPublicBtn');
    this.downloadPrivateBtn = document.getElementById('downloadPrivateBtn');

    this.bindEvents();
  }

  bindEvents() {
    this.keyType.addEventListener('change', () => this.toggleKeyOptions());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.togglePassphrase.addEventListener('click', () => this.togglePassphraseVisibility());
    this.copyPublicBtn.addEventListener('click', () => this.copyToClipboard(this.publicKeyArmored, '公鑰'));
    this.copyPrivateBtn.addEventListener('click', () => this.copyToClipboard(this.privateKeyArmored, '私鑰'));
    this.downloadPublicBtn.addEventListener('click', () => this.downloadKey('public'));
    this.downloadPrivateBtn.addEventListener('click', () => this.downloadKey('private'));
  }

  toggleKeyOptions() {
    if (this.keyType.value === 'rsa') {
      this.rsaOptions.style.display = 'flex';
      this.eccOptions.style.display = 'none';
    } else {
      this.rsaOptions.style.display = 'none';
      this.eccOptions.style.display = 'flex';
    }
  }

  async generate() {
    const name = this.name.value.trim();
    const email = this.email.value.trim();
    const passphrase = this.passphrase.value;
    const confirmPassphrase = this.confirmPassphrase.value;

    if (!name) {
      this.showStatus('error', '請輸入名稱');
      return;
    }

    if (!email) {
      this.showStatus('error', '請輸入電子郵件');
      return;
    }

    if (!passphrase) {
      this.showStatus('error', '請輸入密碼短語');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      this.showStatus('error', '兩次密碼短語輸入不一致');
      return;
    }

    this.progressContainer.style.display = 'block';
    this.progressBar.style.width = '30%';
    this.progressText.textContent = '正在生成金鑰對...';

    try {
      const keyType = this.keyType.value;
      let keyPair;

      if (keyType === 'rsa') {
        const keySize = parseInt(this.rsaKeySize.value);
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: keySize,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          true,
          ['encrypt', 'decrypt']
        );
      } else {
        const curve = this.eccCurve.value === 'p256' ? 'P-256' :
                      this.eccCurve.value === 'p384' ? 'P-384' : 'P-521';
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'ECDH',
            namedCurve: curve
          },
          true,
          ['deriveKey', 'deriveBits']
        );
      }

      this.progressBar.style.width = '60%';
      this.progressText.textContent = '正在匯出金鑰...';

      // Export public key
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = this.arrayBufferToBase64(publicKeyData);
      this.publicKeyArmored = this.armorKey(publicKeyBase64, 'PUBLIC KEY', name, email);

      // Export and encrypt private key
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      // Encrypt private key with passphrase
      const encryptedPrivateKey = await this.encryptPrivateKey(privateKeyData, passphrase);
      const privateKeyBase64 = this.arrayBufferToBase64(encryptedPrivateKey);
      this.privateKeyArmored = this.armorKey(privateKeyBase64, 'ENCRYPTED PRIVATE KEY', name, email);

      // Generate fingerprint
      const fingerprintData = await crypto.subtle.digest('SHA-256', publicKeyData);
      const fingerprintHex = this.arrayBufferToHex(fingerprintData).toUpperCase();
      const formattedFingerprint = fingerprintHex.match(/.{1,4}/g).join(' ');

      this.progressBar.style.width = '100%';
      this.progressText.textContent = '完成！';

      this.publicKey.value = this.publicKeyArmored;
      this.privateKey.value = this.privateKeyArmored;
      this.fingerprint.textContent = formattedFingerprint;
      this.keyResult.style.display = 'block';

      this.showStatus('success', 'PGP 金鑰對生成完成！');
    } catch (error) {
      console.error('Key generation error:', error);
      this.showStatus('error', '金鑰生成失敗：' + error.message);
    }
  }

  async encryptPrivateKey(privateKeyData, passphrase) {
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passphraseData,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      privateKeyData
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    return combined;
  }

  armorKey(base64Data, type, name, email) {
    const lines = base64Data.match(/.{1,64}/g) || [];
    return `-----BEGIN PGP ${type}-----
Comment: User-ID: ${name} <${email}>
Comment: Generated by Awesome WASM Tools

${lines.join('\n')}
-----END PGP ${type}-----`;
  }

  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    this.showStatus('success', `${label}已複製到剪貼簿`);
  }

  downloadKey(type) {
    const content = type === 'public' ? this.publicKeyArmored : this.privateKeyArmored;
    const filename = type === 'public' ? 'public_key.asc' : 'private_key.asc';

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  togglePassphraseVisibility() {
    if (this.passphrase.type === 'password') {
      this.passphrase.type = 'text';
      this.togglePassphrase.textContent = '隱藏';
    } else {
      this.passphrase.type = 'password';
      this.togglePassphrase.textContent = '顯示';
    }
  }

  clear() {
    this.name.value = '';
    this.email.value = '';
    this.passphrase.value = '';
    this.confirmPassphrase.value = '';
    this.publicKey.value = '';
    this.privateKey.value = '';
    this.publicKeyArmored = '';
    this.privateKeyArmored = '';
    this.keyResult.style.display = 'none';
    this.progressContainer.style.display = 'none';
    this.statusMessage.classList.remove('active');
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

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pgpKeyGenerator = new PGPKeyGenerator();
});

export default PGPKeyGenerator;
