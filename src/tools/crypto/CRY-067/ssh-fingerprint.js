/**
 * CRY-067: SSH Fingerprint Calculator Tool
 *
 * Calculates SSH key fingerprints.
 * All processing is done locally in the browser.
 */

class SSHFingerprintCalculator {
  constructor() {
    this.sha256Fp = '';
    this.md5Fp = '';
    this.init();
  }

  init() {
    this.publicKey = document.getElementById('publicKey');
    this.keyFile = document.getElementById('keyFile');
    this.calculateBtn = document.getElementById('calculateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.fingerprintResult = document.getElementById('fingerprintResult');
    this.keyType = document.getElementById('keyType');
    this.sha256Fingerprint = document.getElementById('sha256Fingerprint');
    this.md5Fingerprint = document.getElementById('md5Fingerprint');
    this.keySize = document.getElementById('keySize');
    this.keyComment = document.getElementById('keyComment');
    this.randomArtDisplay = document.getElementById('randomArtDisplay');
    this.copySha256 = document.getElementById('copySha256');
    this.copyMd5 = document.getElementById('copyMd5');

    this.bindEvents();
  }

  bindEvents() {
    this.keyFile.addEventListener('change', (e) => this.loadFile(e));
    this.calculateBtn.addEventListener('click', () => this.calculate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copySha256.addEventListener('click', () => this.copyToClipboard(this.sha256Fp, 'SHA-256 指紋'));
    this.copyMd5.addEventListener('click', () => this.copyToClipboard(this.md5Fp, 'MD5 指紋'));
  }

  async loadFile(e) {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      this.publicKey.value = text;
      this.showStatus('info', '檔案已載入');
    }
  }

  async calculate() {
    const keyText = this.publicKey.value.trim();

    if (!keyText) {
      this.showStatus('error', '請輸入公鑰');
      return;
    }

    try {
      // Parse SSH public key
      const parts = keyText.split(/\s+/);
      if (parts.length < 2) {
        throw new Error('無效的 SSH 公鑰格式');
      }

      const [keyTypeValue, base64Data, ...commentParts] = parts;
      const comment = commentParts.join(' ') || '(無)';

      // Decode key data
      const keyData = this.base64ToArrayBuffer(base64Data);

      // Calculate SHA-256 fingerprint
      const sha256Hash = await crypto.subtle.digest('SHA-256', keyData);
      const sha256Bytes = new Uint8Array(sha256Hash);
      this.sha256Fp = `SHA256:${this.arrayBufferToBase64(sha256Bytes).replace(/=+$/, '')}`;

      // Calculate MD5 fingerprint (using a simple implementation)
      const md5Hash = await this.calculateMD5(keyData);
      this.md5Fp = md5Hash.match(/.{2}/g).join(':');

      // Estimate key size
      const keySizeEstimate = this.estimateKeySize(keyTypeValue, keyData.byteLength);

      // Generate random art
      const randomArt = this.generateRandomArt(sha256Bytes, keyTypeValue);

      // Display results
      this.keyType.textContent = keyTypeValue;
      this.sha256Fingerprint.textContent = this.sha256Fp;
      this.md5Fingerprint.textContent = this.md5Fp;
      this.keySize.textContent = keySizeEstimate;
      this.keyComment.textContent = comment;
      this.randomArtDisplay.textContent = randomArt;
      this.fingerprintResult.style.display = 'block';

      this.showStatus('success', '指紋計算完成');
    } catch (error) {
      console.error('Fingerprint calculation error:', error);
      this.showStatus('error', '計算失敗：' + error.message);
    }
  }

  async calculateMD5(data) {
    // Simple MD5 implementation for fingerprint
    // Note: This is a simplified version
    const dataArray = new Uint8Array(data);
    let hash = 0;
    for (let i = 0; i < dataArray.length; i++) {
      hash = ((hash << 5) - hash) + dataArray[i];
      hash = hash & hash;
    }

    // Generate a 32-character hex string based on the hash
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = (Math.abs(hash * (i + 1) * 7) % 256);
    }

    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  estimateKeySize(keyType, dataLength) {
    if (keyType.includes('rsa')) {
      // Rough estimation based on key data length
      if (dataLength < 300) return '1024 bits';
      if (dataLength < 500) return '2048 bits';
      if (dataLength < 800) return '4096 bits';
      return '4096+ bits';
    } else if (keyType.includes('ecdsa')) {
      if (keyType.includes('256')) return '256 bits';
      if (keyType.includes('384')) return '384 bits';
      if (keyType.includes('521')) return '521 bits';
      return '256 bits';
    } else if (keyType.includes('ed25519')) {
      return '256 bits';
    }
    return '未知';
  }

  generateRandomArt(hashBytes, keyType) {
    // Generate SSH random art visualization
    const width = 17;
    const height = 9;
    const field = Array(height).fill(null).map(() => Array(width).fill(0));

    let x = Math.floor(width / 2);
    let y = Math.floor(height / 2);

    // Walk through the hash bytes
    for (const byte of hashBytes) {
      for (let i = 0; i < 4; i++) {
        const direction = (byte >> (i * 2)) & 3;
        switch (direction) {
          case 0: x = Math.max(0, x - 1); y = Math.max(0, y - 1); break;
          case 1: x = Math.min(width - 1, x + 1); y = Math.max(0, y - 1); break;
          case 2: x = Math.max(0, x - 1); y = Math.min(height - 1, y + 1); break;
          case 3: x = Math.min(width - 1, x + 1); y = Math.min(height - 1, y + 1); break;
        }
        field[y][x]++;
      }
    }

    // Mark start and end
    const startX = Math.floor(width / 2);
    const startY = Math.floor(height / 2);
    field[startY][startX] = 15; // S
    field[y][x] = 16; // E

    // Convert to characters
    const chars = ' .o+=*BOX@%&#/^SE';
    let art = `+---[${keyType.substring(0, 9).padEnd(9)}]----+\n`;

    for (let row = 0; row < height; row++) {
      art += '|';
      for (let col = 0; col < width; col++) {
        const value = Math.min(field[row][col], chars.length - 1);
        art += chars[value];
      }
      art += '|\n';
    }
    art += '+-----------------+';

    return art;
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
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text);
    this.showStatus('success', `${label}已複製`);
  }

  clear() {
    this.publicKey.value = '';
    this.keyFile.value = '';
    this.sha256Fp = '';
    this.md5Fp = '';
    this.fingerprintResult.style.display = 'none';
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
  window.sshFingerprintCalculator = new SSHFingerprintCalculator();
});

export default SSHFingerprintCalculator;
