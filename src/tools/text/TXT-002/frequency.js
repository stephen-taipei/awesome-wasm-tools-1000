/**
 * TXT-002: Word Frequency Analyzer
 *
 * Analyzes word frequency in text and generates statistics table.
 */

class WordFrequencyAnalyzer {
  constructor() {
    this.frequencyData = [];
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.minLength = document.getElementById('minLength');
    this.topN = document.getElementById('topN');
    this.caseSensitive = document.getElementById('caseSensitive');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.frequencyTable = document.getElementById('frequencyTable');
    this.totalWords = document.getElementById('totalWords');
    this.uniqueWords = document.getElementById('uniqueWords');

    this.bindEvents();
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.exportBtn.addEventListener('click', () => this.exportCSV());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  analyze() {
    let text = this.inputText.value;
    if (!text.trim()) {
      this.resultArea.style.display = 'none';
      return;
    }

    const minLen = parseInt(this.minLength.value) || 1;
    const topCount = parseInt(this.topN.value) || 50;
    const isCaseSensitive = this.caseSensitive.checked;

    if (!isCaseSensitive) {
      text = text.toLowerCase();
    }

    // Extract words (English words + Chinese characters)
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const chineseChars = text.match(/[\u4e00-\u9fa5]+/g) || [];
    const allWords = [...englishWords, ...chineseChars].filter(w => w.length >= minLen);

    // Count frequency
    const frequency = {};
    allWords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Sort by frequency
    this.frequencyData = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topCount);

    const total = allWords.length;
    const unique = Object.keys(frequency).length;

    // Update UI
    this.totalWords.textContent = total.toLocaleString();
    this.uniqueWords.textContent = unique.toLocaleString();

    this.frequencyTable.innerHTML = this.frequencyData.map(([word, count], index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(word)}</td>
        <td>${count}</td>
        <td>${((count / total) * 100).toFixed(2)}%</td>
      </tr>
    `).join('');

    this.resultArea.style.display = 'block';
    this.exportBtn.style.display = 'inline-flex';
  }

  exportCSV() {
    const csv = ['排名,單詞,次數,百分比'];
    const total = this.frequencyData.reduce((sum, [, count]) => sum + count, 0);

    this.frequencyData.forEach(([word, count], index) => {
      csv.push(`${index + 1},"${word}",${count},${((count / total) * 100).toFixed(2)}%`);
    });

    const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'word_frequency.csv';
    link.click();
  }

  clear() {
    this.inputText.value = '';
    this.resultArea.style.display = 'none';
    this.exportBtn.style.display = 'none';
    this.frequencyData = [];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.frequencyAnalyzer = new WordFrequencyAnalyzer();
});

export default WordFrequencyAnalyzer;
