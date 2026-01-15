/**
 * TXT-026: JSON Formatter
 *
 * Formats and beautifies JSON data.
 */

class JSONFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.indentSize = document.getElementById('indentSize');
    this.sortKeys = document.getElementById('sortKeys');
    this.formatBtn = document.getElementById('formatBtn');
    this.minifyBtn = document.getElementById('minifyBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.jsonSize = document.getElementById('jsonSize');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.minifyBtn.addEventListener('click', () => this.minify());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  }

  format() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    try {
      let parsed = JSON.parse(input);

      if (this.sortKeys.checked) {
        parsed = this.sortObjectKeys(parsed);
      }

      let indent = this.indentSize.value;
      if (indent === 'tab') {
        indent = '\t';
      } else {
        indent = parseInt(indent);
      }

      const formatted = JSON.stringify(parsed, null, indent);
      this.outputText.textContent = formatted;
      this.jsonSize.textContent = formatted.length;

      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'JSON 格式化成功');
    } catch (e) {
      this.showStatus('error', `JSON 解析錯誤: ${e.message}`);
    }
  }

  minify() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);

      this.outputText.textContent = minified;
      this.jsonSize.textContent = minified.length;

      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'JSON 壓縮成功');
    } catch (e) {
      this.showStatus('error', `JSON 解析錯誤: ${e.message}`);
    }
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
  window.jsonFormatter = new JSONFormatter();
});

export default JSONFormatter;
