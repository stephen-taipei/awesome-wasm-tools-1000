/**
 * ENC-020: ROT47 Encoder/Decoder
 * Applies ROT47 ASCII character substitution cipher.
 */

class Rot47Encoder {
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
      const result = this.rot47(text);

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', 'ROT47 轉換完成！');
    } catch (error) {
      this.showStatus('error', '轉換失敗：' + error.message);
    }
  }

  rot47(text) {
    return text.replace(/[\x21-\x7E]/g, (char) => {
      const code = char.charCodeAt(0);
      // ASCII printable characters range from 33 (!) to 126 (~)
      // That's 94 characters, so we rotate by 47
      return String.fromCharCode(((code - 33 + 47) % 94) + 33);
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
  window.rot47Encoder = new Rot47Encoder();
});

export default Rot47Encoder;
