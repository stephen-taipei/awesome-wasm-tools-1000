/**
 * TXT-006: Case Converter Tool
 *
 * Converts text between various case formats.
 */

class CaseConverter {
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
    document.querySelectorAll('[data-case]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const caseType = e.currentTarget.dataset.case;
        this.convert(caseType);
      });
    });

    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  toWords(text) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .filter(w => w);
  }

  convert(type) {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    let result = '';

    switch (type) {
      case 'upper':
        result = text.toUpperCase();
        break;
      case 'lower':
        result = text.toLowerCase();
        break;
      case 'title':
        result = text.replace(/\w\S*/g, txt =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'sentence':
        result = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
        break;
      case 'camel':
        result = this.toWords(text)
          .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
        break;
      case 'pascal':
        result = this.toWords(text)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
        break;
      case 'snake':
        result = this.toWords(text)
          .map(w => w.toLowerCase())
          .join('_');
        break;
      case 'kebab':
        result = this.toWords(text)
          .map(w => w.toLowerCase())
          .join('-');
        break;
      case 'constant':
        result = this.toWords(text)
          .map(w => w.toUpperCase())
          .join('_');
        break;
      case 'toggle':
        result = text.split('').map(c => {
          if (c === c.toUpperCase()) return c.toLowerCase();
          return c.toUpperCase();
        }).join('');
        break;
      case 'alternate':
        result = text.split('').map((c, i) =>
          i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
        ).join('');
        break;
      case 'random':
        result = text.split('').map(c =>
          Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()
        ).join('');
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
  window.caseConverter = new CaseConverter();
});

export default CaseConverter;
