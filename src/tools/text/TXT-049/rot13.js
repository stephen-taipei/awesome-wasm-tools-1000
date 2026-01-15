/**
 * TXT-049: ROT13 and Rotation Ciphers
 *
 * Implements ROT13, ROT5, ROT18, ROT47, and Caesar cipher.
 */

class RotationCipher {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.cipherType = document.getElementById('cipherType');
    this.shiftRow = document.getElementById('shiftRow');
    this.shiftAmount = document.getElementById('shiftAmount');
    this.encryptBtn = document.getElementById('encryptBtn');
    this.decryptBtn = document.getElementById('decryptBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.cipherType.addEventListener('change', () => this.toggleShiftRow());
    this.encryptBtn.addEventListener('click', () => this.process(true));
    this.decryptBtn.addEventListener('click', () => this.process(false));
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  toggleShiftRow() {
    this.shiftRow.style.display = this.cipherType.value === 'caesar' ? 'flex' : 'none';
  }

  process(encrypt) {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const cipher = this.cipherType.value;
    let result = '';

    switch (cipher) {
      case 'rot13':
        result = this.rot13(text);
        break;
      case 'rot5':
        result = this.rot5(text);
        break;
      case 'rot18':
        result = this.rot18(text);
        break;
      case 'rot47':
        result = this.rot47(text);
        break;
      case 'caesar':
        const shift = parseInt(this.shiftAmount.value) || 3;
        result = this.caesar(text, encrypt ? shift : -shift);
        break;
    }

    this.outputText.textContent = result;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', encrypt ? '加密成功' : '解密成功');
  }

  rot13(text) {
    return text.replace(/[a-zA-Z]/g, (char) => {
      const base = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
    });
  }

  rot5(text) {
    return text.replace(/[0-9]/g, (char) => {
      return String.fromCharCode(((char.charCodeAt(0) - 48 + 5) % 10) + 48);
    });
  }

  rot18(text) {
    // ROT13 for letters + ROT5 for digits
    return text.replace(/[a-zA-Z0-9]/g, (char) => {
      if (/[a-zA-Z]/.test(char)) {
        const base = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
      } else {
        return String.fromCharCode(((char.charCodeAt(0) - 48 + 5) % 10) + 48);
      }
    });
  }

  rot47(text) {
    return text.replace(/[!-~]/g, (char) => {
      // ASCII printable range: 33 (!) to 126 (~)
      return String.fromCharCode(((char.charCodeAt(0) - 33 + 47) % 94) + 33);
    });
  }

  caesar(text, shift) {
    // Normalize shift to positive value in range 0-25
    shift = ((shift % 26) + 26) % 26;

    return text.replace(/[a-zA-Z]/g, (char) => {
      const base = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
    });
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.rotCipher = new RotationCipher();
});

export default RotationCipher;
