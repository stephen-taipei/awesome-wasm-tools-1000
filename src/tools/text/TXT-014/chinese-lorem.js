/**
 * TXT-014: Chinese Lorem Ipsum Generator
 *
 * Generates Chinese placeholder text.
 */

class ChineseLoremGenerator {
  constructor() {
    this.phrases = {
      modern: [
        '在這個快速發展的時代', '我們需要不斷學習', '科技改變了我們的生活',
        '人們越來越重視健康', '創新是推動進步的關鍵', '教育的重要性不言而喻',
        '環境保護刻不容緩', '文化傳承需要每個人的努力', '溝通是解決問題的橋樑',
        '團隊合作能夠創造奇蹟', '堅持不懈才能取得成功', '夢想是前進的動力',
        '生活中充滿了機遇與挑戰', '智慧來自於經驗的積累', '時間是最寶貴的資源',
        '每一天都是新的開始', '知識就是力量', '實踐出真知', '細節決定成敗',
        '態度決定一切', '努力工作才能實現目標', '保持積極的心態很重要'
      ],
      classical: [
        '天行健君子以自強不息', '學而時習之不亦說乎', '知之為知之不知為不知',
        '三人行必有我師焉', '溫故而知新可以為師矣', '己所不欲勿施於人',
        '學無止境唯勤是岸', '讀書破萬卷下筆如有神', '業精於勤荒於嬉',
        '天下興亡匹夫有責', '路漫漫其修遠兮吾將上下而求索', '千里之行始於足下',
        '不積跬步無以至千里', '鍥而不捨金石可鏤', '博學之審問之慎思之明辨之篤行之'
      ],
      news: [
        '根據最新統計數據顯示', '相關部門表示', '記者從會議上獲悉',
        '業內人士分析認為', '專家指出', '調查結果表明', '據可靠消息來源透露',
        '官方發言人表示', '市場觀察人士認為', '有關負責人介紹', '消息人士稱',
        '據了解', '據悉', '報導指出', '數據顯示', '研究發現', '資料表明'
      ],
      tech: [
        '人工智慧技術持續突破', '雲端運算改變了產業格局', '大數據分析提供精準洞察',
        '區塊鏈技術確保數據安全', '物聯網連接萬物', '5G 網路帶來新機遇',
        '機器學習演算法不斷優化', '自動化流程提高效率', '數位轉型勢在必行',
        '資訊安全成為首要考量', '虛擬實境開創新體驗', '量子運算前景廣闘',
        '智慧城市建設加速推進', '無人駕駛技術日趨成熟', '生物科技取得重大進展'
      ]
    };

    this.connectors = ['因此', '然而', '同時', '此外', '總之', '換言之', '事實上', '顯然', '不過', '其實'];
    this.endings = ['。', '。', '。', '！', '？'];

    this.init();
  }

  init() {
    this.generateType = document.getElementById('generateType');
    this.count = document.getElementById('count');
    this.style = document.getElementById('style');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.outputText = document.getElementById('outputText');
    this.charCount = document.getElementById('charCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  generateSentence(style) {
    const phrases = this.phrases[style];
    const phrase1 = this.random(phrases);
    const connector = Math.random() > 0.5 ? this.random(this.connectors) : '';
    const phrase2 = this.random(phrases);
    const ending = this.random(this.endings);

    if (connector) {
      return `${phrase1}，${connector}${phrase2}${ending}`;
    }
    return `${phrase1}${ending}`;
  }

  generateParagraph(style) {
    const sentenceCount = Math.floor(Math.random() * 3) + 3;
    const sentences = [];
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(this.generateSentence(style));
    }
    return sentences.join('');
  }

  generate() {
    const type = this.generateType.value;
    const num = parseInt(this.count.value) || 3;
    const style = this.style.value;

    let result = '';

    switch (type) {
      case 'paragraphs':
        const paragraphs = [];
        for (let i = 0; i < num; i++) {
          paragraphs.push(this.generateParagraph(style));
        }
        result = paragraphs.join('\n\n');
        break;

      case 'sentences':
        const sentences = [];
        for (let i = 0; i < num; i++) {
          sentences.push(this.generateSentence(style));
        }
        result = sentences.join('');
        break;

      case 'characters':
        let chars = '';
        while (chars.length < num) {
          chars += this.generateSentence(style);
        }
        result = chars.slice(0, num);
        break;
    }

    this.outputText.innerHTML = result.split('\n\n').map(p => `<p>${p}</p>`).join('');
    this.charCount.textContent = result.replace(/\s/g, '').length;

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.outputText.innerHTML = '';
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
  window.chineseLoremGenerator = new ChineseLoremGenerator();
});

export default ChineseLoremGenerator;
