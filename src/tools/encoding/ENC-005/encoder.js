/**
 * ENC-005: Hex (Base16) Encoder
 * Converts text to hexadecimal format.
 */

class HexEncoder {
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
    this.uppercase = document.getElementById('uppercase');
    this.addSpace = document.getElementById('addSpace');
    this.addPrefix = document.getElementById('addPrefix');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.uppercase.addEventListener('change', () => this.encode());
    this.addSpace.addEventListener('change', () => this.encode());
    this.addPrefix.addEventListener('change', () => this.encode());
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
      let hexArray = Array.from(data).map(byte => {
        let hex = byte.toString(16).padStart(2, '0');
        if (this.uppercase.checked) {
          hex = hex.toUpperCase();
        }
        if (this.addPrefix.checked) {
          hex = '0x' + hex;
        }
        return hex;
      });

      let result = this.addSpace.checked ? hexArray.join(' ') : hexArray.join('');

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
  window.hexEncoder = new HexEncoder();
});

export default HexEncoder;
