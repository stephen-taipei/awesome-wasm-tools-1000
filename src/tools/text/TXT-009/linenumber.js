/**
 * TXT-009: Line Number Tool
 *
 * Adds or removes line numbers from text.
 */

class LineNumberTool {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.startNumber = document.getElementById('startNumber');
    this.separator = document.getElementById('separator');
    this.padding = document.getElementById('padding');
    this.skipEmpty = document.getElementById('skipEmpty');
    this.addBtn = document.getElementById('addBtn');
    this.removeBtn = document.getElementById('removeBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.addBtn.addEventListener('click', () => this.addLineNumbers());
    this.removeBtn.addEventListener('click', () => this.removeLineNumbers());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  addLineNumbers() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const lines = text.split('\n');
    const start = parseInt(this.startNumber.value) || 1;
    const sep = this.separator.value;
    const usePadding = this.padding.checked;
    const skip = this.skipEmpty.checked;

    const maxNum = start + lines.length - 1;
    const padLength = usePadding ? String(maxNum).length : 0;

    let lineNum = start;
    const result = lines.map(line => {
      if (skip && !line.trim()) {
        return line;
      }
      const num = usePadding ? String(lineNum).padStart(padLength, '0') : lineNum;
      lineNum++;
      return `${num}${sep}${line}`;
    });

    this.outputText.value = result.join('\n');
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', '已添加行號');
  }

  removeLineNumbers() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const lines = text.split('\n');
    const result = lines.map(line => {
      // Remove common line number patterns
      return line
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/^\s*\d+:\s*/, '')
        .replace(/^\s*\d+\)\s*/, '')
        .replace(/^\s*\d+\t/, '')
        .replace(/^\s*\d+\s{2,}/, '')
        .replace(/^\s*\d+\s*\|\s*/, '');
    });

    this.outputText.value = result.join('\n');
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', '已移除行號');
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
  window.lineNumberTool = new LineNumberTool();
});

export default LineNumberTool;
