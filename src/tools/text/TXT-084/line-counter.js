/**
 * TXT-084: Code Line Counter
 *
 * Counts lines of code, blank lines, and comment lines.
 */

class LineCounter {
  constructor() {
    this.commentPatterns = {
      'c-style': {
        single: /^\s*\/\//,
        multiStart: /\/\*/,
        multiEnd: /\*\//
      },
      'python': {
        single: /^\s*#/,
        multiStart: /^\s*("""|''')/,
        multiEnd: /("""|''')\s*$/
      },
      'html': {
        single: null,
        multiStart: /<!--/,
        multiEnd: /-->/
      },
      'sql': {
        single: /^\s*--/,
        multiStart: /\/\*/,
        multiEnd: /\*\//
      }
    };

    this.init();
  }

  init() {
    this.inputCode = document.getElementById('inputCode');
    this.langSelect = document.getElementById('langSelect');
    this.totalLines = document.getElementById('totalLines');
    this.codeLines = document.getElementById('codeLines');
    this.commentLines = document.getElementById('commentLines');
    this.blankLines = document.getElementById('blankLines');
    this.totalChars = document.getElementById('totalChars');
    this.codeRatio = document.getElementById('codeRatio');
    this.countBtn = document.getElementById('countBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.countBtn.addEventListener('click', () => this.count());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  count() {
    const code = this.inputCode.value;
    if (!code) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const lang = this.langSelect.value;
    const lines = code.split('\n');
    const stats = this.analyzeLines(lines, lang);

    this.totalLines.textContent = stats.total;
    this.codeLines.textContent = stats.code;
    this.commentLines.textContent = stats.comment;
    this.blankLines.textContent = stats.blank;
    this.totalChars.textContent = code.length.toLocaleString();
    this.codeRatio.textContent = stats.total > 0
      ? ((stats.code / stats.total) * 100).toFixed(1) + '%'
      : '0%';

    this.resultArea.style.display = 'block';
    this.showStatus('success', '統計完成');
  }

  analyzeLines(lines, lang) {
    const patterns = this.commentPatterns[lang];
    let stats = { total: lines.length, code: 0, comment: 0, blank: 0 };
    let inMultiLineComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '') {
        stats.blank++;
        continue;
      }

      if (inMultiLineComment) {
        stats.comment++;
        if (patterns.multiEnd && patterns.multiEnd.test(line)) {
          inMultiLineComment = false;
        }
        continue;
      }

      if (patterns.single && patterns.single.test(trimmed)) {
        stats.comment++;
        continue;
      }

      if (patterns.multiStart && patterns.multiStart.test(line)) {
        stats.comment++;
        if (!patterns.multiEnd.test(line.replace(patterns.multiStart, ''))) {
          inMultiLineComment = true;
        }
        continue;
      }

      stats.code++;
    }

    return stats;
  }

  clear() {
    this.inputCode.value = '';
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
  window.lineCounter = new LineCounter();
});

export default LineCounter;
