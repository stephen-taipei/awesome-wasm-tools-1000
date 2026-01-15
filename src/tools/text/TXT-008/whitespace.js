/**
 * TXT-008: Whitespace Handler Tool
 *
 * Handles whitespace, empty lines, and indentation.
 */

class WhitespaceHandler {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.tabSize = document.getElementById('tabSize');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.process(action);
      });
    });

    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  process(action) {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const tabSpaces = ' '.repeat(parseInt(this.tabSize.value) || 4);
    let result = '';

    switch (action) {
      case 'trim-all':
        result = text.trim();
        break;
      case 'trim-lines':
        result = text.split('\n').map(line => line.trim()).join('\n');
        break;
      case 'remove-empty':
        result = text.split('\n').filter(line => line.trim()).join('\n');
        break;
      case 'collapse-spaces':
        result = text.replace(/[ \t]+/g, ' ');
        break;
      case 'collapse-lines':
        result = text.replace(/\n{3,}/g, '\n\n');
        break;
      case 'remove-all-spaces':
        result = text.replace(/\s/g, '');
        break;
      case 'tabs-to-spaces':
        result = text.replace(/\t/g, tabSpaces);
        break;
      case 'spaces-to-tabs':
        const regex = new RegExp(tabSpaces, 'g');
        result = text.replace(regex, '\t');
        break;
      case 'normalize':
        result = text
          .trim()
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]+/g, ' ');
        break;
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '處理完成');
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
  window.whitespaceHandler = new WhitespaceHandler();
});

export default WhitespaceHandler;
