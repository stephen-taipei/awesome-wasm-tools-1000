/**
 * TXT-083: Code Diff
 *
 * Compares two pieces of code and shows differences.
 */

class CodeDiff {
  constructor() {
    this.init();
  }

  init() {
    this.originalCode = document.getElementById('originalCode');
    this.modifiedCode = document.getElementById('modifiedCode');
    this.diffOutput = document.getElementById('diffOutput');
    this.addedCount = document.getElementById('addedCount');
    this.removedCount = document.getElementById('removedCount');
    this.compareBtn = document.getElementById('compareBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.compareBtn.addEventListener('click', () => this.compare());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  compare() {
    const original = this.originalCode.value;
    const modified = this.modifiedCode.value;

    if (!original && !modified) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    const diff = this.computeDiff(originalLines, modifiedLines);
    this.displayDiff(diff);

    this.resultArea.style.display = 'block';
    this.showStatus('success', '比較完成');
  }

  computeDiff(original, modified) {
    const m = original.length;
    const n = modified.length;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (original[i - 1] === modified[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const diff = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
        diff.unshift({ type: 'same', line: original[i - 1], lineNum: i });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: 'added', line: modified[j - 1], lineNum: j });
        j--;
      } else {
        diff.unshift({ type: 'removed', line: original[i - 1], lineNum: i });
        i--;
      }
    }

    return diff;
  }

  displayDiff(diff) {
    let html = '';
    let added = 0;
    let removed = 0;
    let leftNum = 0;
    let rightNum = 0;

    for (const item of diff) {
      const escapedLine = this.escapeHtml(item.line);

      if (item.type === 'same') {
        leftNum++;
        rightNum++;
        html += `<div class="diff-line diff-same"><span class="line-num">${leftNum}</span><span class="line-num">${rightNum}</span><span class="line-content">  ${escapedLine}</span></div>`;
      } else if (item.type === 'added') {
        rightNum++;
        added++;
        html += `<div class="diff-line diff-added"><span class="line-num"></span><span class="line-num">${rightNum}</span><span class="line-content">+ ${escapedLine}</span></div>`;
      } else {
        leftNum++;
        removed++;
        html += `<div class="diff-line diff-removed"><span class="line-num">${leftNum}</span><span class="line-num"></span><span class="line-content">- ${escapedLine}</span></div>`;
      }
    }

    this.diffOutput.innerHTML = html;
    this.addedCount.textContent = added;
    this.removedCount.textContent = removed;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  clear() {
    this.originalCode.value = '';
    this.modifiedCode.value = '';
    this.diffOutput.innerHTML = '';
    this.addedCount.textContent = '0';
    this.removedCount.textContent = '0';
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
  window.codeDiff = new CodeDiff();
});

export default CodeDiff;
