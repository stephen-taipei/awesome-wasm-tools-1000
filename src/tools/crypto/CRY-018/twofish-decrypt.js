/**
 * CRY-018: Twofish Decryption Tool
 *
 * Twofish decryption implementation.
 * All processing is done locally in the browser.
 */

class TwofishDecryptor {
  constructor() {
    this.init();
  }

  init() {
    this.ciphertext = document.getElementById('ciphertext');
    this.password = document.getElementById('password');
    this.plaintext = document.getElementById('plaintext');
    this.keySize = document.getElementById('keySize');
    this.mode = document.getElementById('mode');
    this.inputFormat = document.getElementById('inputFormat');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.statusMessage = document.getElementById('statusMessage');
    this.decryptionInfo = document.getElementById('decryptionInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.decryptBtn.addEventListener('click', () => this.decrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
  }

  // Twofish decryption block (inverse of encryption)
  twofishDecryptBlock(block, key) {
    const rounds = 16;
    let R = new Uint32Array([
      (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3],
      (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7]
    ]);
    let L = new Uint32Array([
      (block[8] << 24) | (block[9] << 16) | (block[10] << 8) | block[11],
      (block[12] << 24) | (block[13] << 16) | (block[14] << 8) | block[15]
    ]);

    // Undo output whitening
    R[0] ^= key[4 % key.length];
    R[1] ^= key[5 % key.length];
    L[0] ^= key[6 % key.length];
    L[1] ^= key[7 % key.length];

    for (let r = rounds - 1; r >= 0; r--) {
      // Swap
      [L, R] = [R, L];

      // Inverse F function
      const t0 = this.gFunc(L[0], key) ^ key[r % key.length];
      const t1 = this.gFunc(this.rotl(L[1], 8), key) ^ key[(r + 1) % key.length];

      // PHT
      const f0 = (t0 + t1) >>> 0;
      const f1 = (t0 + 2 * t1) >>> 0;

      // Inverse XOR and rotate
      R[1] = this.rotr(R[1] ^ f1, 1);
      R[0] = this.rotl(R[0], 1) ^ f0;
    }

    // Undo input whitening
    L[0] ^= key[0];
    L[1] ^= key[1];
    R[0] ^= key[2];
    R[1] ^= key[3];

    const result = new Uint8Array(16);
    result[0] = (L[0] >>> 24) & 0xff;
    result[1] = (L[0] >>> 16) & 0xff;
    result[2] = (L[0] >>> 8) & 0xff;
    result[3] = L[0] & 0xff;
    result[4] = (L[1] >>> 24) & 0xff;
    result[5] = (L[1] >>> 16) & 0xff;
    result[6] = (L[1] >>> 8) & 0xff;
    result[7] = L[1] & 0xff;
    result[8] = (R[0] >>> 24) & 0xff;
    result[9] = (R[0] >>> 16) & 0xff;
    result[10] = (R[0] >>> 8) & 0xff;
    result[11] = R[0] & 0xff;
    result[12] = (R[1] >>> 24) & 0xff;
    result[13] = (R[1] >>> 16) & 0xff;
    result[14] = (R[1] >>> 8) & 0xff;
    result[15] = R[1] & 0xff;

    return result;
  }

  gFunc(x, key) {
    let result = x;
    for (let i = 0; i < 4; i++) {
      const byte = (x >> (i * 8)) & 0xff;
      result ^= this.sBox(byte, key[i % key.length]);
    }
    return result >>> 0;
  }

  sBox(x, k) {
    return ((x ^ k) * 0x101 ^ (x >> 4) ^ (k & 0xf0)) & 0xff;
  }

  rotl(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  async decrypt() {
    const ciphertextStr = this.ciphertext.value.trim();
    const password = this.password.value;

    if (!ciphertextStr) {
      this.showStatus('error', '請輸入要解密的密文');
      return;
    }

    if (!password) {
      this.showStatus('error', '請輸入密碼');
      return;
    }

    const startTime = performance.now();

    try {
      const keySize = parseInt(this.keySize.value);
      const mode = this.mode.value;
      const inputFormat = this.inputFormat.value;

      // Parse ciphertext
      let combined;
      if (inputFormat === 'base64') {
        combined = this.base64ToArrayBuffer(ciphertextStr);
      } else {
        combined = this.hexToArrayBuffer(ciphertextStr);
      }

      // Extract salt, IV, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 32);
      const encryptedData = combined.slice(32);

      // Derive key using PBKDF2
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw', passwordData, 'PBKDF2', false, ['deriveBits']
      );

      const keyBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        keySize
      );

      const keyBytes = new Uint8Array(keyBits);
      const key = new Uint32Array(keyBytes.buffer);

      // Decrypt
      const decrypted = new Uint8Array(encryptedData.length);
      let prevBlock = iv;

      for (let i = 0; i < encryptedData.length; i += 16) {
        const block = encryptedData.slice(i, i + 16);
        const decryptedBlock = this.twofishDecryptBlock(block, key);

        if (mode === 'CBC') {
          for (let j = 0; j < 16; j++) {
            decryptedBlock[j] ^= prevBlock[j];
          }
          prevBlock = block;
        }

        decrypted.set(decryptedBlock, i);
      }

      // Remove PKCS7 padding
      const padLength = decrypted[decrypted.length - 1];
      const unpaddedData = decrypted.slice(0, decrypted.length - padLength);

      const decoder = new TextDecoder();
      const result = decoder.decode(unpaddedData);

      this.plaintext.value = result;

      const endTime = performance.now();
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.decryptionInfo.style.display = 'block';

      this.showStatus('success', 'Twofish 解密完成！');
    } catch (error) {
      console.error('Decryption error:', error);
      this.showStatus('error', '解密失敗：密碼錯誤或資料損壞');
    }
  }

  togglePasswordVisibility() {
    if (this.password.type === 'password') {
      this.password.type = 'text';
      this.togglePassword.textContent = '隱藏';
    } else {
      this.password.type = 'password';
      this.togglePassword.textContent = '顯示';
    }
  }

  copyResult() {
    if (this.plaintext.value) {
      navigator.clipboard.writeText(this.plaintext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.ciphertext.value = '';
    this.password.value = '';
    this.plaintext.value = '';
    this.decryptionInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
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
  window.twofishDecryptor = new TwofishDecryptor();
});

export default TwofishDecryptor;
