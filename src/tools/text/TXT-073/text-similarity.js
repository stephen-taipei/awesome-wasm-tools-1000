/**
 * TXT-073: Text Similarity Calculator
 *
 * Calculates similarity between two texts using various algorithms.
 */

class TextSimilarity {
  constructor() {
    this.init();
  }

  init() {
    this.text1 = document.getElementById('text1');
    this.text2 = document.getElementById('text2');
    this.similarityPercent = document.getElementById('similarityPercent');
    this.levenshtein = document.getElementById('levenshtein');
    this.jaccard = document.getElementById('jaccard');
    this.cosine = document.getElementById('cosine');
    this.lcs = document.getElementById('lcs');
    this.compareBtn = document.getElementById('compareBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.compareBtn.addEventListener('click', () => this.compare());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  compare() {
    const str1 = this.text1.value;
    const str2 = this.text2.value;

    if (!str1 || !str2) {
      this.showStatus('error', '請輸入兩段文字');
      return;
    }

    const levDist = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    const levSim = maxLen > 0 ? ((1 - levDist / maxLen) * 100).toFixed(1) : 100;

    const jaccardSim = this.jaccardSimilarity(str1, str2);
    const cosineSim = this.cosineSimilarity(str1, str2);
    const lcsLen = this.longestCommonSubsequence(str1, str2);

    this.similarityPercent.textContent = levSim + '%';
    this.levenshtein.textContent = levDist;
    this.jaccard.textContent = (jaccardSim * 100).toFixed(1) + '%';
    this.cosine.textContent = (cosineSim * 100).toFixed(1) + '%';
    this.lcs.textContent = lcsLen;

    this.resultArea.style.display = 'block';
    this.showStatus('success', '比較完成');
  }

  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }

  jaccardSimilarity(str1, str2) {
    const set1 = new Set(str1.split(/\s+/).filter(w => w));
    const set2 = new Set(str2.split(/\s+/).filter(w => w));

    if (set1.size === 0 && set2.size === 0) return 1;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  cosineSimilarity(str1, str2) {
    const words1 = str1.split(/\s+/).filter(w => w);
    const words2 = str2.split(/\s+/).filter(w => w);

    const freq1 = this.getFrequency(words1);
    const freq2 = this.getFrequency(words2);

    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of allWords) {
      const f1 = freq1[word] || 0;
      const f2 = freq2[word] || 0;
      dotProduct += f1 * f2;
      norm1 += f1 * f1;
      norm2 += f2 * f2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  getFrequency(words) {
    const freq = {};
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }
    return freq;
  }

  longestCommonSubsequence(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  clear() {
    this.text1.value = '';
    this.text2.value = '';
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
  window.textSimilarity = new TextSimilarity();
});

export default TextSimilarity;
