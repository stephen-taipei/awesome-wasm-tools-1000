/**
 * TXT-018: Text Summarizer
 *
 * Extracts key sentences from text using extractive summarization.
 */

class TextSummarizer {
  constructor() {
    this.stopwords = new Set([
      '的', '了', '和', '是', '在', '有', '我', '他', '她', '它', '這', '那',
      '就', '也', '都', '不', '與', '及', '或', '但', '而', '如', '為', '被',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'must', 'shall', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
      'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while'
    ]);

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.summaryLength = document.getElementById('summaryLength');
    this.summarizeBtn = document.getElementById('summarizeBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.summaryOutput = document.getElementById('summaryOutput');
    this.originalCount = document.getElementById('originalCount');
    this.summaryCount = document.getElementById('summaryCount');
    this.compressionRatio = document.getElementById('compressionRatio');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.summarizeBtn.addEventListener('click', () => this.summarize());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  tokenize(text) {
    // Split into words, handle both English and Chinese
    const words = [];
    const englishWords = text.toLowerCase().match(/[a-zA-Z]+/g) || [];
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    return [...englishWords, ...chineseChars];
  }

  splitSentences(text) {
    // Split by sentence delimiters
    return text.split(/[.!?。！？\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  calculateWordFrequency(sentences) {
    const frequency = {};
    sentences.forEach(sentence => {
      const words = this.tokenize(sentence);
      words.forEach(word => {
        if (!this.stopwords.has(word) && word.length > 1) {
          frequency[word] = (frequency[word] || 0) + 1;
        }
      });
    });
    return frequency;
  }

  scoreSentence(sentence, wordFrequency) {
    const words = this.tokenize(sentence);
    if (words.length === 0) return 0;

    let score = 0;
    words.forEach(word => {
      if (wordFrequency[word]) {
        score += wordFrequency[word];
      }
    });

    // Normalize by sentence length
    return score / words.length;
  }

  summarize() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文章內容');
      return;
    }

    const numSentences = parseInt(this.summaryLength.value) || 5;
    const sentences = this.splitSentences(text);

    if (sentences.length === 0) {
      this.showStatus('error', '無法識別句子');
      return;
    }

    // Calculate word frequency
    const wordFrequency = this.calculateWordFrequency(sentences);

    // Score each sentence
    const scoredSentences = sentences.map((sentence, index) => ({
      text: sentence,
      score: this.scoreSentence(sentence, wordFrequency),
      index: index
    }));

    // Sort by score and take top N
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(numSentences, sentences.length));

    // Re-order by original position
    topSentences.sort((a, b) => a.index - b.index);

    const summary = topSentences.map(s => s.text).join('。') + '。';

    // Update UI
    const originalLength = text.replace(/\s/g, '').length;
    const summaryLength = summary.replace(/\s/g, '').length;
    const ratio = ((1 - summaryLength / originalLength) * 100).toFixed(1);

    this.originalCount.textContent = originalLength;
    this.summaryCount.textContent = summaryLength;
    this.compressionRatio.textContent = ratio + '%';

    this.summaryOutput.innerHTML = `<p>${summary}</p>`;
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.summaryOutput.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.summaryOutput.innerHTML = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.textSummarizer = new TextSummarizer();
});

export default TextSummarizer;
