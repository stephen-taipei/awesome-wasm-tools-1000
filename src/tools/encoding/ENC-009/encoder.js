/**
 * ENC-009: Base85 (Ascii85) Encoder
 * Encodes data to Base85 format.
 */

class Base85Encoder {
  constructor() {
    this.z85Alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    document.querySelectorAll('input[name="format"]').forEach(radio => {
      radio.addEventListener('change', () => this.encode());
    });
  }

  encode() {
    const text = this.inputText.value;
    if (!text) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const format = document.querySelector('input[name="format"]:checked').value;
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      let result;
      if (format === 'ascii85') {
        result = this.ascii85Encode(data);
      } else {
        result = this.z85Encode(data);
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  ascii85Encode(data) {
    let result = '<~';
    const padding = (4 - (data.length % 4)) % 4;
    const padded = new Uint8Array(data.length + padding);
    padded.set(data);

    for (let i = 0; i < padded.length; i += 4) {
      let value = (padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3];
      value = value >>> 0; // Convert to unsigned

      if (value === 0 && i + 4 <= data.length) {
        result += 'z';
      } else {
        const chars = [];
        for (let j = 4; j >= 0; j--) {
          chars[j] = String.fromCharCode((value % 85) + 33);
          value = Math.floor(value / 85);
        }
        const charsNeeded = (i + 4 <= data.length) ? 5 : 5 - padding;
        result += chars.slice(0, charsNeeded).join('');
      }
    }

    result += '~>';
    return result;
  }

  z85Encode(data) {
    // Z85 requires input length to be multiple of 4
    const padding = (4 - (data.length % 4)) % 4;
    const padded = new Uint8Array(data.length + padding);
    padded.set(data);

    let result = '';
    for (let i = 0; i < padded.length; i += 4) {
      let value = (padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3];
      value = value >>> 0;

      const chars = [];
      for (let j = 4; j >= 0; j--) {
        chars[j] = this.z85Alphabet[value % 85];
        value = Math.floor(value / 85);
      }
      result += chars.join('');
    }

    // Remove padding characters
    return result.slice(0, result.length - padding);
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿！');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.base85Encoder = new Base85Encoder();
});

export default Base85Encoder;
