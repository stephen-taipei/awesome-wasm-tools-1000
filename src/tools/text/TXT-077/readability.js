/**
 * TXT-077: Readability Analyzer
 *
 * Analyzes text readability level and complexity.
 */

class ReadabilityAnalyzer {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.fkGrade = document.getElementById('fkGrade');
    this.fkEase = document.getElementById('fkEase');
    this.readLevel = document.getElementById('readLevel');
    this.wordCount = document.getElementById('wordCount');
    this.sentenceCount = document.getElementById('sentenceCount');
    this.syllableCount = document.getElementById('syllableCount');
    this.avgWordLength = document.getElementById('avgWordLength');
    this.avgSentenceLength = document.getElementById('avgSentenceLength');
    this.complexWordRatio = document.getElementById('complexWordRatio');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  analyze() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const words = this.getWords(text);
    const sentences = this.getSentences(text);
    const syllables = this.countTotalSyllables(words);

    const wordCount = words.length;
    const sentenceCount = sentences.length || 1;
    const syllableCount = syllables;

    const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
    const avgSentLen = wordCount / sentenceCount;

    const complexWords = words.filter(w => this.countSyllables(w) >= 3).length;
    const complexRatio = (complexWords / wordCount) * 100;

    const fkEaseScore = 206.835 - 1.015 * avgSentLen - 84.6 * (syllableCount / wordCount);
    const fkGradeScore = 0.39 * avgSentLen + 11.8 * (syllableCount / wordCount) - 15.59;

    this.wordCount.textContent = wordCount;
    this.sentenceCount.textContent = sentenceCount;
    this.syllableCount.textContent = syllableCount;
    this.avgWordLength.textContent = avgWordLen.toFixed(1);
    this.avgSentenceLength.textContent = avgSentLen.toFixed(1);
    this.complexWordRatio.textContent = complexRatio.toFixed(1) + '%';

    this.fkGrade.textContent = Math.max(0, fkGradeScore).toFixed(1);
    this.fkEase.textContent = Math.min(100, Math.max(0, fkEaseScore)).toFixed(1);
    this.readLevel.textContent = this.getReadingLevel(fkEaseScore);

    this.resultArea.style.display = 'block';
    this.showStatus('success', '分析完成');
  }

  getWords(text) {
    return text.match(/[a-zA-Z]+/g) || [];
  }

  getSentences(text) {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  countTotalSyllables(words) {
    return words.reduce((sum, word) => sum + this.countSyllables(word), 0);
  }

  getReadingLevel(score) {
    if (score >= 90) return '非常簡單 (小學)';
    if (score >= 80) return '簡單 (小學高年級)';
    if (score >= 70) return '較簡單 (中學)';
    if (score >= 60) return '標準 (高中)';
    if (score >= 50) return '較難 (大學)';
    if (score >= 30) return '困難 (大學畢業)';
    return '非常困難 (專業)';
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
  window.readabilityAnalyzer = new ReadabilityAnalyzer();
});

export default ReadabilityAnalyzer;
