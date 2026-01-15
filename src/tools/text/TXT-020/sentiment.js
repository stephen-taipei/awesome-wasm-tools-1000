/**
 * TXT-020: Sentiment Analyzer
 *
 * Analyzes the sentiment of text using lexicon-based approach.
 */

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = {
      chinese: ['好', '棒', '讚', '優秀', '出色', '精彩', '完美', '喜歡', '愛', '開心',
        '快樂', '高興', '滿意', '感謝', '謝謝', '美好', '幸福', '成功', '勝利', '優質',
        '傑出', '卓越', '美麗', '漂亮', '可愛', '溫暖', '希望', '期待', '驚喜', '感動'],
      english: ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
        'awesome', 'love', 'like', 'happy', 'joy', 'pleased', 'satisfied', 'thank',
        'beautiful', 'perfect', 'best', 'brilliant', 'superb', 'outstanding', 'positive',
        'success', 'win', 'enjoy', 'nice', 'kind', 'lovely', 'pleasant', 'glad', 'hope']
    };

    this.negativeWords = {
      chinese: ['壞', '差', '爛', '糟糕', '討厭', '恨', '難過', '傷心', '憤怒', '生氣',
        '失望', '沮喪', '害怕', '擔心', '焦慮', '痛苦', '悲傷', '可惡', '噁心', '厭惡',
        '糟', '慘', '失敗', '錯誤', '問題', '麻煩', '困難', '危險', '可怕', '恐怖'],
      english: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad',
        'angry', 'upset', 'disappointed', 'frustrated', 'worried', 'anxious', 'fear',
        'pain', 'hurt', 'fail', 'wrong', 'problem', 'trouble', 'difficult', 'danger',
        'scary', 'boring', 'annoying', 'stupid', 'worst', 'negative', 'poor', 'ugly']
    };

    this.intensifiers = ['很', '非常', '極', '超', '太', 'very', 'really', 'extremely', 'so'];
    this.negators = ['不', '沒', '無', '別', 'not', "n't", 'never', 'no'];

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.meterFill = document.getElementById('meterFill');
    this.meterIndicator = document.getElementById('meterIndicator');
    this.sentimentEmoji = document.getElementById('sentimentEmoji');
    this.sentimentLabel = document.getElementById('sentimentLabel');
    this.sentimentScore = document.getElementById('sentimentScore');
    this.positiveCount = document.getElementById('positiveCount');
    this.negativeCount = document.getElementById('negativeCount');
    this.positiveWordsEl = document.getElementById('positiveWords');
    this.negativeWordsEl = document.getElementById('negativeWords');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  tokenize(text) {
    const words = [];
    // English words
    const english = text.toLowerCase().match(/[a-zA-Z']+/g) || [];
    words.push(...english);
    // Chinese characters
    const chinese = text.match(/[\u4e00-\u9fa5]+/g) || [];
    chinese.forEach(segment => {
      for (const char of segment) {
        words.push(char);
      }
      // Also check 2-char combinations
      for (let i = 0; i < segment.length - 1; i++) {
        words.push(segment.slice(i, i + 2));
      }
    });
    return words;
  }

  analyze() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const words = this.tokenize(text);
    const foundPositive = [];
    const foundNegative = [];
    let score = 0;
    let hasNegator = false;

    const allPositive = [...this.positiveWords.chinese, ...this.positiveWords.english];
    const allNegative = [...this.negativeWords.chinese, ...this.negativeWords.english];

    words.forEach((word, i) => {
      // Check for negators
      if (this.negators.includes(word)) {
        hasNegator = true;
        return;
      }

      // Check for intensifiers
      let multiplier = 1;
      if (i > 0 && this.intensifiers.includes(words[i - 1])) {
        multiplier = 1.5;
      }

      if (allPositive.includes(word)) {
        if (hasNegator) {
          foundNegative.push(word);
          score -= 1 * multiplier;
        } else {
          foundPositive.push(word);
          score += 1 * multiplier;
        }
        hasNegator = false;
      } else if (allNegative.includes(word)) {
        if (hasNegator) {
          foundPositive.push(word);
          score += 0.5 * multiplier;
        } else {
          foundNegative.push(word);
          score -= 1 * multiplier;
        }
        hasNegator = false;
      }
    });

    // Normalize score to -1 to 1 range
    const maxPossible = Math.max(foundPositive.length + foundNegative.length, 1);
    const normalizedScore = Math.max(-1, Math.min(1, score / maxPossible));

    // Update UI
    this.updateUI(normalizedScore, foundPositive, foundNegative);
    this.resultArea.style.display = 'block';
  }

  updateUI(score, positive, negative) {
    // Score display
    this.sentimentScore.textContent = score.toFixed(2);

    // Meter (0-100%, where 50% is neutral)
    const meterPercent = ((score + 1) / 2) * 100;
    this.meterIndicator.style.left = `${meterPercent}%`;

    // Color gradient
    let color;
    if (score > 0.3) {
      color = '#4CAF50';
    } else if (score < -0.3) {
      color = '#f44336';
    } else {
      color = '#FFC107';
    }
    this.meterFill.style.background = `linear-gradient(to right, #f44336, #FFC107 50%, #4CAF50)`;

    // Emoji and label
    if (score > 0.5) {
      this.sentimentEmoji.textContent = '😄';
      this.sentimentLabel.textContent = '非常正面';
    } else if (score > 0.2) {
      this.sentimentEmoji.textContent = '😊';
      this.sentimentLabel.textContent = '正面';
    } else if (score > -0.2) {
      this.sentimentEmoji.textContent = '😐';
      this.sentimentLabel.textContent = '中性';
    } else if (score > -0.5) {
      this.sentimentEmoji.textContent = '😟';
      this.sentimentLabel.textContent = '負面';
    } else {
      this.sentimentEmoji.textContent = '😢';
      this.sentimentLabel.textContent = '非常負面';
    }

    // Word counts
    this.positiveCount.textContent = positive.length;
    this.negativeCount.textContent = negative.length;

    // Word lists
    const unique = arr => [...new Set(arr)];
    this.positiveWordsEl.innerHTML = unique(positive).map(w =>
      `<span class="word-tag positive">${this.escapeHtml(w)}</span>`
    ).join('') || '<em>無</em>';
    this.negativeWordsEl.innerHTML = unique(negative).map(w =>
      `<span class="word-tag negative">${this.escapeHtml(w)}</span>`
    ).join('') || '<em>無</em>';
  }

  clear() {
    this.inputText.value = '';
    this.resultArea.style.display = 'none';
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
  window.sentimentAnalyzer = new SentimentAnalyzer();
});

export default SentimentAnalyzer;
