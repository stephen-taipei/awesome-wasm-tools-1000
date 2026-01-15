/**
 * TXT-053: Unicode Normalization
 *
 * Converts text to Unicode normalization forms (NFC, NFD, NFKC, NFKD).
 */

class UnicodeNormalize {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.normalizeBtn = document.getElementById('normalizeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.originalLength = document.getElementById('originalLength');
    this.normalizedLength = document.getElementById('normalizedLength');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.normalizeBtn.addEventListener('click', () => this.normalize());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  normalize() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const form = document.querySelector('input[name="normForm"]:checked').value;
    const normalized = text.normalize(form);

    this.outputText.value = normalized;
    this.originalLength.textContent = text.length;
    this.normalizedLength.textContent = normalized.length;
    this.resultArea.style.display = 'block';

    this.showStatus('success', `已轉換為 ${form} 形式`);
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
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
  window.unicodeNormalize = new UnicodeNormalize();
});

export default UnicodeNormalize;
