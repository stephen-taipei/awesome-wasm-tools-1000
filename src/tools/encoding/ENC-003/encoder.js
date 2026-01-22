/**
 * ENC-003: Base32 Encoder
 * Encodes text to Base32 format (RFC 4648).
 */

class Base32Encoder {
  constructor() {
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
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
    this.noPadding = document.getElementById('noPadding');
    this.lowercase = document.getElementById('lowercase');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.noPadding.addEventListener('change', () => this.encode());
    this.lowercase.addEventListener('change', () => this.encode());
  }

  encode() {
    const text = this.inputText.value;
    if (!text) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      let result = this.base32Encode(data);

      if (this.noPadding.checked) {
        result = result.replace(/=+$/, '');
      }

      if (this.lowercase.checked) {
        result = result.toLowerCase();
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  base32Encode(data) {
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < data.length; i++) {
      value = (value << 8) | data[i];
      bits += 8;

      while (bits >= 5) {
        bits -= 5;
        result += this.alphabet[(value >> bits) & 0x1f];
      }
    }

    if (bits > 0) {
      result += this.alphabet[(value << (5 - bits)) & 0x1f];
    }

    // Add padding
    const padding = [0, 6, 4, 3, 1];
    const padCount = padding[data.length % 5];
    result += '='.repeat(padCount);

    return result;
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
  window.base32Encoder = new Base32Encoder();
});

export default Base32Encoder;
