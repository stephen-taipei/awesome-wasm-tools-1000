/**
 * CRY-021: MD5 Hash Tool
 *
 * Implements MD5 message digest algorithm (RFC 1321).
 * MD5 produces a 128-bit (16-byte) hash value.
 *
 * WARNING: MD5 is cryptographically broken and should not be used for security purposes.
 * Use SHA-256 or stronger for security applications.
 *
 * All processing is done locally in the browser.
 */

class MD5Hash {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.fileInput = document.getElementById('fileInput');
    this.hashResult = document.getElementById('hashResult');
    this.inputType = document.getElementById('inputType');
    this.outputFormat = document.getElementById('outputFormat');
    this.hashBtn = document.getElementById('hashBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.uploadArea = document.getElementById('uploadArea');
    this.textInputGroup = document.getElementById('textInputGroup');
    this.fileInputGroup = document.getElementById('fileInputGroup');
    this.fileName = document.getElementById('fileName');
    this.statusMessage = document.getElementById('statusMessage');
    this.hashInfo = document.getElementById('hashInfo');
    this.inputLength = document.getElementById('inputLength');
    this.processTime = document.getElementById('processTime');

    this.selectedFile = null;

    // Pre-computed constants
    this.K = new Uint32Array([
      0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
      0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
      0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
      0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
      0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
      0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
      0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
      0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
      0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
      0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
      0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
      0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
      0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
      0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
      0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
      0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ]);

    this.S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];

    this.bindEvents();
  }

  bindEvents() {
    this.hashBtn.addEventListener('click', () => this.hash());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());

    this.inputType.addEventListener('change', (e) => {
      if (e.target.value === 'text') {
        this.textInputGroup.style.display = 'block';
        this.fileInputGroup.style.display = 'none';
      } else {
        this.textInputGroup.style.display = 'none';
        this.fileInputGroup.style.display = 'block';
      }
    });

    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) {
        this.selectedFile = e.dataTransfer.files[0];
        this.fileName.textContent = `已選擇: ${this.selectedFile.name}`;
      }
    });
  }

  handleFileSelect(e) {
    if (e.target.files[0]) {
      this.selectedFile = e.target.files[0];
      this.fileName.textContent = `已選擇: ${this.selectedFile.name}`;
    }
  }

  // MD5 implementation
  md5(message) {
    // Pre-processing
    const msgLen = message.length;
    const bitLen = msgLen * 8;

    // Pad message
    const padLen = ((msgLen + 8) % 64 > 56) ? 120 - (msgLen % 64) : 56 - (msgLen % 64);
    const paddedMsg = new Uint8Array(msgLen + padLen + 8);
    paddedMsg.set(message);
    paddedMsg[msgLen] = 0x80;

    // Append original length in bits (little-endian)
    const view = new DataView(paddedMsg.buffer);
    view.setUint32(paddedMsg.length - 8, bitLen >>> 0, true);
    view.setUint32(paddedMsg.length - 4, Math.floor(bitLen / 0x100000000), true);

    // Initialize hash values
    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    // Process each 64-byte chunk
    for (let i = 0; i < paddedMsg.length; i += 64) {
      const chunk = paddedMsg.slice(i, i + 64);
      const M = new Uint32Array(16);

      for (let j = 0; j < 16; j++) {
        M[j] = chunk[j * 4] | (chunk[j * 4 + 1] << 8) | (chunk[j * 4 + 2] << 16) | (chunk[j * 4 + 3] << 24);
      }

      let A = a0, B = b0, C = c0, D = d0;

      for (let j = 0; j < 64; j++) {
        let F, g;

        if (j < 16) {
          F = (B & C) | (~B & D);
          g = j;
        } else if (j < 32) {
          F = (D & B) | (~D & C);
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          F = B ^ C ^ D;
          g = (3 * j + 5) % 16;
        } else {
          F = C ^ (B | ~D);
          g = (7 * j) % 16;
        }

        F = (F + A + this.K[j] + M[g]) >>> 0;
        A = D;
        D = C;
        C = B;
        B = (B + this.rotl(F, this.S[j])) >>> 0;
      }

      a0 = (a0 + A) >>> 0;
      b0 = (b0 + B) >>> 0;
      c0 = (c0 + C) >>> 0;
      d0 = (d0 + D) >>> 0;
    }

    // Produce final hash (little-endian)
    const hash = new Uint8Array(16);
    const hashView = new DataView(hash.buffer);
    hashView.setUint32(0, a0, true);
    hashView.setUint32(4, b0, true);
    hashView.setUint32(8, c0, true);
    hashView.setUint32(12, d0, true);

    return hash;
  }

  rotl(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  async hash() {
    const inputType = this.inputType.value;
    let data;
    let dataLength;

    if (inputType === 'text') {
      const text = this.inputText.value;
      if (!text) {
        this.showStatus('error', '請輸入文字');
        return;
      }
      const encoder = new TextEncoder();
      data = encoder.encode(text);
      dataLength = text.length + ' 字元';
    } else {
      if (!this.selectedFile) {
        this.showStatus('error', '請選擇檔案');
        return;
      }
      const buffer = await this.selectedFile.arrayBuffer();
      data = new Uint8Array(buffer);
      dataLength = this.formatFileSize(data.length);
    }

    const startTime = performance.now();

    try {
      const hash = this.md5(data);
      const outputFormat = this.outputFormat.value;

      let result;
      if (outputFormat === 'hex') {
        result = this.arrayBufferToHex(hash);
      } else if (outputFormat === 'HEX') {
        result = this.arrayBufferToHex(hash).toUpperCase();
      } else {
        result = this.arrayBufferToBase64(hash);
      }

      this.hashResult.value = result;

      const endTime = performance.now();
      this.inputLength.textContent = dataLength;
      this.processTime.textContent = `${(endTime - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';

      this.showStatus('success', 'MD5 雜湊計算完成！');
    } catch (error) {
      console.error('Hash error:', error);
      this.showStatus('error', '雜湊計算失敗：' + error.message);
    }
  }

  copyResult() {
    if (this.hashResult.value) {
      navigator.clipboard.writeText(this.hashResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  clear() {
    this.inputText.value = '';
    this.hashResult.value = '';
    this.selectedFile = null;
    this.fileName.textContent = '';
    this.fileInput.value = '';
    this.hashInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  arrayBufferToHex(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  window.md5Hash = new MD5Hash();
});

export default MD5Hash;
