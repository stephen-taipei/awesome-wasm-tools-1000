/**
 * TXT-054: Character Encoding Converter
 *
 * Converts text between different character encodings.
 */

class EncodingConverter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.encodingSelect = document.getElementById('encodingSelect');
    this.formatSelect = document.getElementById('formatSelect');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  convert() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const encoding = this.encodingSelect.value;
    const format = this.formatSelect.value;

    try {
      const bytes = this.encodeText(text, encoding);
      const output = this.formatBytes(bytes, format);
      this.outputText.value = output;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '轉換完成');
    } catch (err) {
      this.showStatus('error', `轉換失敗: ${err.message}`);
    }
  }

  encodeText(text, encoding) {
    if (encoding === 'utf-8') {
      return new TextEncoder().encode(text);
    } else if (encoding === 'utf-16' || encoding === 'utf-16le') {
      const bytes = new Uint8Array(text.length * 2);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        bytes[i * 2] = code & 0xFF;
        bytes[i * 2 + 1] = (code >> 8) & 0xFF;
      }
      return bytes;
    } else if (encoding === 'utf-16be') {
      const bytes = new Uint8Array(text.length * 2);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        bytes[i * 2] = (code >> 8) & 0xFF;
        bytes[i * 2 + 1] = code & 0xFF;
      }
      return bytes;
    } else if (encoding === 'ascii' || encoding === 'iso-8859-1') {
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        bytes[i] = code & 0xFF;
      }
      return bytes;
    }
    throw new Error('不支援的編碼');
  }

  formatBytes(bytes, format) {
    switch (format) {
      case 'hex':
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      case 'decimal':
        return Array.from(bytes).join(' ');
      case 'binary':
        return Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ');
      case 'base64':
        return btoa(String.fromCharCode(...bytes));
      default:
        return Array.from(bytes).join(' ');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
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
  window.encodingConverter = new EncodingConverter();
});

export default EncodingConverter;
