/**
 * TXT-089: Text Truncator
 *
 * Truncates text to specified length.
 */

class TextTruncator {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.maxLength = document.getElementById('maxLength');
    this.truncateMode = document.getElementById('truncateMode');
    this.ellipsis = document.getElementById('ellipsis');
    this.preserveWords = document.getElementById('preserveWords');
    this.originalLength = document.getElementById('originalLength');
    this.truncatedLength = document.getElementById('truncatedLength');
    this.truncateBtn = document.getElementById('truncateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.truncateBtn.addEventListener('click', () => this.truncate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  truncate() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const max = parseInt(this.maxLength.value) || 100;
    const mode = this.truncateMode.value;
    const suffix = this.ellipsis.value;
    const preserve = this.preserveWords.checked;

    let result;
    switch (mode) {
      case 'chars':
        result = this.truncateByChars(text, max, suffix, preserve);
        break;
      case 'words':
        result = this.truncateByWords(text, max, suffix);
        break;
      case 'sentences':
        result = this.truncateBySentences(text, max, suffix);
        break;
    }

    this.outputText.value = result;
    this.originalLength.textContent = text.length;
    this.truncatedLength.textContent = result.length;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '截斷完成');
  }

  truncateByChars(text, max, suffix, preserveWords) {
    if (text.length <= max) return text;

    let truncated = text.substring(0, max - suffix.length);

    if (preserveWords) {
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
    }

    return truncated.trimEnd() + suffix;
  }

  truncateByWords(text, max, suffix) {
    const words = text.split(/\s+/).filter(w => w);
    if (words.length <= max) return text;

    return words.slice(0, max).join(' ') + suffix;
  }

  truncateBySentences(text, max, suffix) {
    const sentences = text.split(/(?<=[.!?。！？])\s*/);
    if (sentences.length <= max) return text;

    return sentences.slice(0, max).join(' ') + suffix;
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.originalLength.textContent = '0';
    this.truncatedLength.textContent = '0';
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
  window.textTruncator = new TextTruncator();
});

export default TextTruncator;
