/**
 * TXT-003: Text Diff/Compare Tool
 *
 * Compares two texts and highlights differences using LCS algorithm.
 */

class TextDiff {
  constructor() {
    this.init();
  }

  init() {
    this.text1 = document.getElementById('text1');
    this.text2 = document.getElementById('text2');
    this.compareMode = document.getElementById('compareMode');
    this.ignoreCase = document.getElementById('ignoreCase');
    this.ignoreWhitespace = document.getElementById('ignoreWhitespace');
    this.compareBtn = document.getElementById('compareBtn');
    this.swapBtn = document.getElementById('swapBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.diffOutput = document.getElementById('diffOutput');
    this.addedCount = document.getElementById('addedCount');
    this.removedCount = document.getElementById('removedCount');
    this.unchangedCount = document.getElementById('unchangedCount');

    this.bindEvents();
  }

  bindEvents() {
    this.compareBtn.addEventListener('click', () => this.compare());
    this.swapBtn.addEventListener('click', () => this.swap());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  tokenize(text) {
    const mode = this.compareMode.value;
    let processedText = text;

    if (this.ignoreCase.checked) {
      processedText = processedText.toLowerCase();
    }

    if (this.ignoreWhitespace.checked) {
      processedText = processedText.replace(/\s+/g, ' ').trim();
    }

    switch (mode) {
      case 'char':
        return processedText.split('');
      case 'word':
        return processedText.split(/(\s+)/).filter(t => t);
      case 'line':
      default:
        return processedText.split('\n');
    }
  }

  // Longest Common Subsequence algorithm
  lcs(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find diff
    const diff = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        diff.unshift({ type: 'unchanged', value: a[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ type: 'added', value: b[j - 1] });
        j--;
      } else if (i > 0) {
        diff.unshift({ type: 'removed', value: a[i - 1] });
        i--;
      }
    }

    return diff;
  }

  compare() {
    const tokens1 = this.tokenize(this.text1.value);
    const tokens2 = this.tokenize(this.text2.value);

    const diff = this.lcs(tokens1, tokens2);

    let added = 0, removed = 0, unchanged = 0;
    const mode = this.compareMode.value;
    const separator = mode === 'line' ? '<br>' : (mode === 'word' ? ' ' : '');

    const html = diff.map(item => {
      const escapedValue = this.escapeHtml(item.value);
      const displayValue = mode === 'line' ? escapedValue : escapedValue;

      switch (item.type) {
        case 'added':
          added++;
          return `<span class="diff-added">${displayValue}</span>`;
        case 'removed':
          removed++;
          return `<span class="diff-removed">${displayValue}</span>`;
        default:
          unchanged++;
          return `<span class="diff-unchanged">${displayValue}</span>`;
      }
    }).join(separator);

    this.diffOutput.innerHTML = html || '<em>兩段文字完全相同</em>';
    this.addedCount.textContent = added;
    this.removedCount.textContent = removed;
    this.unchangedCount.textContent = unchanged;

    this.resultArea.style.display = 'block';
  }

  swap() {
    const temp = this.text1.value;
    this.text1.value = this.text2.value;
    this.text2.value = temp;
  }

  clear() {
    this.text1.value = '';
    this.text2.value = '';
    this.resultArea.style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.textDiff = new TextDiff();
});

export default TextDiff;
