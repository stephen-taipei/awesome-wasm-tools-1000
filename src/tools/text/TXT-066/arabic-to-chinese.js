/**
 * TXT-066: Arabic to Chinese Number Converter
 *
 * Converts Arabic numerals to Chinese numerals.
 */

class ArabicToChineseNumber {
  constructor() {
    this.digits = {
      lowercase: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
      uppercase: ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'],
      financial: ['零', '壹', '貳', '叁', '肆', '伍', '陸', '柒', '捌', '玖']
    };

    this.units = {
      lowercase: ['', '十', '百', '千'],
      uppercase: ['', '拾', '佰', '仟'],
      financial: ['', '拾', '佰', '仟']
    };

    this.bigUnits = {
      lowercase: ['', '萬', '億', '兆', '京'],
      uppercase: ['', '萬', '億', '兆', '京'],
      financial: ['', '萬', '億', '兆', '京']
    };

    this.init();
  }

  init() {
    this.inputNumber = document.getElementById('inputNumber');
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
    this.inputNumber.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.convert();
    });
  }

  convert() {
    const input = this.inputNumber.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入數字');
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(input)) {
      this.showStatus('error', '請輸入有效的數字');
      return;
    }

    const format = document.querySelector('input[name="format"]:checked').value;
    const result = this.numberToChinese(input, format);

    this.outputText.textContent = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  numberToChinese(numStr, format) {
    const [intPart, decPart] = numStr.split('.');
    const digits = this.digits[format];
    const units = this.units[format];
    const bigUnits = this.bigUnits[format];

    if (intPart === '0') {
      let result = digits[0];
      if (decPart) {
        result += '點' + this.decimalToChinese(decPart, format);
      }
      return result;
    }

    let result = '';
    const sections = [];
    let temp = intPart;

    while (temp.length > 0) {
      sections.unshift(temp.slice(-4));
      temp = temp.slice(0, -4);
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionStr = this.sectionToChinese(section, format);
      const bigUnitIdx = sections.length - 1 - i;

      if (sectionStr) {
        result += sectionStr + bigUnits[bigUnitIdx];
      } else if (result && bigUnitIdx > 0) {
        if (!result.endsWith(digits[0])) {
          result += digits[0];
        }
      }
    }

    result = result.replace(new RegExp(digits[0] + '+', 'g'), digits[0]);
    if (result.endsWith(digits[0])) {
      result = result.slice(0, -1);
    }

    if (format === 'lowercase' && result.startsWith('一十')) {
      result = result.slice(1);
    }

    if (decPart) {
      result += '點' + this.decimalToChinese(decPart, format);
    }

    return result;
  }

  sectionToChinese(section, format) {
    const digits = this.digits[format];
    const units = this.units[format];
    let result = '';
    let hasZero = false;

    for (let i = 0; i < section.length; i++) {
      const digit = parseInt(section[i]);
      const unitIdx = section.length - 1 - i;

      if (digit === 0) {
        hasZero = true;
      } else {
        if (hasZero && result) {
          result += digits[0];
        }
        result += digits[digit] + units[unitIdx];
        hasZero = false;
      }
    }

    return result;
  }

  decimalToChinese(decimal, format) {
    const digits = this.digits[format];
    return decimal.split('').map(d => digits[parseInt(d)]).join('');
  }

  clear() {
    this.inputNumber.value = '';
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
  window.arabicToChineseNumber = new ArabicToChineseNumber();
});

export default ArabicToChineseNumber;
