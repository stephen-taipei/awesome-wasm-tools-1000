/**
 * TXT-068: Roman Numeral Converter
 *
 * Converts between Roman numerals and Arabic numerals.
 */

class RomanNumeralConverter {
  constructor() {
    this.romanValues = [
      { roman: 'M', value: 1000 },
      { roman: 'CM', value: 900 },
      { roman: 'D', value: 500 },
      { roman: 'CD', value: 400 },
      { roman: 'C', value: 100 },
      { roman: 'XC', value: 90 },
      { roman: 'L', value: 50 },
      { roman: 'XL', value: 40 },
      { roman: 'X', value: 10 },
      { roman: 'IX', value: 9 },
      { roman: 'V', value: 5 },
      { roman: 'IV', value: 4 },
      { roman: 'I', value: 1 }
    ];

    this.romanMap = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50,
      'C': 100, 'D': 500, 'M': 1000
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
    const input = this.inputText.value.trim().toUpperCase();
    if (!input) {
      this.showStatus('error', '請輸入數字');
      return;
    }

    const direction = document.querySelector('input[name="direction"]:checked').value;

    try {
      let result;
      if (direction === 'toRoman') {
        const num = parseInt(input);
        if (isNaN(num) || num < 1 || num > 3999) {
          throw new Error('請輸入 1 到 3999 之間的整數');
        }
        result = this.toRoman(num);
      } else {
        if (!/^[IVXLCDM]+$/.test(input)) {
          throw new Error('無效的羅馬數字');
        }
        result = this.toArabic(input);
      }

      this.outputText.textContent = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '轉換完成');
    } catch (err) {
      this.showStatus('error', err.message);
    }
  }

  toRoman(num) {
    let result = '';
    let remaining = num;

    for (const { roman, value } of this.romanValues) {
      while (remaining >= value) {
        result += roman;
        remaining -= value;
      }
    }

    return result;
  }

  toArabic(roman) {
    let result = 0;

    for (let i = 0; i < roman.length; i++) {
      const current = this.romanMap[roman[i]];
      const next = this.romanMap[roman[i + 1]];

      if (next && current < next) {
        result -= current;
      } else {
        result += current;
      }
    }

    return result;
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
  window.romanNumeralConverter = new RomanNumeralConverter();
});

export default RomanNumeralConverter;
