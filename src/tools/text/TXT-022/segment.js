/**
 * TXT-022: Chinese Word Segmentation
 *
 * Segments Chinese text into words using maximum matching algorithm.
 */

class ChineseSegmenter {
  constructor() {
    // Common Chinese words dictionary (subset for demo)
    this.dictionary = new Set([
      // Common 2-character words
      '我們', '你們', '他們', '她們', '這個', '那個', '什麼', '為什麼', '怎麼', '可以',
      '不是', '就是', '因為', '所以', '如果', '雖然', '但是', '而且', '或者', '已經',
      '正在', '將要', '還是', '現在', '時候', '地方', '東西', '問題', '工作', '生活',
      '學習', '發展', '經濟', '社會', '文化', '教育', '科技', '環境', '國家', '世界',
      '人民', '政府', '企業', '公司', '市場', '產品', '服務', '技術', '資料', '信息',
      '網路', '電腦', '手機', '系統', '程式', '軟體', '硬體', '用戶', '客戶', '需求',
      '功能', '設計', '開發', '測試', '管理', '分析', '研究', '報告', '會議', '項目',
      // Common 3-character words
      '怎麼樣', '為什麼', '沒有人', '很多人', '每個人', '所有人', '大部分', '一部分',
      '互聯網', '數據庫', '伺服器', '瀏覽器', '作業系統', '人工智能', '機器學習',
      // Common 4-character words
      '與此同時', '在這裡', '不知道', '沒關係', '對不起', '謝謝你', '沒問題'
    ]);

    this.maxWordLength = 5;
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.segmentedText = document.getElementById('segmentedText');
    this.separator = document.getElementById('separator');
    this.segmentBtn = document.getElementById('segmentBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.wordCount = document.getElementById('wordCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.segmentBtn.addEventListener('click', () => this.segment());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  // Forward Maximum Matching algorithm
  segmentText(text) {
    const words = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Skip non-Chinese characters
      if (!/[\u4e00-\u9fa5]/.test(char)) {
        if (/\s/.test(char)) {
          i++;
          continue;
        }
        // Collect consecutive non-Chinese characters
        let nonChinese = '';
        while (i < text.length && !/[\u4e00-\u9fa5]/.test(text[i]) && !/\s/.test(text[i])) {
          nonChinese += text[i];
          i++;
        }
        if (nonChinese) words.push(nonChinese);
        continue;
      }

      // Maximum matching for Chinese
      let found = false;
      for (let len = Math.min(this.maxWordLength, text.length - i); len > 1; len--) {
        const word = text.slice(i, i + len);
        if (this.dictionary.has(word)) {
          words.push(word);
          i += len;
          found = true;
          break;
        }
      }

      // Single character if no match found
      if (!found) {
        words.push(char);
        i++;
      }
    }

    return words;
  }

  segment() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const words = this.segmentText(text);
    const sep = this.separator.value === '\\n' ? '\n' : this.separator.value;

    // Visual display
    this.segmentedText.innerHTML = words.map(w =>
      `<span class="word-segment">${this.escapeHtml(w)}</span>`
    ).join('');

    // Text output
    this.outputText.value = words.join(sep);
    this.wordCount.textContent = words.length;

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.segmentedText.innerHTML = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.chineseSegmenter = new ChineseSegmenter();
});

export default ChineseSegmenter;
