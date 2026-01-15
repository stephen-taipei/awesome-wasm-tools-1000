/**
 * TXT-085: Comment Remover
 *
 * Removes all comments from code.
 */

class CommentRemover {
  constructor() {
    this.init();
  }

  init() {
    this.inputCode = document.getElementById('inputCode');
    this.outputCode = document.getElementById('outputCode');
    this.langSelect = document.getElementById('langSelect');
    this.removedCount = document.getElementById('removedCount');
    this.removeBtn = document.getElementById('removeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.removeBtn.addEventListener('click', () => this.remove());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  remove() {
    const code = this.inputCode.value;
    if (!code) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const lang = this.langSelect.value;
    const result = this.removeComments(code, lang);

    this.outputCode.value = result.code;
    this.removedCount.textContent = result.removed;
    this.resultArea.style.display = 'block';
    this.showStatus('success', `移除了 ${result.removed} 行註解`);
  }

  removeComments(code, lang) {
    let result = code;
    let removed = 0;
    const originalLines = code.split('\n').length;

    switch (lang) {
      case 'c-style':
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        result = result.replace(/\/\/.*$/gm, '');
        break;

      case 'python':
        result = result.replace(/"""[\s\S]*?"""/g, '');
        result = result.replace(/'''[\s\S]*?'''/g, '');
        result = result.replace(/#.*$/gm, '');
        break;

      case 'html':
        result = result.replace(/<!--[\s\S]*?-->/g, '');
        break;

      case 'sql':
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        result = result.replace(/--.*$/gm, '');
        break;
    }

    result = result.split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');

    const newLines = result.split('\n').length;
    removed = originalLines - newLines;

    return { code: result, removed: Math.max(0, removed) };
  }

  clear() {
    this.inputCode.value = '';
    this.outputCode.value = '';
    this.removedCount.textContent = '0';
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
  window.commentRemover = new CommentRemover();
});

export default CommentRemover;
