/**
 * TXT-075: Spell Checker
 *
 * Checks English text for spelling errors.
 */

class SpellChecker {
  constructor() {
    this.commonWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
      'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'having', 'does',
      'did', 'doing', 'done', 'should', 'must', 'may', 'might', 'shall', 'very', 'much',
      'more', 'such', 'each', 'many', 'few', 'both', 'same', 'own', 'still', 'too',
      'here', 'where', 'why', 'how', 'while', 'before', 'through', 'between', 'under', 'during',
      'without', 'within', 'along', 'around', 'since', 'until', 'however', 'therefore', 'although',
      'hello', 'world', 'test', 'example', 'text', 'word', 'sentence', 'paragraph', 'document',
      'computer', 'software', 'program', 'system', 'data', 'information', 'internet', 'website',
      'email', 'message', 'file', 'folder', 'code', 'function', 'variable', 'string', 'number',
      'array', 'object', 'class', 'method', 'error', 'warning', 'success', 'result', 'output',
      'input', 'user', 'password', 'login', 'button', 'click', 'page', 'form', 'field'
    ]);

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.highlightedText = document.getElementById('highlightedText');
    this.errorList = document.getElementById('errorList');
    this.checkBtn = document.getElementById('checkBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.checkBtn.addEventListener('click', () => this.check());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  check() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const words = text.match(/[a-zA-Z]+/g) || [];
    const errors = [];
    const seen = new Set();

    for (const word of words) {
      const lower = word.toLowerCase();
      if (!seen.has(lower) && !this.isValidWord(lower)) {
        errors.push({
          word: word,
          suggestions: this.getSuggestions(lower)
        });
        seen.add(lower);
      }
    }

    this.displayResults(text, errors);
    this.resultArea.style.display = 'block';

    if (errors.length === 0) {
      this.showStatus('success', '沒有發現拼字錯誤');
    } else {
      this.showStatus('warning', `發現 ${errors.length} 個可能的拼字錯誤`);
    }
  }

  isValidWord(word) {
    if (word.length <= 2) return true;
    return this.commonWords.has(word);
  }

  getSuggestions(word) {
    const suggestions = [];
    for (const dictWord of this.commonWords) {
      const distance = this.levenshteinDistance(word, dictWord);
      if (distance <= 2) {
        suggestions.push({ word: dictWord, distance });
      }
    }
    return suggestions
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(s => s.word);
  }

  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  }

  displayResults(text, errors) {
    const errorWords = new Set(errors.map(e => e.word.toLowerCase()));

    let highlighted = text.replace(/[a-zA-Z]+/g, (match) => {
      if (errorWords.has(match.toLowerCase())) {
        return `<span class="spell-error">${match}</span>`;
      }
      return match;
    });

    this.highlightedText.innerHTML = highlighted;

    this.errorList.innerHTML = '';
    if (errors.length === 0) {
      this.errorList.innerHTML = '<p class="no-errors">沒有發現拼字錯誤</p>';
      return;
    }

    for (const error of errors) {
      const item = document.createElement('div');
      item.className = 'error-item';

      const word = document.createElement('span');
      word.className = 'error-word';
      word.textContent = error.word;

      const suggestions = document.createElement('span');
      suggestions.className = 'error-suggestions';
      if (error.suggestions.length > 0) {
        suggestions.textContent = '建議: ' + error.suggestions.join(', ');
      } else {
        suggestions.textContent = '沒有建議';
      }

      item.appendChild(word);
      item.appendChild(suggestions);
      this.errorList.appendChild(item);
    }
  }

  clear() {
    this.inputText.value = '';
    this.highlightedText.innerHTML = '';
    this.errorList.innerHTML = '';
    this.resultArea.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'warning') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.spellChecker = new SpellChecker();
});

export default SpellChecker;
