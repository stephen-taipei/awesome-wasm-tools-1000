/**
 * ENC-007: Base58 Encoder
 * Encodes data to Base58 format (Bitcoin/Flickr alphabet).
 */

class Base58Encoder {
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
    document.querySelectorAll('input[name="alphabet"]').forEach(radio => {
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
      const alphabetType = document.querySelector('input[name="alphabet"]:checked').value;
      const alphabet = this.alphabets[alphabetType];

      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const result = this.base58Encode(data, alphabet);

      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
  }

  base58Encode(data, alphabet) {
    // Count leading zeros
    let leadingZeros = 0;
    for (let i = 0; i < data.length && data[i] === 0; i++) {
      leadingZeros++;
    }

    // Convert to big integer
    let num = BigInt(0);
    for (let i = 0; i < data.length; i++) {
      num = num * BigInt(256) + BigInt(data[i]);
    }

    // Convert to base58
    let result = '';
    while (num > BigInt(0)) {
      const remainder = Number(num % BigInt(58));
      num = num / BigInt(58);
      result = alphabet[remainder] + result;
    }

    // Add leading characters for zeros
    return alphabet[0].repeat(leadingZeros) + result;
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
  window.base58Encoder = new Base58Encoder();
});

export default Base58Encoder;
