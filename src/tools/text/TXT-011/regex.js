/**
 * TXT-011: Regex Tester Tool
 *
 * Tests regular expressions with real-time highlighting.
 */

class RegexTester {
  constructor() {
    this.init();
  }

  init() {
    this.regexPattern = document.getElementById('regexPattern');
    this.regexFlags = document.getElementById('regexFlags');
    this.regexError = document.getElementById('regexError');
    this.testString = document.getElementById('testString');
    this.resultArea = document.getElementById('resultArea');
    this.matchCount = document.getElementById('matchCount');
    this.groupCount = document.getElementById('groupCount');
    this.highlightedText = document.getElementById('highlightedText');
    this.matchDetails = document.getElementById('matchDetails');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.regexPattern.addEventListener('input', () => this.test());
    this.regexFlags.addEventListener('input', () => this.test());
    this.testString.addEventListener('input', () => this.test());

    document.querySelectorAll('[data-pattern]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.regexPattern.value = e.currentTarget.dataset.pattern;
        this.test();
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  test() {
    const pattern = this.regexPattern.value;
    const flags = this.regexFlags.value;
    const text = this.testString.value;

    if (!pattern || !text) {
      this.highlightedText.innerHTML = this.escapeHtml(text);
      this.matchCount.textContent = '0';
      this.groupCount.textContent = '0';
      this.matchDetails.innerHTML = '';
      this.regexError.style.display = 'none';
      return;
    }

    try {
      const regex = new RegExp(pattern, flags);
      this.regexError.style.display = 'none';

      // Find all matches
      const matches = [];
      let match;
      const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');

      while ((match = globalRegex.exec(text)) !== null) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1)
        });

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          globalRegex.lastIndex++;
        }
      }

      // Highlight matches
      let highlighted = '';
      let lastIndex = 0;

      matches.forEach((m, i) => {
        highlighted += this.escapeHtml(text.slice(lastIndex, m.index));
        highlighted += `<mark class="highlight-${i % 4}">${this.escapeHtml(m.match)}</mark>`;
        lastIndex = m.index + m.match.length;
      });
      highlighted += this.escapeHtml(text.slice(lastIndex));

      this.highlightedText.innerHTML = highlighted || this.escapeHtml(text);

      // Update stats
      this.matchCount.textContent = matches.length;
      this.groupCount.textContent = matches[0]?.groups?.length || 0;

      // Show match details
      this.matchDetails.innerHTML = matches.map((m, i) => `
        <div class="match-item">
          <strong>匹配 ${i + 1}:</strong> "${this.escapeHtml(m.match)}" (位置 ${m.index})
          ${m.groups.length ? `<div class="groups">群組: ${m.groups.map((g, j) => `[${j + 1}] "${this.escapeHtml(g || '')}"`).join(', ')}</div>` : ''}
        </div>
      `).join('') || '<em>沒有匹配</em>';

    } catch (e) {
      this.regexError.textContent = e.message;
      this.regexError.style.display = 'block';
      this.highlightedText.innerHTML = this.escapeHtml(text);
      this.matchCount.textContent = '0';
      this.matchDetails.innerHTML = '';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.regexTester = new RegexTester();
});

export default RegexTester;
