/**
 * ENC-008: Base58 Decoder
 * Decodes Base58 to original content.
 */

class Base58Decoder {
  constructor() {
    this.alphabets = {
      bitcoin: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      flickr: '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
    };
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
    document.querySelectorAll('input[name="alphabet"]').forEach(radio => {
      radio.addEventListener('change', () => this.decode());
    });
  }

  decode() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.resultArea.style.display = 'none';
      return;
    }

    try {
      const alphabetType = document.querySelector('input[name="alphabet"]:checked').value;
      const alphabet = this.alphabets[alphabetType];

      const bytes = this.base58Decode(input, alphabet);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(bytes);

      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的 Base58 格式');
      this.resultArea.style.display = 'none';
    }
  }

  base58Decode(input, alphabet) {
    // Count leading ones (zeros in output)
    let leadingOnes = 0;
    for (let i = 0; i < input.length && input[i] === alphabet[0]; i++) {
      leadingOnes++;
    }

    // Convert from base58
    let num = BigInt(0);
    for (let i = 0; i < input.length; i++) {
      const idx = alphabet.indexOf(input[i]);
      if (idx === -1) {
        throw new Error('Invalid character: ' + input[i]);
      }
      num = num * BigInt(58) + BigInt(idx);
    }

    // Convert to bytes
    const bytes = [];
    while (num > BigInt(0)) {
      bytes.unshift(Number(num % BigInt(256)));
      num = num / BigInt(256);
    }

    // Add leading zeros
    for (let i = 0; i < leadingOnes; i++) {
      bytes.unshift(0);
    }

    return new Uint8Array(bytes);
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
  window.base58Decoder = new Base58Decoder();
});

export default Base58Decoder;
