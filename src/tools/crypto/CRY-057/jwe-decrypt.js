/**
 * CRY-057: JWE Decryption Tool
 *
 * Decrypts JSON Web Encryption data.
 * All processing is done locally in the browser.
 */

class JWEDecryptor {
  constructor() {
    this.init();
  }

  init() {
    this.jwe = document.getElementById('jwe');
    this.key = document.getElementById('key');
    this.toggleKey = document.getElementById('toggleKey');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.plaintextOutput = document.getElementById('plaintextOutput');
    this.jweInfo = document.getElementById('jweInfo');
    this.algValue = document.getElementById('algValue');
    this.encValue = document.getElementById('encValue');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.toggleKey.addEventListener('click', () => this.toggleKeyVisibility());
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  async decrypt() {
    const jweValue = this.jwe.value.trim();
    const keyValue = this.key.value.trim();

    if (!jweValue) {
      this.showStatus('error', '請輸入 JWE');
      return;
    }

    if (!keyValue) {
      this.showStatus('error', '請輸入解密金鑰');
      return;
    }

    try {
      // Parse JWE compact serialization
      const parts = jweValue.split('.');
      if (parts.length !== 5) {
        this.showStatus('error', 'JWE 格式錯誤，應包含五個部分');
        return;
      }

      const [encodedHeader, encryptedKey, encodedIv, encodedCiphertext, encodedTag] = parts;

      // Decode header
      const header = JSON.parse(this.base64UrlDecode(encodedHeader));
      this.algValue.textContent = header.alg;
      this.encValue.textContent = header.enc;
      this.jweInfo.style.display = 'block';

      // Determine key size
      const keySize = header.enc === 'A128GCM' ? 16 : 32;

      // Derive content key
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyValue);

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

      const contentKey = await crypto.subtle.importKey(
        'raw',
        derivedBits,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decode IV, ciphertext, and tag
      const iv = this.base64UrlDecodeToBytes(encodedIv);
      const ciphertext = this.base64UrlDecodeToBytes(encodedCiphertext);
      const tag = this.base64UrlDecodeToBytes(encodedTag);

      // Combine ciphertext and tag
      const encryptedData = new Uint8Array(ciphertext.length + tag.length);
      encryptedData.set(ciphertext);
      encryptedData.set(tag, ciphertext.length);

      // Decrypt
      const additionalData = encoder.encode(encodedHeader);
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: additionalData
        },
        contentKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      this.plaintextOutput.value = decoder.decode(decryptedData);

      this.showStatus('success', 'JWE 解密完成！');
    } catch (error) {
      console.error('JWE decryption error:', error);
      if (error.name === 'OperationError') {
        this.showStatus('error', '解密失敗：金鑰錯誤或資料已損壞');
      } else {
        this.showStatus('error', '解密失敗：' + error.message);
      }
    }
  }

  base64UrlDecode(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }

  base64UrlDecodeToBytes(input) {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
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
    if (this.plaintextOutput.value) {
      navigator.clipboard.writeText(this.plaintextOutput.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.jwe.value = '';
    this.key.value = '';
    this.plaintextOutput.value = '';
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
  window.jweDecryptor = new JWEDecryptor();
});

export default JWEDecryptor;
