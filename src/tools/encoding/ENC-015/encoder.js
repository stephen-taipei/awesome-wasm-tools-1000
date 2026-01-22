/**
 * ENC-015: Unicode Escape Encoder
 * Converts text to Unicode escape sequences.
 */

class UnicodeEscapeEncoder {
  constructor() {
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
    this.encodeNonAsciiOnly = document.getElementById('encodeAll');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.encodeNonAsciiOnly.addEventListener('change', () => this.encode());
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
      const nonAsciiOnly = this.encodeNonAsciiOnly.checked;

      let result = '';
      for (const char of text) {
        const code = char.codePointAt(0);
        const shouldEncode = nonAsciiOnly ? code > 127 : true;

        if (shouldEncode) {
          result += this.formatCodePoint(code, format);
        } else {
          result += char;
        }
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  formatCodePoint(code, format) {
    switch (format) {
      case 'js':
        // JavaScript \uXXXX (surrogate pairs for > 0xFFFF)
        if (code > 0xFFFF) {
          const highSurrogate = Math.floor((code - 0x10000) / 0x400) + 0xD800;
          const lowSurrogate = ((code - 0x10000) % 0x400) + 0xDC00;
          return `\\u${highSurrogate.toString(16).toUpperCase().padStart(4, '0')}\\u${lowSurrogate.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        return `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;

      case 'es6':
        // ES6 \u{XXXXX}
        return `\\u{${code.toString(16).toUpperCase()}}`;

      case 'css':
        // CSS \XXXXXX
        return `\\${code.toString(16).toUpperCase()} `;

      case 'python':
        // Python \uXXXX or \UXXXXXXXX
        if (code > 0xFFFF) {
          return `\\U${code.toString(16).toUpperCase().padStart(8, '0')}`;
        }
        return `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;

      default:
        return `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;
    }
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
  window.unicodeEscapeEncoder = new UnicodeEscapeEncoder();
});

export default UnicodeEscapeEncoder;
