/**
 * CRY-044: PGP Encryption Tool
 *
 * Encrypts messages using PGP public key.
 * All processing is done locally in the browser.
 */

class PGPEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.publicKey = document.getElementById('publicKey');
    this.publicKeyFile = document.getElementById('publicKeyFile');
    this.plaintext = document.getElementById('plaintext');
    this.ciphertext = document.getElementById('ciphertext');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.publicKeyFile.addEventListener('change', (e) => this.loadKeyFile(e));
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  async loadKeyFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.publicKey.value = text;
      this.showStatus('info', '公鑰已載入');
    }
  }

  async encrypt() {
    const publicKeyPem = this.publicKey.value.trim();
    const plaintext = this.plaintext.value.trim();

    if (!publicKeyPem) {
      this.showStatus('error', '請輸入公鑰');
      return;
    }

    if (!plaintext) {
      this.showStatus('error', '請輸入要加密的訊息');
      return;
    }

    try {
      // Extract base64 from PEM
      const base64Key = this.extractBase64FromPem(publicKeyPem);
      const keyData = this.base64ToArrayBuffer(base64Key);

      // Import public key
      const publicKey = await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      );

      // Generate session key for AES
      const sessionKey = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt session key with RSA
      const encryptedSessionKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        sessionKey
      );

      // Import session key for AES
      const aesKey = await crypto.subtle.importKey(
        'raw',
        sessionKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt message with AES
      const encoder = new TextEncoder();
      const plaintextData = encoder.encode(plaintext);
      const encryptedMessage = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        plaintextData
      );

      // Combine: encrypted session key length (4 bytes) + encrypted session key + iv + encrypted message
      const eskLength = new Uint8Array(4);
      new DataView(eskLength.buffer).setUint32(0, encryptedSessionKey.byteLength, true);

      const combined = new Uint8Array(
        4 + encryptedSessionKey.byteLength + iv.length + encryptedMessage.byteLength
      );
      let offset = 0;
      combined.set(eskLength, offset); offset += 4;
      combined.set(new Uint8Array(encryptedSessionKey), offset); offset += encryptedSessionKey.byteLength;
      combined.set(iv, offset); offset += iv.length;
      combined.set(new Uint8Array(encryptedMessage), offset);

      // Armor the output
      const base64Output = this.arrayBufferToBase64(combined);
      const armored = this.armorMessage(base64Output);
      this.ciphertext.value = armored;

      this.showStatus('success', '加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
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

  armorMessage(base64Data) {
    const lines = base64Data.match(/.{1,64}/g) || [];
    return `-----BEGIN PGP MESSAGE-----
Version: Awesome WASM Tools

${lines.join('\n')}
-----END PGP MESSAGE-----`;
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

  copy() {
    if (this.ciphertext.value) {
      navigator.clipboard.writeText(this.ciphertext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  download() {
    if (this.ciphertext.value) {
      const blob = new Blob([this.ciphertext.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'message.asc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  clear() {
    this.publicKey.value = '';
    this.plaintext.value = '';
    this.ciphertext.value = '';
    this.publicKeyFile.value = '';
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
  window.pgpEncryptor = new PGPEncryptor();
});

export default PGPEncryptor;
