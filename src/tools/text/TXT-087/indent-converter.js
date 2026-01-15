/**
 * TXT-087: Indent Converter
 *
 * Converts between spaces and tabs for indentation.
 */

class IndentConverter {
  constructor() {
    this.init();
  }

  init() {
    this.inputCode = document.getElementById('inputCode');
    this.outputCode = document.getElementById('outputCode');
    this.spaceCount = document.getElementById('spaceCount');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  convert() {
    const code = this.inputCode.value;
    if (!code) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const convType = document.querySelector('input[name="convType"]:checked').value;
    const spaces = parseInt(this.spaceCount.value);

    let result;
    if (convType === 'tabsToSpaces') {
      result = this.tabsToSpaces(code, spaces);
    } else {
      result = this.spacesToTabs(code, spaces);
    }

    this.outputCode.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  tabsToSpaces(code, spaceCount) {
    const spaces = ' '.repeat(spaceCount);
    return code.replace(/\t/g, spaces);
  }

  spacesToTabs(code, spaceCount) {
    const lines = code.split('\n');
    const result = lines.map(line => {
      let indent = 0;
      let i = 0;

      while (i < line.length && line[i] === ' ') {
        indent++;
        i++;
      }

      const tabs = Math.floor(indent / spaceCount);
      const remainingSpaces = indent % spaceCount;

      return '\t'.repeat(tabs) + ' '.repeat(remainingSpaces) + line.slice(i);
    });

    return result.join('\n');
  }

  clear() {
    this.inputCode.value = '';
    this.outputCode.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputCode.value;
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
  window.indentConverter = new IndentConverter();
});

export default IndentConverter;
