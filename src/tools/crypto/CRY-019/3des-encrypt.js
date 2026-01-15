/**
 * CRY-019: Triple DES (3DES) Encryption Tool
 *
 * Implements 3DES encryption using three rounds of DES.
 * 3DES applies DES three times with different keys: E(K3, D(K2, E(K1, plaintext)))
 * All processing is done locally in the browser.
 *
 * Note: 3DES is considered legacy. Use AES for new applications.
 */

class TripleDESEncryptor {
  constructor() {
    this.init();
  }

  init() {
    this.plaintext = document.getElementById('plaintext');
    this.password = document.getElementById('password');
    this.ciphertext = document.getElementById('ciphertext');
    this.mode = document.getElementById('mode');
    this.outputFormat = document.getElementById('outputFormat');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.togglePassword = document.getElementById('togglePassword');
    this.statusMessage = document.getElementById('statusMessage');
    this.encryptionInfo = document.getElementById('encryptionInfo');
    this.ivValue = document.getElementById('ivValue');
    this.processTime = document.getElementById('processTime');

    // DES S-boxes
    this.initDES();
    this.bindEvents();
  }

  initDES() {
    // DES S-boxes
    this.SBOX = [
      [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
      [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
      [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
      [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
      [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
      [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
      [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
      [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
    ];

    // Initial permutation
    this.IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];

    // Final permutation (inverse of IP)
    this.FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];

    // Expansion permutation
    this.E = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];

    // Permutation
    this.P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];

    // PC1 permutation
    this.PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];

    // PC2 permutation
    this.PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];

    // Rotation schedule
    this.ROTATIONS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];
  }

  bindEvents() {
    this.encryptBtn.addEventListener('click', () => this.encrypt());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
  }

  // Permute bits according to table
  permute(input, table, inputBits) {
    let result = 0n;
    for (let i = 0; i < table.length; i++) {
      const bit = (input >> BigInt(inputBits - table[i])) & 1n;
      result = (result << 1n) | bit;
    }
    return result;
  }

  // Generate 16 subkeys from 56-bit key
  generateSubkeys(key56) {
    const subkeys = [];
    let C = (key56 >> 28n) & 0xFFFFFFFn;
    let D = key56 & 0xFFFFFFFn;

    for (let i = 0; i < 16; i++) {
      const rot = this.ROTATIONS[i];
      C = ((C << BigInt(rot)) | (C >> BigInt(28 - rot))) & 0xFFFFFFFn;
      D = ((D << BigInt(rot)) | (D >> BigInt(28 - rot))) & 0xFFFFFFFn;
      const CD = (C << 28n) | D;
      subkeys.push(this.permute(CD, this.PC2, 56));
    }
    return subkeys;
  }

  // DES F function
  feistel(R, subkey) {
    const expanded = this.permute(R, this.E, 32);
    const xored = expanded ^ subkey;

    let sboxOutput = 0n;
    for (let i = 0; i < 8; i++) {
      const chunk = Number((xored >> BigInt((7 - i) * 6)) & 0x3Fn);
      const row = ((chunk & 0x20) >> 4) | (chunk & 1);
      const col = (chunk >> 1) & 0xF;
      const sboxVal = this.SBOX[i][row * 16 + col];
      sboxOutput = (sboxOutput << 4n) | BigInt(sboxVal);
    }

    return this.permute(sboxOutput, this.P, 32);
  }

  // Single DES encryption
  desEncrypt(block, subkeys) {
    let permuted = this.permute(block, this.IP, 64);
    let L = (permuted >> 32n) & 0xFFFFFFFFn;
    let R = permuted & 0xFFFFFFFFn;

    for (let i = 0; i < 16; i++) {
      const newR = L ^ this.feistel(R, subkeys[i]);
      L = R;
      R = newR;
    }

    const preOutput = (R << 32n) | L;
    return this.permute(preOutput, this.FP, 64);
  }

  // Single DES decryption
  desDecrypt(block, subkeys) {
    let permuted = this.permute(block, this.IP, 64);
    let L = (permuted >> 32n) & 0xFFFFFFFFn;
    let R = permuted & 0xFFFFFFFFn;

    for (let i = 15; i >= 0; i--) {
      const newR = L ^ this.feistel(R, subkeys[i]);
      L = R;
      R = newR;
    }

    const preOutput = (R << 32n) | L;
    return this.permute(preOutput, this.FP, 64);
  }

  // 3DES encryption: E(K3, D(K2, E(K1, plaintext)))
  tripleDesEncrypt(block, key1, key2, key3) {
    const subkeys1 = this.generateSubkeys(this.permute(key1, this.PC1, 64));
    const subkeys2 = this.generateSubkeys(this.permute(key2, this.PC1, 64));
    const subkeys3 = this.generateSubkeys(this.permute(key3, this.PC1, 64));

    const step1 = this.desEncrypt(block, subkeys1);
    const step2 = this.desDecrypt(step1, subkeys2);
    const step3 = this.desEncrypt(step2, subkeys3);

    return step3;
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
      const mode = this.mode.value;
      const outputFormat = this.outputFormat.value;

      // Derive 24-byte key from password using SHA-256
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const salt = crypto.getRandomValues(new Uint8Array(8));
      const iv = crypto.getRandomValues(new Uint8Array(8));

      // Simple key derivation
      const hash = await crypto.subtle.digest('SHA-256', new Uint8Array([...salt, ...passwordData]));
      const keyBytes = new Uint8Array(hash).slice(0, 24);

      // Split into three 8-byte keys
      const key1 = this.bytesToBigInt(keyBytes.slice(0, 8));
      const key2 = this.bytesToBigInt(keyBytes.slice(8, 16));
      const key3 = this.bytesToBigInt(keyBytes.slice(16, 24));

      // Pad plaintext
      const plaintextBytes = encoder.encode(plaintext);
      const blockSize = 8;
      const padLength = blockSize - (plaintextBytes.length % blockSize);
      const paddedData = new Uint8Array(plaintextBytes.length + padLength);
      paddedData.set(plaintextBytes);
      for (let i = plaintextBytes.length; i < paddedData.length; i++) {
        paddedData[i] = padLength;
      }

      // Encrypt
      const encrypted = new Uint8Array(paddedData.length);
      let prevBlock = this.bytesToBigInt(iv);

      for (let i = 0; i < paddedData.length; i += 8) {
        let block = this.bytesToBigInt(paddedData.slice(i, i + 8));

        if (mode === 'CBC') {
          block ^= prevBlock;
        }

        const encryptedBlock = this.tripleDesEncrypt(block, key1, key2, key3);

        if (mode === 'CBC') {
          prevBlock = encryptedBlock;
        }

        this.bigIntToBytes(encryptedBlock, encrypted, i);
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

      this.showStatus('success', '3DES 加密完成！');
    } catch (error) {
      console.error('Encryption error:', error);
      this.showStatus('error', '加密失敗：' + error.message);
    }
  }

  bytesToBigInt(bytes) {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) | BigInt(bytes[i]);
    }
    return result;
  }

  bigIntToBytes(bigint, array, offset) {
    for (let i = 7; i >= 0; i--) {
      array[offset + i] = Number(bigint & 0xFFn);
      bigint >>= 8n;
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
  window.tripleDesEncryptor = new TripleDESEncryptor();
});

export default TripleDESEncryptor;
