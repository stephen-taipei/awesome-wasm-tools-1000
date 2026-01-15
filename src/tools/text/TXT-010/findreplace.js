/**
 * TXT-010: Find and Replace Tool
 *
 * Finds and replaces text with various options.
 */

class FindReplace {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.findText = document.getElementById('findText');
    this.replaceText = document.getElementById('replaceText');
    this.useRegex = document.getElementById('useRegex');
    this.caseSensitive = document.getElementById('caseSensitive');
    this.wholeWord = document.getElementById('wholeWord');
    this.findBtn = document.getElementById('findBtn');
    this.replaceBtn = document.getElementById('replaceBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.matchCount = document.getElementById('matchCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.findBtn.addEventListener('click', () => this.find());
    this.replaceBtn.addEventListener('click', () => this.replace());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  buildRegex(pattern) {
    let flags = 'g';
    if (!this.caseSensitive.checked) {
      flags += 'i';
    }

    let regexPattern = pattern;

    if (!this.useRegex.checked) {
      // Escape special regex characters
      regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    if (this.wholeWord.checked) {
      regexPattern = `\\b${regexPattern}\\b`;
    }

    return new RegExp(regexPattern, flags);
  }

  find() {
    const text = this.inputText.value;
    const find = this.findText.value;

    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    if (!find) {
      this.showStatus('error', '請輸入要查找的內容');
      return;
    }

    try {
      const regex = this.buildRegex(find);
      const matches = text.match(regex) || [];

      // Highlight matches
      const highlighted = text.replace(regex, '【$&】');

      this.outputText.value = highlighted;
      this.matchCount.textContent = matches.length;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', `找到 ${matches.length} 處匹配`);
    } catch (e) {
      this.showStatus('error', `正規表達式錯誤: ${e.message}`);
    }
  }

  replace() {
    const text = this.inputText.value;
    const find = this.findText.value;
    const replace = this.replaceText.value;

    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    if (!find) {
      this.showStatus('error', '請輸入要查找的內容');
      return;
    }

    try {
      const regex = this.buildRegex(find);
      const matches = text.match(regex) || [];
      const result = text.replace(regex, replace);

      this.outputText.value = result;
      this.matchCount.textContent = matches.length;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', `已替換 ${matches.length} 處`);
    } catch (e) {
      this.showStatus('error', `正規表達式錯誤: ${e.message}`);
    }
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
    this.findText.value = '';
    this.replaceText.value = '';
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
  window.findReplace = new FindReplace();
});

export default FindReplace;
