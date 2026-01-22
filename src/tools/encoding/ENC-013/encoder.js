/**
 * ENC-013: HTML Entity Encoder
 * Converts special characters to HTML entities.
 */

class HtmlEntityEncoder {
  constructor() {
    this.namedEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '©': '&copy;',
      '®': '&reg;',
      '™': '&trade;',
      '€': '&euro;',
      '£': '&pound;',
      '¥': '&yen;',
      '¢': '&cent;',
      '§': '&sect;',
      '¶': '&para;',
      '†': '&dagger;',
      '‡': '&Dagger;',
      '•': '&bull;',
      '…': '&hellip;',
      '—': '&mdash;',
      '–': '&ndash;',
      ' ': '&nbsp;',
      '«': '&laquo;',
      '»': '&raquo;',
      '°': '&deg;',
      '±': '&plusmn;',
      '×': '&times;',
      '÷': '&divide;',
      '¼': '&frac14;',
      '½': '&frac12;',
      '¾': '&frac34;'
    };
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
    this.encodeAll = document.getElementById('encodeAll');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.encodeAll.addEventListener('change', () => this.encode());
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
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
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const encodeAllChars = this.encodeAll.checked;

      let result = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0);

        // Check if should encode
        const shouldEncode = encodeAllChars ? code > 127 || this.namedEntities[char] : this.namedEntities[char];

        if (shouldEncode) {
          switch (mode) {
            case 'named':
              result += this.namedEntities[char] || `&#${code};`;
              break;
            case 'decimal':
              result += `&#${code};`;
              break;
            case 'hex':
              result += `&#x${code.toString(16)};`;
              break;
          }
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
  window.htmlEntityEncoder = new HtmlEntityEncoder();
});

export default HtmlEntityEncoder;
