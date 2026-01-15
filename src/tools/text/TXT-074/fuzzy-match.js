/**
 * TXT-074: Fuzzy Text Matching
 *
 * Performs fuzzy search matching in a list of texts.
 */

class FuzzyMatch {
  constructor() {
    this.init();
  }

  init() {
    this.searchTerm = document.getElementById('searchTerm');
    this.textList = document.getElementById('textList');
    this.threshold = document.getElementById('threshold');
    this.thresholdValue = document.getElementById('thresholdValue');
    this.matchList = document.getElementById('matchList');
    this.searchBtn = document.getElementById('searchBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.searchBtn.addEventListener('click', () => this.search());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.threshold.addEventListener('input', () => {
      this.thresholdValue.textContent = this.threshold.value + '%';
    });
    this.searchTerm.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
  }

  search() {
    const term = this.searchTerm.value.trim().toLowerCase();
    const list = this.textList.value.split('\n').filter(line => line.trim());
    const minScore = parseInt(this.threshold.value) / 100;

    if (!term) {
      this.showStatus('error', '請輸入搜尋詞');
      return;
    }

    if (list.length === 0) {
      this.showStatus('error', '請輸入文字列表');
      return;
    }

    const matches = [];
    for (const item of list) {
      const score = this.calculateSimilarity(term, item.toLowerCase());
      if (score >= minScore) {
        matches.push({ text: item, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    this.displayMatches(matches);
    this.resultArea.style.display = 'block';
    this.showStatus('success', `找到 ${matches.length} 個匹配項目`);
  }

  calculateSimilarity(str1, str2) {
    if (str2.includes(str1)) {
      return 1;
    }

    const m = str1.length;
    const n = str2.length;

    if (m === 0 || n === 0) return 0;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    const maxLen = Math.max(m, n);
    return 1 - dp[m][n] / maxLen;
  }

  displayMatches(matches) {
    this.matchList.innerHTML = '';

    if (matches.length === 0) {
      this.matchList.innerHTML = '<p class="no-match">沒有找到匹配項目</p>';
      return;
    }

    for (const match of matches) {
      const item = document.createElement('div');
      item.className = 'match-item';

      const text = document.createElement('span');
      text.className = 'match-text';
      text.textContent = match.text;

      const score = document.createElement('span');
      score.className = 'match-score';
      score.textContent = (match.score * 100).toFixed(1) + '%';

      const bar = document.createElement('div');
      bar.className = 'match-bar';
      bar.style.width = (match.score * 100) + '%';

      item.appendChild(text);
      item.appendChild(score);
      item.appendChild(bar);
      this.matchList.appendChild(item);
    }
  }

  clear() {
    this.searchTerm.value = '';
    this.textList.value = '';
    this.matchList.innerHTML = '';
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
  window.fuzzyMatch = new FuzzyMatch();
});

export default FuzzyMatch;
