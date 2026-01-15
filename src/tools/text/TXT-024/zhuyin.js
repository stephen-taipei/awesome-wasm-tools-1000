/**
 * TXT-024: Zhuyin (Bopomofo) Converter
 *
 * Converts Chinese characters to Zhuyin/Bopomofo.
 */

class ZhuyinConverter {
  constructor() {
    // Character to Zhuyin mapping (subset)
    this.zhuyinMap = {
      '中': 'ㄓㄨㄥ', '國': 'ㄍㄨㄛˊ', '人': 'ㄖㄣˊ', '民': 'ㄇㄧㄣˊ', '大': 'ㄉㄚˋ',
      '學': 'ㄒㄩㄝˊ', '我': 'ㄨㄛˇ', '你': 'ㄋㄧˇ', '他': 'ㄊㄚ', '她': 'ㄊㄚ',
      '們': 'ㄇㄣ˙', '的': 'ㄉㄜ˙', '是': 'ㄕˋ', '在': 'ㄗㄞˋ', '有': 'ㄧㄡˇ',
      '不': 'ㄅㄨˋ', '了': 'ㄌㄜ˙', '這': 'ㄓㄜˋ', '那': 'ㄋㄚˋ', '和': 'ㄏㄜˊ',
      '就': 'ㄐㄧㄡˋ', '也': 'ㄧㄝˇ', '都': 'ㄉㄡ', '上': 'ㄕㄤˋ', '下': 'ㄒㄧㄚˋ',
      '來': 'ㄌㄞˊ', '去': 'ㄑㄩˋ', '天': 'ㄊㄧㄢ', '地': 'ㄉㄧˋ', '日': 'ㄖˋ',
      '月': 'ㄩㄝˋ', '年': 'ㄋㄧㄢˊ', '時': 'ㄕˊ', '好': 'ㄏㄠˇ', '想': 'ㄒㄧㄤˇ',
      '要': 'ㄧㄠˋ', '能': 'ㄋㄥˊ', '會': 'ㄏㄨㄟˋ', '可': 'ㄎㄜˇ', '以': 'ㄧˇ',
      '一': 'ㄧ', '二': 'ㄦˋ', '三': 'ㄙㄢ', '四': 'ㄙˋ', '五': 'ㄨˇ', '六': 'ㄌㄧㄡˋ',
      '七': 'ㄑㄧ', '八': 'ㄅㄚ', '九': 'ㄐㄧㄡˇ', '十': 'ㄕˊ', '百': 'ㄅㄞˇ',
      '千': 'ㄑㄧㄢ', '萬': 'ㄨㄢˋ', '什': 'ㄕㄜˊ', '麼': 'ㄇㄜ˙', '為': 'ㄨㄟˋ',
      '因': 'ㄧㄣ', '所': 'ㄙㄨㄛˇ', '從': 'ㄘㄨㄥˊ', '到': 'ㄉㄠˋ', '說': 'ㄕㄨㄛ',
      '話': 'ㄏㄨㄚˋ', '看': 'ㄎㄢˋ', '見': 'ㄐㄧㄢˋ', '聽': 'ㄊㄧㄥ', '寫': 'ㄒㄧㄝˇ',
      '讀': 'ㄉㄨˊ', '吃': 'ㄔ', '喝': 'ㄏㄜ', '走': 'ㄗㄡˇ', '跑': 'ㄆㄠˇ',
      '做': 'ㄗㄨㄛˋ', '用': 'ㄩㄥˋ', '開': 'ㄎㄞ', '關': 'ㄍㄨㄢ', '門': 'ㄇㄣˊ',
      '家': 'ㄐㄧㄚ', '愛': 'ㄞˋ', '心': 'ㄒㄧㄣ', '手': 'ㄕㄡˇ', '頭': 'ㄊㄡˊ',
      '口': 'ㄎㄡˇ', '眼': 'ㄧㄢˇ', '耳': 'ㄦˇ', '身': 'ㄕㄣ', '體': 'ㄊㄧˇ',
      '水': 'ㄕㄨㄟˇ', '火': 'ㄏㄨㄛˇ', '山': 'ㄕㄢ', '海': 'ㄏㄞˇ', '花': 'ㄏㄨㄚ',
      '草': 'ㄘㄠˇ', '樹': 'ㄕㄨˋ', '書': 'ㄕㄨ', '字': 'ㄗˋ', '文': 'ㄨㄣˊ',
      '言': 'ㄧㄢˊ', '語': 'ㄩˇ', '電': 'ㄉㄧㄢˋ', '腦': 'ㄋㄠˇ', '機': 'ㄐㄧ',
      '車': 'ㄔㄜ', '路': 'ㄌㄨˋ', '飛': 'ㄈㄟ', '雲': 'ㄩㄣˊ', '風': 'ㄈㄥ',
      '雨': 'ㄩˇ', '雪': 'ㄒㄩㄝˇ', '東': 'ㄉㄨㄥ', '西': 'ㄒㄧ', '南': 'ㄋㄢˊ',
      '北': 'ㄅㄟˇ', '前': 'ㄑㄧㄢˊ', '後': 'ㄏㄡˋ', '左': 'ㄗㄨㄛˇ', '右': 'ㄧㄡˋ',
      '多': 'ㄉㄨㄛ', '少': 'ㄕㄠˇ', '長': 'ㄔㄤˊ', '短': 'ㄉㄨㄢˇ', '高': 'ㄍㄠ',
      '新': 'ㄒㄧㄣ', '舊': 'ㄐㄧㄡˋ', '老': 'ㄌㄠˇ', '生': 'ㄕㄥ', '死': 'ㄙˇ',
      '明': 'ㄇㄧㄥˊ', '白': 'ㄅㄞˊ', '黑': 'ㄏㄟ', '紅': 'ㄏㄨㄥˊ', '黃': 'ㄏㄨㄤˊ'
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.zhuyinDisplay = document.getElementById('zhuyinDisplay');
    this.displayStyle = document.getElementById('displayStyle');
    this.convertBtn = document.getElementById('convertBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  convert() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const style = this.displayStyle.value;
    const display = [];
    const output = [];

    for (const char of text) {
      const zhuyin = this.zhuyinMap[char];

      if (zhuyin) {
        switch (style) {
          case 'ruby':
            display.push(`<ruby>${char}<rt>${zhuyin}</rt></ruby>`);
            output.push(`${char}(${zhuyin})`);
            break;
          case 'inline':
            display.push(`${char}<span class="zhuyin-inline">${zhuyin}</span>`);
            output.push(`${char}[${zhuyin}]`);
            break;
          case 'only':
            display.push(`<span class="zhuyin-only">${zhuyin}</span>`);
            output.push(zhuyin);
            break;
        }
      } else {
        display.push(char);
        output.push(char);
      }
    }

    this.zhuyinDisplay.innerHTML = display.join('');
    this.outputText.value = output.join(style === 'only' ? ' ' : '');

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
    this.zhuyinDisplay.innerHTML = '';
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
  window.zhuyinConverter = new ZhuyinConverter();
});

export default ZhuyinConverter;
