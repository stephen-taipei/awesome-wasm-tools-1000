/**
 * CRY-039: CSPRNG Random Number Generator
 * Uses Web Crypto API for cryptographically secure random numbers.
 */

class CSPRNGGenerator {
  constructor() { this.init(); }

  init() {
    this.outputType = document.getElementById('outputType');
    this.byteCount = document.getElementById('byteCount');
    this.intMin = document.getElementById('intMin');
    this.intMax = document.getElementById('intMax');
    this.bigintBits = document.getElementById('bigintBits');
    this.outputFormat = document.getElementById('outputFormat');
    this.batchCount = document.getElementById('batchCount');
    this.bytesOptions = document.getElementById('bytesOptions');
    this.integerOptions = document.getElementById('integerOptions');
    this.bigintOptions = document.getElementById('bigintOptions');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.randomResult = document.getElementById('randomResult');
    this.randomInfo = document.getElementById('randomInfo');
    this.entropyBits = document.getElementById('entropyBits');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
    this.updateOptions();
    this.generate();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.outputType.addEventListener('change', () => this.updateOptions());
  }

  updateOptions() {
    const type = this.outputType.value;
    this.bytesOptions.style.display = type === 'bytes' ? 'flex' : 'none';
    this.integerOptions.style.display = type === 'integer' ? 'flex' : 'none';
    this.bigintOptions.style.display = type === 'bigint' ? 'flex' : 'none';

    // Show/hide format options based on type
    const formatRow = this.outputFormat.closest('.setting-row');
    if (type === 'float') {
      formatRow.style.display = 'none';
    } else {
      formatRow.style.display = 'flex';
    }
  }

  generateRandomBytes(count) {
    const bytes = new Uint8Array(count);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  generateRandomInteger(min, max) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range;

    let value;
    do {
      const bytes = this.generateRandomBytes(bytesNeeded);
      value = bytes.reduce((acc, b, i) => acc + b * (256 ** i), 0);
    } while (value >= maxValid);

    return min + (value % range);
  }

  generateRandomFloat() {
    const bytes = this.generateRandomBytes(8);
    // Generate a random 53-bit integer (JavaScript's max safe integer precision)
    const high = (bytes[6] & 0x1f) * 0x100000000 + bytes[5] * 0x1000000 + bytes[4] * 0x10000 + bytes[3] * 0x100 + bytes[2];
    const low = bytes[1] * 0x100 + bytes[0];
    const value = high * 0x10000 + low;
    return value / 0x20000000000000; // 2^53
  }

  generateRandomBigInt(bits) {
    const byteCount = Math.ceil(bits / 8);
    const bytes = this.generateRandomBytes(byteCount);
    // Mask off extra bits
    const extraBits = byteCount * 8 - bits;
    if (extraBits > 0) {
      bytes[byteCount - 1] &= (0xff >> extraBits);
    }
    let result = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
      result = result * 256n + BigInt(bytes[i]);
    }
    return result;
  }

  formatOutput(bytes, format) {
    switch (format) {
      case 'hex':
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      case 'base64':
        return btoa(String.fromCharCode(...bytes));
      case 'decimal':
        return Array.from(bytes).join(' ');
      case 'binary':
        return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ');
      default:
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  formatBigInt(value, format) {
    switch (format) {
      case 'hex': return value.toString(16);
      case 'decimal': return value.toString(10);
      case 'binary': return value.toString(2);
      case 'base64':
        const hex = value.toString(16).padStart(2, '0');
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        return btoa(String.fromCharCode(...bytes));
      default: return value.toString(16);
    }
  }

  generate() {
    const type = this.outputType.value;
    const format = this.outputFormat.value;
    const count = parseInt(this.batchCount.value);
    const results = [];
    let entropy = 0;

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'bytes': {
          const byteCount = parseInt(this.byteCount.value);
          const bytes = this.generateRandomBytes(byteCount);
          results.push(this.formatOutput(bytes, format));
          entropy = byteCount * 8;
          break;
        }
        case 'integer': {
          const min = parseInt(this.intMin.value) || 0;
          const max = parseInt(this.intMax.value) || 100;
          if (min >= max) {
            this.showStatus('error', '最小值必須小於最大值');
            return;
          }
          const value = this.generateRandomInteger(min, max);
          results.push(value.toString());
          entropy = Math.log2(max - min + 1);
          break;
        }
        case 'float': {
          const value = this.generateRandomFloat();
          results.push(value.toFixed(16));
          entropy = 53;
          break;
        }
        case 'bigint': {
          const bits = parseInt(this.bigintBits.value);
          const value = this.generateRandomBigInt(bits);
          results.push(this.formatBigInt(value, format));
          entropy = bits;
          break;
        }
      }
    }

    this.randomResult.value = results.join('\n');
    this.entropyBits.textContent = `${entropy.toFixed(1)} bits ${count > 1 ? '(每個)' : ''}`;
    this.randomInfo.style.display = 'block';
    this.showStatus('success', `已生成 ${count} 個隨機數`);
  }

  clear() {
    this.randomResult.value = '';
    this.randomInfo.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  copyResult() {
    if (this.randomResult.value) {
      navigator.clipboard.writeText(this.randomResult.value);
      this.showStatus('success', '已複製到剪貼簿');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.csprngGenerator = new CSPRNGGenerator(); });
export default CSPRNGGenerator;
