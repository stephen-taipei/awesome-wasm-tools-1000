/**
 * CRY-046: PGP Signature Tool
 *
 * Signs messages using PGP private key.
 * All processing is done locally in the browser.
 */

class PGPSigner {
  constructor() {
    this.init();
  }

  init() {
    this.privateKey = document.getElementById('privateKey');
    this.privateKeyFile = document.getElementById('privateKeyFile');
    this.passphrase = document.getElementById('passphrase');
    this.togglePassphrase = document.getElementById('togglePassphrase');
    this.message = document.getElementById('message');
    this.signedMessage = document.getElementById('signedMessage');
    this.signatureType = document.getElementById('signatureType');
    this.hashAlgorithm = document.getElementById('hashAlgorithm');
    this.signBtn = document.getElementById('signBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.privateKeyFile.addEventListener('change', (e) => this.loadKeyFile(e));
    this.togglePassphrase.addEventListener('click', () => this.togglePassphraseVisibility());
    this.signBtn.addEventListener('click', () => this.sign());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  async loadKeyFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.privateKey.value = text;
      this.showStatus('info', '私鑰已載入');
    }
  }

  async sign() {
    const privateKeyPem = this.privateKey.value.trim();
    const passphrase = this.passphrase.value;
    const message = this.message.value;
    const signatureType = this.signatureType.value;
    const hashAlgorithm = this.hashAlgorithm.value;

    if (!privateKeyPem) {
      this.showStatus('error', '請輸入私鑰');
      return;
    }

    if (!passphrase) {
      this.showStatus('error', '請輸入密碼短語');
      return;
    }

    if (!message) {
      this.showStatus('error', '請輸入要簽章的訊息');
      return;
    }

    try {
      // Decrypt private key
      const encryptedKeyBase64 = this.extractBase64FromPem(privateKeyPem);
      const encryptedKeyData = this.base64ToArrayBuffer(encryptedKeyBase64);
      const encryptedKeyBytes = new Uint8Array(encryptedKeyData);

      const salt = encryptedKeyBytes.slice(0, 16);
      const iv = encryptedKeyBytes.slice(16, 28);
      const encryptedKey = encryptedKeyBytes.slice(28);

      const encoder = new TextEncoder();
      const passphraseData = encoder.encode(passphrase);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passphraseData,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const privateKeyData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        encryptedKey
      );

      // Import private key for signing
      const privateKeyObj = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'RSA-PSS',
          hash: hashAlgorithm
        },
        false,
        ['sign']
      );

      // Sign the message
      const messageData = encoder.encode(message);
      const signature = await crypto.subtle.sign(
        {
          name: 'RSA-PSS',
          saltLength: 32
        },
        privateKeyObj,
        messageData
      );

      // Format output
      const signatureBase64 = this.arrayBufferToBase64(signature);

      if (signatureType === 'cleartext') {
        const hashName = hashAlgorithm.replace('-', '');
        this.signedMessage.value = this.formatClearsign(message, signatureBase64, hashName);
      } else {
        this.signedMessage.value = this.formatDetachedSignature(signatureBase64);
      }

      this.showStatus('success', '簽章完成！');
    } catch (error) {
      console.error('Signing error:', error);
      if (error.name === 'OperationError') {
        this.showStatus('error', '簽章失敗：密碼短語錯誤');
      } else {
        this.showStatus('error', '簽章失敗：' + error.message);
      }
    }
  }

  formatClearsign(message, signature, hashName) {
    const sigLines = signature.match(/.{1,64}/g) || [];
    return `-----BEGIN PGP SIGNED MESSAGE-----
Hash: ${hashName}

${message}
-----BEGIN PGP SIGNATURE-----
Version: Awesome WASM Tools

${sigLines.join('\n')}
-----END PGP SIGNATURE-----`;
  }

  formatDetachedSignature(signature) {
    const sigLines = signature.match(/.{1,64}/g) || [];
    return `-----BEGIN PGP SIGNATURE-----
Version: Awesome WASM Tools

${sigLines.join('\n')}
-----END PGP SIGNATURE-----`;
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
      if (line.includes('-----END')) {
        break;
      }
      if (inBlock && !line.startsWith('Comment:') && line.trim()) {
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

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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

  copy() {
    if (this.signedMessage.value) {
      navigator.clipboard.writeText(this.signedMessage.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  download() {
    if (this.signedMessage.value) {
      const blob = new Blob([this.signedMessage.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.signatureType.value === 'cleartext' ? 'signed_message.asc' : 'signature.asc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  clear() {
    this.privateKey.value = '';
    this.passphrase.value = '';
    this.message.value = '';
    this.signedMessage.value = '';
    this.privateKeyFile.value = '';
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
  window.pgpSigner = new PGPSigner();
});

export default PGPSigner;
