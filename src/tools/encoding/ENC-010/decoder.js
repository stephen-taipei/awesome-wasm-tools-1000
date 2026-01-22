/**
 * ENC-010: Base85 (Ascii85) Decoder
 * Decodes Base85 to original content.
 */

class Base85Decoder {
  constructor() {
    this.z85Alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
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
    document.querySelectorAll('input[name="format"]').forEach(radio => {
      radio.addEventListener('change', () => this.decode());
    });
  }

  decode() {
    let input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const format = document.querySelector('input[name="format"]:checked').value;

      let bytes;
      if (format === 'ascii85') {
        bytes = this.ascii85Decode(input);
      } else {
        bytes = this.z85Decode(input);
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(bytes);

      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：' + error.message);
      this.resultArea.style.display = 'none';
    }
  }

  ascii85Decode(input) {
    // Remove delimiters
    input = input.replace(/^<~/, '').replace(/~>$/, '').replace(/\s/g, '');

    const result = [];
    let i = 0;

    while (i < input.length) {
      if (input[i] === 'z') {
        result.push(0, 0, 0, 0);
        i++;
      } else {
        const chunk = input.slice(i, i + 5);
        const padding = 5 - chunk.length;
        const padded = chunk + 'u'.repeat(padding);

        let value = 0;
        for (let j = 0; j < 5; j++) {
          const code = padded.charCodeAt(j) - 33;
          if (code < 0 || code > 84) {
            throw new Error('Invalid character');
          }
          value = value * 85 + code;
        }

        result.push(
          (value >> 24) & 0xff,
          (value >> 16) & 0xff,
          (value >> 8) & 0xff,
          value & 0xff
        );

        // Remove padding bytes
        if (padding > 0) {
          result.splice(-padding);
        }

        i += chunk.length;
      }
    }

    return new Uint8Array(result);
  }

  z85Decode(input) {
    const result = [];

    for (let i = 0; i < input.length; i += 5) {
      const chunk = input.slice(i, i + 5);
      if (chunk.length < 5) break;

      let value = 0;
      for (let j = 0; j < 5; j++) {
        const idx = this.z85Alphabet.indexOf(chunk[j]);
        if (idx === -1) {
          throw new Error('Invalid character: ' + chunk[j]);
        }
        value = value * 85 + idx;
      }

      result.push(
        (value >> 24) & 0xff,
        (value >> 16) & 0xff,
        (value >> 8) & 0xff,
        value & 0xff
      );
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
  window.base85Decoder = new Base85Decoder();
});

export default Base85Decoder;
