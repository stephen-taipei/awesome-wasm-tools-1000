/**
 * TXT-098: Emoji Statistics
 *
 * Analyzes emoji usage in text.
 */

class EmojiStats {
  constructor() {
    // Regex to match emoji characters
    this.emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/gu;
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.totalCount = document.getElementById('totalCount');
    this.uniqueCount = document.getElementById('uniqueCount');
    this.density = document.getElementById('density');
    this.emojiRanking = document.getElementById('emojiRanking');
    this.extractedEmojis = document.getElementById('extractedEmojis');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  analyze() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const emojis = this.extractEmojis(text);

    if (emojis.length === 0) {
      this.showStatus('error', '未找到任何 Emoji');
      return;
    }

    const stats = this.calculateStats(emojis, text);
    this.displayResults(stats);
    this.resultArea.style.display = 'block';
    this.showStatus('success', '分析完成');
  }

  extractEmojis(text) {
    const matches = text.match(this.emojiRegex);
    return matches || [];
  }

  calculateStats(emojis, text) {
    // Count occurrences
    const counts = {};
    emojis.forEach(emoji => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);

    // Calculate density
    const totalChars = [...text].length;
    const emojiChars = emojis.length;
    const densityPercent = totalChars > 0
      ? ((emojiChars / totalChars) * 100).toFixed(1)
      : 0;

    return {
      total: emojis.length,
      unique: Object.keys(counts).length,
      density: densityPercent,
      ranking: sorted,
      allEmojis: emojis
    };
  }

  displayResults(stats) {
    this.totalCount.textContent = stats.total;
    this.uniqueCount.textContent = stats.unique;
    this.density.textContent = stats.density + '%';

    // Display ranking
    this.emojiRanking.innerHTML = '';
    const maxCount = stats.ranking[0] ? stats.ranking[0][1] : 1;

    stats.ranking.slice(0, 10).forEach(([emoji, count], index) => {
      const barWidth = (count / maxCount) * 100;
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <span class="rank-position">#${index + 1}</span>
        <span class="rank-emoji">${emoji}</span>
        <div class="rank-bar" style="width: ${barWidth}%"></div>
        <span class="rank-count">${count}</span>
      `;
      this.emojiRanking.appendChild(item);
    });

    // Display extracted emojis
    this.extractedEmojis.textContent = [...new Set(stats.allEmojis)].join(' ');
  }

  clear() {
    this.inputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.extractedEmojis.textContent.replace(/\s/g, '');
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
  window.emojiStats = new EmojiStats();
});

export default EmojiStats;
