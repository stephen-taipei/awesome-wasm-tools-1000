/**
 * TXT-007: Text Reverser Tool
 *
 * Reverses text in various ways.
 */

class TextReverser {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    document.querySelectorAll('[data-reverse]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reverseType = e.currentTarget.dataset.reverse;
        this.reverse(reverseType);
      });
    });

    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  reverseString(str) {
    return [...str].reverse().join('');
  }

  reverse(type) {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    let result = '';

    switch (type) {
      case 'chars':
        result = this.reverseString(text);
        break;
      case 'words':
        result = text.split(/(\s+)/).filter(t => t).reverse().join('');
        break;
      case 'lines':
        result = text.split('\n').reverse().join('\n');
        break;
      case 'each-word':
        result = text.replace(/\S+/g, word => this.reverseString(word));
        break;
      case 'each-line':
        result = text.split('\n').map(line => this.reverseString(line)).join('\n');
        break;
      case 'sentences':
        result = text.split(/([.!?]+\s*)/).reduce((acc, part, i, arr) => {
          if (i % 2 === 0 && part) {
            acc.push(part + (arr[i + 1] || ''));
          }
          return acc;
        }, []).reverse().join('');
        break;
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
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
  window.textReverser = new TextReverser();
});

export default TextReverser;
