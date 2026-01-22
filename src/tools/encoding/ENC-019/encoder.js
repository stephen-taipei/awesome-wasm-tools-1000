/**
 * ENC-019: ROT13 Encoder/Decoder
 * Applies ROT13 letter substitution cipher.
 */

class Rot13Encoder {
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
  }

  encode() {
    const text = this.inputText.value;
    if (!text) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const result = this.rot13(text);

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', 'ROT13 轉換完成！');
    } catch (error) {
      this.showStatus('error', '轉換失敗：' + error.message);
    }
  }

  rot13(text) {
    return text.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const base = code >= 97 ? 97 : 65; // lowercase or uppercase
      return String.fromCharCode(((code - base + 13) % 26) + base);
    });
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
  window.rot13Encoder = new Rot13Encoder();
});

export default Rot13Encoder;
