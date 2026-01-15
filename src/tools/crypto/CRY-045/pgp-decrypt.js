/**
 * CRY-045: PGP Decryption Tool
 *
 * Decrypts messages using PGP private key.
 * All processing is done locally in the browser.
 */

class PGPDecryptor {
  constructor() {
    this.init();
  }

  init() {
    this.privateKey = document.getElementById('privateKey');
    this.privateKeyFile = document.getElementById('privateKeyFile');
    this.passphrase = document.getElementById('passphrase');
    this.togglePassphrase = document.getElementById('togglePassphrase');
    this.ciphertext = document.getElementById('ciphertext');
    this.ciphertextFile = document.getElementById('ciphertextFile');
    this.plaintext = document.getElementById('plaintext');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.privateKeyFile.addEventListener('change', (e) => this.loadFile(e, this.privateKey, '私鑰'));
    this.ciphertextFile.addEventListener('change', (e) => this.loadFile(e, this.ciphertext, '加密訊息'));
    this.togglePassphrase.addEventListener('click', () => this.togglePassphraseVisibility());
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  async loadFile(e, targetElement, label) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      targetElement.value = text;
      this.showStatus('info', `${label}已載入`);
    }
  }

  async decrypt() {
    const privateKeyPem = this.privateKey.value.trim();
    const passphrase = this.passphrase.value;
    const ciphertext = this.ciphertext.value.trim();

    if (!privateKeyPem) {
      this.showStatus('error', '請輸入私鑰');
      return;
    }

    if (!passphrase) {
      this.showStatus('error', '請輸入密碼短語');
      return;
    }

    if (!ciphertext) {
      this.showStatus('error', '請輸入加密訊息');
      return;
    }

    try {
      // Extract encrypted private key data
      const encryptedKeyBase64 = this.extractBase64FromPem(privateKeyPem);
      const encryptedKeyData = this.base64ToArrayBuffer(encryptedKeyBase64);
      const encryptedKeyBytes = new Uint8Array(encryptedKeyData);

      // Decrypt the private key
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

      // Import private key
      const privateKeyObj = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      // Extract message data
      const messageBase64 = this.extractBase64FromPem(ciphertext);
      const messageData = new Uint8Array(this.base64ToArrayBuffer(messageBase64));

      // Parse message structure
      let offset = 0;
      const eskLength = new DataView(messageData.buffer).getUint32(offset, true);
      offset += 4;
      const encryptedSessionKey = messageData.slice(offset, offset + eskLength);
      offset += eskLength;
      const messageIv = messageData.slice(offset, offset + 12);
      offset += 12;
      const encryptedMessage = messageData.slice(offset);

      // Decrypt session key
      const sessionKey = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKeyObj,
        encryptedSessionKey
      );

      // Import session key
      const sessionAesKey = await crypto.subtle.importKey(
        'raw',
        sessionKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt message
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: messageIv },
        sessionAesKey,
        encryptedMessage
      );

      const decoder = new TextDecoder();
      this.plaintext.value = decoder.decode(decryptedData);

      this.showStatus('success', '解密完成！');
    } catch (error) {
      console.error('Decryption error:', error);
      if (error.name === 'OperationError') {
        this.showStatus('error', '解密失敗：密碼短語錯誤或訊息已損壞');
      } else {
        this.showStatus('error', '解密失敗：' + error.message);
      }
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
      if (inBlock && !line.startsWith('Comment:') && !line.startsWith('Version:') && line.trim()) {
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
    if (this.plaintext.value) {
      navigator.clipboard.writeText(this.plaintext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.privateKey.value = '';
    this.passphrase.value = '';
    this.ciphertext.value = '';
    this.plaintext.value = '';
    this.privateKeyFile.value = '';
    this.ciphertextFile.value = '';
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
  window.pgpDecryptor = new PGPDecryptor();
});

export default PGPDecryptor;
