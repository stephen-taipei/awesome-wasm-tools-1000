/**
 * ENC-004: Base32 Decoder
 * Decodes Base32 to original text.
 */

class Base32Decoder {
  constructor() {
    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  decode() {
    let input = this.inputText.value.trim().toUpperCase();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      // Remove padding
      input = input.replace(/=+$/, '');

      const bytes = this.base32Decode(input);
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(bytes);

      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的 Base32 格式');
      this.resultArea.style.display = 'none';
    }
  }

  base32Decode(input) {
    const result = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const idx = this.alphabet.indexOf(char);
      if (idx === -1) {
        throw new Error('Invalid character: ' + char);
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bits -= 8;
        result.push((value >> bits) & 0xff);
      }
    }

    return new Uint8Array(result);
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
  window.base32Decoder = new Base32Decoder();
});

export default Base32Decoder;
