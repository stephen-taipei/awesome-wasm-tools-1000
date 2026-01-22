/**
 * ENC-006: Hex (Base16) Decoder
 * Decodes hexadecimal to original content.
 */

class HexDecoder {
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
    let input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      // Clean input: remove 0x prefixes, spaces, and other separators
      input = input.replace(/0x/gi, '').replace(/[\s,;:\-]/g, '');

      if (!/^[0-9a-fA-F]*$/.test(input)) {
        throw new Error('Invalid hex characters');
      }

      if (input.length % 2 !== 0) {
        input = '0' + input; // Pad with leading zero
      }

      const bytes = new Uint8Array(input.length / 2);
      for (let i = 0; i < input.length; i += 2) {
        bytes[i / 2] = parseInt(input.substr(i, 2), 16);
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(bytes);

      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的十六進位格式');
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
  window.hexDecoder = new HexDecoder();
});

export default HexDecoder;
