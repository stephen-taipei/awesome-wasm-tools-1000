/**
 * TXT-078: Text Statistics Report
 *
 * Generates comprehensive text statistics analysis report.
 */

class TextReport {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.basicStats = document.getElementById('basicStats');
    this.charStats = document.getElementById('charStats');
    this.topWords = document.getElementById('topWords');
    this.topChars = document.getElementById('topChars');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  generate() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const stats = this.analyzeText(text);
    this.displayReport(stats);
    this.resultArea.style.display = 'block';
    this.showStatus('success', '報告生成完成');
  }

  analyzeText(text) {
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g) || [];
    const lines = text.split('\n').length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || 1;
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim()).length;

    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    const digits = (text.match(/\d/g) || []).length;
    const spaces = (text.match(/\s/g) || []).length;
    const punctuation = (text.match(/[^\w\s]/g) || []).length;
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

    const wordFreq = {};
    for (const word of words) {
      const lower = word.toLowerCase();
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    }

    const charFreq = {};
    for (const char of text) {
      if (char.trim()) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
    }

    return {
      basic: {
        '總字元數': chars.toLocaleString(),
        '字元數 (不含空格)': charsNoSpace.toLocaleString(),
        '單詞/字數': words.length.toLocaleString(),
        '行數': lines.toLocaleString(),
        '段落數': paragraphs.toLocaleString(),
        '句子數': sentences.toLocaleString(),
        '平均單詞長度': words.length ? (charsNoSpace / words.length).toFixed(1) : '0',
        '閱讀時間': Math.ceil(words.length / 200) + ' 分鐘'
      },
      chars: {
        '英文字母': letters.toLocaleString(),
        '數字': digits.toLocaleString(),
        '空白字元': spaces.toLocaleString(),
        '標點符號': punctuation.toLocaleString(),
        '中文字': chinese.toLocaleString()
      },
      wordFreq,
      charFreq
    };
  }

  displayReport(stats) {
    this.basicStats.innerHTML = '';
    for (const [label, value] of Object.entries(stats.basic)) {
      this.basicStats.innerHTML += `
        <div class="stat-item">
          <span class="stat-label">${label}</span>
          <span class="stat-value">${value}</span>
        </div>
      `;
    }

    this.charStats.innerHTML = '';
    for (const [label, value] of Object.entries(stats.chars)) {
      this.charStats.innerHTML += `
        <div class="stat-item">
          <span class="stat-label">${label}</span>
          <span class="stat-value">${value}</span>
        </div>
      `;
    }

    const topWords = Object.entries(stats.wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.topWords.innerHTML = '';
    for (const [word, count] of topWords) {
      const item = document.createElement('div');
      item.className = 'freq-item';
      item.innerHTML = `<span class="freq-word">${word}</span><span class="freq-count">${count}</span>`;
      this.topWords.appendChild(item);
    }

    const topChars = Object.entries(stats.charFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.topChars.innerHTML = '';
    for (const [char, count] of topChars) {
      const item = document.createElement('div');
      item.className = 'freq-item';
      item.innerHTML = `<span class="freq-char">${char}</span><span class="freq-count">${count}</span>`;
      this.topChars.appendChild(item);
    }
  }

  clear() {
    this.inputText.value = '';
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
  window.textReport = new TextReport();
});

export default TextReport;
