/**
 * ENC-016: Unicode Escape Decoder
 * Converts Unicode escape sequences back to original characters.
 */

class UnicodeEscapeDecoder {
  constructor() {
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
    let input = this.inputText.value;
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      let result = input;

      // ES6 format: \u{XXXXX}
      result = result.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
        return String.fromCodePoint(parseInt(hex, 16));
      });

      // Python extended format: \UXXXXXXXX
      result = result.replace(/\\U([0-9a-fA-F]{8})/g, (_, hex) => {
        return String.fromCodePoint(parseInt(hex, 16));
      });

      // Standard format: \uXXXX
      result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });

      // CSS format: \XXXXXX (followed by space)
      result = result.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => {
        return String.fromCodePoint(parseInt(hex, 16));
      });

      // HTML numeric entity: &#xXXXX; or &#DDDD;
      result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        return String.fromCodePoint(parseInt(hex, 16));
      });
      result = result.replace(/&#(\d+);/g, (_, dec) => {
        return String.fromCodePoint(parseInt(dec, 10));
      });

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：' + error.message);
      this.resultArea.style.display = 'none';
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
  window.unicodeEscapeDecoder = new UnicodeEscapeDecoder();
});

export default UnicodeEscapeDecoder;
