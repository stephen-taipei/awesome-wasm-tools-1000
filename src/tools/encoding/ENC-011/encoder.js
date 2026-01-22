/**
 * ENC-011: URL Encoder
 * Encodes text using URL percent-encoding.
 */

class UrlEncoder {
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

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
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
      let result;

      switch (mode) {
        case 'component':
          result = encodeURIComponent(text);
          break;
        case 'uri':
          result = encodeURI(text);
          break;
        case 'all':
          result = this.encodeAll(text);
          break;
        default:
          result = encodeURIComponent(text);
      }

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  encodeAll(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code <= 0x7f) {
        result += '%' + code.toString(16).toUpperCase().padStart(2, '0');
      } else {
        // Handle multi-byte characters
        const encoded = encodeURIComponent(text[i]);
        result += encoded;
      }
    }
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
  window.urlEncoder = new UrlEncoder();
});

export default UrlEncoder;
