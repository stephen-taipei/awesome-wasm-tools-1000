/**
 * TXT-067: Chinese to Arabic Number Converter
 *
 * Converts Chinese numerals to Arabic numerals.
 */

class ChineseToArabicNumber {
  constructor() {
    this.digitMap = {
      '零': 0, '〇': 0,
      '一': 1, '壹': 1, '弌': 1,
      '二': 2, '貳': 2, '贰': 2, '弍': 2, '兩': 2, '两': 2,
      '三': 3, '參': 3, '叁': 3, '弎': 3, '参': 3,
      '四': 4, '肆': 4,
      '五': 5, '伍': 5,
      '六': 6, '陸': 6, '陆': 6,
      '七': 7, '柒': 7,
      '八': 8, '捌': 8,
      '九': 9, '玖': 9
    };

    this.unitMap = {
      '十': 10, '拾': 10,
      '百': 100, '佰': 100,
      '千': 1000, '仟': 1000
    };

    this.bigUnitMap = {
      '萬': 10000, '万': 10000,
      '億': 100000000, '亿': 100000000,
      '兆': 1000000000000,
      '京': 10000000000000000
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.inputText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.convert();
    });
  }

  convert() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入中文數字');
      return;
    }

    try {
      const result = this.chineseToNumber(input);
      this.outputText.textContent = result.toLocaleString();
      this.resultArea.style.display = 'block';
      this.showStatus('success', '轉換完成');
    } catch (err) {
      this.showStatus('error', err.message);
    }
  }

  chineseToNumber(chinese) {
    if (chinese.includes('點') || chinese.includes('点')) {
      const [intPart, decPart] = chinese.split(/點|点/);
      const intNum = this.parseInteger(intPart);
      const decNum = this.parseDecimal(decPart);
      return parseFloat(intNum + '.' + decNum);
    }

    return this.parseInteger(chinese);
  }

  parseInteger(chinese) {
    if (!chinese || chinese === '零') return 0;

    let result = 0;
    let section = 0;
    let temp = 0;
    let lastUnit = 1;

    for (let i = 0; i < chinese.length; i++) {
      const char = chinese[i];

      if (this.digitMap[char] !== undefined) {
        temp = this.digitMap[char];
      } else if (this.unitMap[char] !== undefined) {
        const unit = this.unitMap[char];
        if (temp === 0 && unit === 10 && i === 0) {
          temp = 1;
        }
        section += temp * unit;
        temp = 0;
        lastUnit = unit;
      } else if (this.bigUnitMap[char] !== undefined) {
        const bigUnit = this.bigUnitMap[char];
        section += temp;
        result += section * bigUnit;
        section = 0;
        temp = 0;
      }
    }

    result += section + temp;
    return result;
  }

  parseDecimal(decimal) {
    let result = '';
    for (const char of decimal) {
      if (this.digitMap[char] !== undefined) {
        result += this.digitMap[char];
      }
    }
    return result || '0';
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.textContent;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
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
  window.chineseToArabicNumber = new ChineseToArabicNumber();
});

export default ChineseToArabicNumber;
