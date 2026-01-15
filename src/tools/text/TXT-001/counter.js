/**
 * TXT-001: Word Counter / Character Counter
 *
 * Counts characters, words, lines, paragraphs, and provides reading time estimation.
 * Supports both English and Chinese text analysis.
 */

class WordCounter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    // Stats elements
    this.charCount = document.getElementById('charCount');
    this.charNoSpaceCount = document.getElementById('charNoSpaceCount');
    this.wordCount = document.getElementById('wordCount');
    this.chineseCount = document.getElementById('chineseCount');
    this.lineCount = document.getElementById('lineCount');
    this.paragraphCount = document.getElementById('paragraphCount');
    this.sentenceCount = document.getElementById('sentenceCount');
    this.readTime = document.getElementById('readTime');

    this.bindEvents();
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.inputText.addEventListener('input', () => this.analyze());
  }

  analyze() {
    const text = this.inputText.value;

    if (!text) {
      this.resultArea.style.display = 'none';
      return;
    }

    // Character count
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;

    // Word count (English words + Chinese characters)
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const words = englishWords.length + chineseChars.length;

    // Line count
    const lines = text.split('\n').length;

    // Paragraph count (non-empty lines separated by blank lines)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0);

    // Sentence count
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim()).length;

    // Reading time (average 200 words per minute for English, 300 characters for Chinese)
    const readingMinutes = Math.ceil((englishWords.length / 200) + (chineseChars.length / 300));

    // Update UI
    this.charCount.textContent = chars.toLocaleString();
    this.charNoSpaceCount.textContent = charsNoSpace.toLocaleString();
    this.wordCount.textContent = words.toLocaleString();
    this.chineseCount.textContent = chineseChars.length.toLocaleString();
    this.lineCount.textContent = lines.toLocaleString();
    this.paragraphCount.textContent = paragraphs.toLocaleString();
    this.sentenceCount.textContent = sentences.toLocaleString();
    this.readTime.textContent = `${readingMinutes} 分鐘`;

    this.resultArea.style.display = 'block';
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
  window.wordCounter = new WordCounter();
});

export default WordCounter;
