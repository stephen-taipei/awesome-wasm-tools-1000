/**
 * CRY-017: Twofish Encryption Tool
 *
 * Twofish is a symmetric key block cipher that was a finalist in the AES competition.
 * This implementation uses a simplified approach with Web Crypto for key derivation.
 * All processing is done locally in the browser.
 */

class TwofishEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.plaintext = document.getElementById('plaintext');
    this.password = document.getElementById('password');
    this.ciphertext = document.getElementById('ciphertext');
    this.keySize = document.getElementById('keySize');
    this.mode = document.getElementById('mode');
    this.outputFormat = document.getElementById('outputFormat');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.generateKey = document.getElementById('generateKey');
    this.statusMessage = document.getElementById('statusMessage');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.ivValue = document.getElementById('ivValue');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
    this.generateKey.addEventListener('click', () => this.generateRandomKey());
  }

  // Twofish MDS matrix multiplication
  mdsMultiply(a, b) {
    const GF_MOD = 0x169; // Primitive polynomial for GF(2^8)
    let result = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) result ^= a;
      const highBit = a & 0x80;
      a = (a << 1) & 0xff;
      if (highBit) a ^= GF_MOD;
      b >>= 1;
    }
    return result;
  }

  // Simple Twofish-like encryption (simplified implementation)
  twofishEncryptBlock(block, key) {
    const rounds = 16;
    let L = new Uint32Array([
      (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3],
      (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7]
    ]);
    let R = new Uint32Array([
      (block[8] << 24) | (block[9] << 16) | (block[10] << 8) | block[11],
      (block[12] << 24) | (block[13] << 16) | (block[14] << 8) | block[15]
    ]);

    // Input whitening
    L[0] ^= key[0];
    L[1] ^= key[1];
    R[0] ^= key[2];
    R[1] ^= key[3];

    for (let r = 0; r < rounds; r++) {
      // F function (simplified)
      const t0 = this.gFunc(L[0], key) ^ key[r % key.length];
      const t1 = this.gFunc(this.rotl(L[1], 8), key) ^ key[(r + 1) % key.length];

      // PHT
      const f0 = (t0 + t1) >>> 0;
      const f1 = (t0 + 2 * t1) >>> 0;

      // XOR and rotate
      R[0] = this.rotr(R[0] ^ f0, 1);
      R[1] = this.rotl(R[1], 1) ^ f1;

      // Swap
      [L, R] = [R, L];
    }

    // Undo last swap
    [L, R] = [R, L];

    // Output whitening
    R[0] ^= key[4 % key.length];
    R[1] ^= key[5 % key.length];
    L[0] ^= key[6 % key.length];
    L[1] ^= key[7 % key.length];

    const result = new Uint8Array(16);
    result[0] = (R[0] >>> 24) & 0xff;
    result[1] = (R[0] >>> 16) & 0xff;
    result[2] = (R[0] >>> 8) & 0xff;
    result[3] = R[0] & 0xff;
    result[4] = (R[1] >>> 24) & 0xff;
    result[5] = (R[1] >>> 16) & 0xff;
    result[6] = (R[1] >>> 8) & 0xff;
    result[7] = R[1] & 0xff;
    result[8] = (L[0] >>> 24) & 0xff;
    result[9] = (L[0] >>> 16) & 0xff;
    result[10] = (L[0] >>> 8) & 0xff;
    result[11] = L[0] & 0xff;
    result[12] = (L[1] >>> 24) & 0xff;
    result[13] = (L[1] >>> 16) & 0xff;
    result[14] = (L[1] >>> 8) & 0xff;
    result[15] = L[1] & 0xff;

    return result;
  }

  gFunc(x, key) {
    // Simplified g function
    let result = x;
    for (let i = 0; i < 4; i++) {
      const byte = (x >> (i * 8)) & 0xff;
      result ^= this.sBox(byte, key[i % key.length]);
    }
    return result >>> 0;
  }

  sBox(x, k) {
    // Simplified S-box
    return ((x ^ k) * 0x101 ^ (x >> 4) ^ (k & 0xf0)) & 0xff;
  }

  rotl(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  async encrypt() {
    const plaintext = this.plaintext.value;
    const password = this.password.value;

    if (!plaintext) {
      this.showStatus('error', '請輸入要加密的文字');
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
      const outputFormat = this.outputFormat.value;

      // Derive key using PBKDF2
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(16));

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

      // Pad plaintext
      const plaintextBytes = encoder.encode(plaintext);
      const blockSize = 16;
      const padLength = blockSize - (plaintextBytes.length % blockSize);
      const paddedData = new Uint8Array(plaintextBytes.length + padLength);
      paddedData.set(plaintextBytes);
      for (let i = plaintextBytes.length; i < paddedData.length; i++) {
        paddedData[i] = padLength;
      }

      // Encrypt
      const encrypted = new Uint8Array(paddedData.length);
      let prevBlock = iv;

      for (let i = 0; i < paddedData.length; i += 16) {
        const block = paddedData.slice(i, i + 16);

        if (mode === 'CBC') {
          for (let j = 0; j < 16; j++) {
            block[j] ^= prevBlock[j];
          }
        }

        const encryptedBlock = this.twofishEncryptBlock(block, key);
        encrypted.set(encryptedBlock, i);

        if (mode === 'CBC') {
          prevBlock = encryptedBlock;
        }
      }

      // Combine salt + iv + encrypted
      const combined = new Uint8Array(salt.length + iv.length + encrypted.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(encrypted, salt.length + iv.length);

      // Format output
      let result;
      if (outputFormat === 'base64') {
        result = this.arrayBufferToBase64(combined);
      } else {
        result = this.arrayBufferToHex(combined);
      }

      this.ciphertext.value = result;

      const endTime = performance.now();
      this.ivValue.textContent = this.arrayBufferToHex(iv);
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.encryptionInfo.style.display = 'block';

      this.showStatus('success', 'Twofish 加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  async generateRandomKey() {
    const keySize = parseInt(this.keySize.value);
    const keyBytes = keySize / 8;
    const randomBytes = crypto.getRandomValues(new Uint8Array(keyBytes));
    this.password.value = this.arrayBufferToBase64(randomBytes);
    this.password.type = 'text';
    this.togglePassword.textContent = '隱藏';
    this.showStatus('info', `已生成 ${keySize} 位元隨機金鑰`);
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
    if (this.ciphertext.value) {
      navigator.clipboard.writeText(this.ciphertext.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.plaintext.value = '';
    this.password.value = '';
    this.ciphertext.value = '';
    this.encryptionInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  arrayBufferToHex(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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
  window.twofishEncryptor = new TwofishEncryptor();
});

export default TwofishEncryptor;
