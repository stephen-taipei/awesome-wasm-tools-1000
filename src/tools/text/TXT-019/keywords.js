/**
 * TXT-019: Keyword Extractor
 *
 * Extracts keywords from text using TF-IDF-like scoring.
 */

class KeywordExtractor {
  constructor() {
    this.stopwords = new Set([
      '的', '了', '和', '是', '在', '有', '我', '他', '她', '它', '這', '那',
      '就', '也', '都', '不', '與', '及', '或', '但', '而', '如', '為', '被',
      '所', '以', '從', '因', '因為', '所以', '如果', '雖然', '然而', '不過',
      '可以', '可能', '應該', '必須', '需要', '已經', '正在', '將要', '還是',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'must', 'shall', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'this', 'that', 'these',
      'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your'
    ]);

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.keywordCount = document.getElementById('keywordCount');
    this.minWordLength = document.getElementById('minWordLength');
    this.extractBtn = document.getElementById('extractBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.keywordCloud = document.getElementById('keywordCloud');
    this.keywordTable = document.getElementById('keywordTable');
    this.statusMessage = document.getElementById('statusMessage');

    this.keywords = [];
    this.bindEvents();
  }

  bindEvents() {
    this.extractBtn.addEventListener('click', () => this.extract());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  tokenize(text) {
    const words = [];

    // Extract English words
    const englishWords = text.toLowerCase().match(/[a-zA-Z]+/g) || [];
    words.push(...englishWords);

    // Extract Chinese words (2-4 character combinations)
    const chineseText = text.match(/[\u4e00-\u9fa5]+/g) || [];
    chineseText.forEach(segment => {
      // Simple n-gram extraction for Chinese
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= segment.length - len; i++) {
          words.push(segment.slice(i, i + len));
        }
      }
      // Also add single characters
      for (const char of segment) {
        words.push(char);
      }
    });

    return words;
  }

  extract() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文章內容');
      return;
    }

    const count = parseInt(this.keywordCount.value) || 10;
    const minLen = parseInt(this.minWordLength.value) || 2;

    // Tokenize and filter
    const words = this.tokenize(text);
    const frequency = {};

    words.forEach(word => {
      if (word.length >= minLen && !this.stopwords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    // Calculate score (TF-IDF-like)
    const totalWords = words.length;
    const scored = Object.entries(frequency).map(([word, freq]) => {
      // Favor medium-frequency words and longer words
      const tf = freq / totalWords;
      const lengthBonus = Math.log(word.length + 1);
      const score = tf * lengthBonus * Math.log(freq + 1);
      return { word, freq, score };
    });

    // Sort by score
    this.keywords = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, count);

    // Render cloud
    const maxScore = this.keywords[0]?.score || 1;
    this.keywordCloud.innerHTML = this.keywords.map(k => {
      const size = 0.8 + (k.score / maxScore) * 1.5;
      return `<span class="keyword-tag" style="font-size: ${size}em">${this.escapeHtml(k.word)}</span>`;
    }).join(' ');

    // Render table
    this.keywordTable.innerHTML = this.keywords.map((k, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${this.escapeHtml(k.word)}</td>
        <td>${k.score.toFixed(4)}</td>
        <td>${k.freq}</td>
      </tr>
    `).join('');

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    const text = this.keywords.map(k => k.word).join(', ');
    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.keywordCloud.innerHTML = '';
    this.keywordTable.innerHTML = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
    this.keywords = [];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  window.keywordExtractor = new KeywordExtractor();
});

export default KeywordExtractor;
