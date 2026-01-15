/**
 * TXT-076: Grammar Checker
 *
 * Checks English text for common grammar errors.
 */

class GrammarChecker {
  constructor() {
    this.rules = [
      {
        name: 'Double spaces',
        pattern: /  +/g,
        message: '發現多餘的空格',
        suggestion: '使用單一空格'
      },
      {
        name: 'Missing space after punctuation',
        pattern: /[.!?,;:][A-Za-z]/g,
        message: '標點符號後缺少空格',
        suggestion: '在標點符號後加上空格'
      },
      {
        name: 'Double words',
        pattern: /\b(\w+)\s+\1\b/gi,
        message: '重複的單詞',
        suggestion: '移除重複的單詞'
      },
      {
        name: 'a/an usage',
        pattern: /\ba\s+[aeiouAEIOU]\w*/g,
        message: '"a" 應該用於輔音開頭的單詞前',
        suggestion: '改用 "an"'
      },
      {
        name: 'an/a usage',
        pattern: /\ban\s+[^aeiouAEIOU\s]\w*/g,
        message: '"an" 應該用於元音開頭的單詞前',
        suggestion: '改用 "a"'
      },
      {
        name: 'Missing capital after period',
        pattern: /\.\s+[a-z]/g,
        message: '句號後的第一個字母應該大寫',
        suggestion: '將字母改為大寫'
      },
      {
        name: 'its/it\'s confusion',
        pattern: /\bits\s+(is|has)\b/gi,
        message: '"its" 是所有格，"it\'s" 是縮寫',
        suggestion: '應該使用 "it\'s"'
      },
      {
        name: 'their/there/they\'re',
        pattern: /\btheir\s+(is|are|was|were)\b/gi,
        message: '"their" 是所有格',
        suggestion: '考慮使用 "there" 或 "they\'re"'
      },
      {
        name: 'your/you\'re',
        pattern: /\byour\s+(is|are|was|were|welcome)\b/gi,
        message: '"your" 是所有格',
        suggestion: '考慮使用 "you\'re"'
      },
      {
        name: 'Sentence starting with lowercase',
        pattern: /^[a-z]/,
        message: '句子應該以大寫字母開頭',
        suggestion: '將第一個字母改為大寫'
      },
      {
        name: 'Space before comma',
        pattern: /\s+,/g,
        message: '逗號前不應有空格',
        suggestion: '移除逗號前的空格'
      },
      {
        name: 'Space before period',
        pattern: /\s+\./g,
        message: '句號前不應有空格',
        suggestion: '移除句號前的空格'
      }
    ];

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.issueList = document.getElementById('issueList');
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

    const issues = [];

    for (const rule of this.rules) {
      const matches = text.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          issues.push({
            rule: rule.name,
            match: match,
            message: rule.message,
            suggestion: rule.suggestion
          });
        }
      }
    }

    this.displayIssues(issues);
    this.resultArea.style.display = 'block';

    if (issues.length === 0) {
      this.showStatus('success', '沒有發現文法問題');
    } else {
      this.showStatus('warning', `發現 ${issues.length} 個文法問題`);
    }
  }

  displayIssues(issues) {
    this.issueList.innerHTML = '';

    if (issues.length === 0) {
      this.issueList.innerHTML = '<p class="no-issues">沒有發現文法問題</p>';
      return;
    }

    for (const issue of issues) {
      const item = document.createElement('div');
      item.className = 'issue-item';

      const header = document.createElement('div');
      header.className = 'issue-header';
      header.innerHTML = `<strong>${issue.rule}</strong>: "${issue.match}"`;

      const message = document.createElement('div');
      message.className = 'issue-message';
      message.textContent = issue.message;

      const suggestion = document.createElement('div');
      suggestion.className = 'issue-suggestion';
      suggestion.textContent = '建議: ' + issue.suggestion;

      item.appendChild(header);
      item.appendChild(message);
      item.appendChild(suggestion);
      this.issueList.appendChild(item);
    }
  }

  clear() {
    this.inputText.value = '';
    this.issueList.innerHTML = '';
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
  window.grammarChecker = new GrammarChecker();
});

export default GrammarChecker;
