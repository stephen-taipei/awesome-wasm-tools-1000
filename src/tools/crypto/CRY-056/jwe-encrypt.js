/**
 * CRY-056: JWE Encryption Tool
 *
 * Encrypts data using JSON Web Encryption.
 * All processing is done locally in the browser.
 */

class JWEEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.algorithm = document.getElementById('algorithm');
    this.encryption = document.getElementById('encryption');
    this.key = document.getElementById('key');
    this.toggleKey = document.getElementById('toggleKey');
    this.generateKey = document.getElementById('generateKey');
    this.plaintext = document.getElementById('plaintext');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.jweOutput = document.getElementById('jweOutput');
    this.jweInfo = document.getElementById('jweInfo');
    this.headerDisplay = document.getElementById('headerDisplay');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.toggleKey.addEventListener('click', () => this.toggleKeyVisibility());
    this.generateKey.addEventListener('click', () => this.generateRandomKey());
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  async encrypt() {
    const keyValue = this.key.value.trim();
    const plaintextValue = this.plaintext.value;

    if (!keyValue) {
      this.showStatus('error', '請輸入加密金鑰');
      return;
    }

    if (!plaintextValue) {
      this.showStatus('error', '請輸入要加密的資料');
      return;
    }

    try {
      const alg = this.algorithm.value;
      const enc = this.encryption.value;

      // Determine key size based on encryption algorithm
      const keySize = enc === 'A128GCM' ? 16 : 32;

      // Create or derive key
      let contentKey;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyValue);

      // Derive a key of correct size using HKDF-like approach
      const baseKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode('jwe-salt'),
          iterations: 10000,
          hash: 'SHA-256'
        },
        baseKey,
        keySize * 8
      );

      contentKey = await crypto.subtle.importKey(
        'raw',
        derivedBits,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Create protected header
      const header = {
        alg: alg,
        enc: enc
      };

      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt content
      const plaintextData = encoder.encode(plaintextValue);
      const additionalData = encoder.encode(encodedHeader);

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: additionalData
        },
        contentKey,
        plaintextData
      );

      // Extract ciphertext and auth tag
      const encryptedBytes = new Uint8Array(encryptedData);
      const ciphertext = encryptedBytes.slice(0, -16);
      const authTag = encryptedBytes.slice(-16);

      // For direct encryption, encrypted key is empty
      const encryptedKey = '';

      // Build JWE compact serialization
      const jwe = [
        encodedHeader,
        encryptedKey, // Empty for direct encryption
        this.base64UrlEncode(iv),
        this.base64UrlEncode(ciphertext),
        this.base64UrlEncode(authTag)
      ].join('.');

      this.jweOutput.value = jwe;
      this.headerDisplay.textContent = JSON.stringify(header, null, 2);
      this.jweInfo.style.display = 'block';

      this.showStatus('success', 'JWE 加密完成！');
    } catch (error) {
      console.error('JWE encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
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

  generateRandomKey() {
    const enc = this.encryption.value;
    const keySize = enc === 'A128GCM' ? 16 : 32;
    const bytes = crypto.getRandomValues(new Uint8Array(keySize));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    this.key.value = btoa(binary);
    this.key.type = 'text';
    this.toggleKey.textContent = '隱藏';
    this.showStatus('info', `已生成 ${keySize * 8} 位元隨機金鑰`);
  }

  toggleKeyVisibility() {
    if (this.key.type === 'password') {
      this.key.type = 'text';
      this.toggleKey.textContent = '隱藏';
    } else {
      this.key.type = 'password';
      this.toggleKey.textContent = '顯示';
    }
  }

  copy() {
    if (this.jweOutput.value) {
      navigator.clipboard.writeText(this.jweOutput.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.key.value = '';
    this.plaintext.value = '';
    this.jweOutput.value = '';
    this.jweInfo.style.display = 'none';
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
  window.jweEncryptor = new JWEEncryptor();
});

export default JWEEncryptor;
