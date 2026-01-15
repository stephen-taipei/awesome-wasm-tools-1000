/**
 * TXT-069: Text Obfuscator
 *
 * Converts text to obfuscated form using various techniques.
 */

class TextObfuscator {
  constructor() {
    this.homoglyphMap = {
      'a': 'а', 'b': 'ƅ', 'c': 'с', 'd': 'ԁ', 'e': 'е', 'g': 'ɡ', 'h': 'һ',
      'i': 'і', 'j': 'ј', 'k': 'κ', 'l': 'ⅼ', 'm': 'м', 'n': 'ո', 'o': 'о',
      'p': 'р', 'q': 'ԛ', 'r': 'г', 's': 'ѕ', 't': 'τ', 'u': 'υ', 'v': 'ν',
      'w': 'ѡ', 'x': 'х', 'y': 'у', 'z': 'ᴢ',
      'A': 'Α', 'B': 'Β', 'C': 'С', 'D': 'Ⅾ', 'E': 'Ε', 'F': 'Ϝ', 'G': 'Ԍ',
      'H': 'Η', 'I': 'Ι', 'J': 'Ј', 'K': 'Κ', 'L': 'Ⅼ', 'M': 'Μ', 'N': 'Ν',
      'O': 'Ο', 'P': 'Ρ', 'Q': 'Ԛ', 'R': 'Ʀ', 'S': 'Ѕ', 'T': 'Τ', 'U': 'υ',
      'V': 'Ⅴ', 'W': 'Ԝ', 'X': 'Χ', 'Y': 'Υ', 'Z': 'Ζ',
      '0': 'О', '1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '5': 'Ѕ', '6': 'б'
    };

    this.upsideDownMap = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ',
      'h': 'ɥ', 'i': 'ı', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u',
      'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n',
      'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
      'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': 'ᗡ', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁',
      'H': 'H', 'I': 'I', 'J': 'ſ', 'K': '⋊', 'L': '˥', 'M': 'W', 'N': 'N',
      'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '⊥', 'U': '∩',
      'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z',
      '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ',
      '8': '8', '9': '6', '0': '0',
      '.': '˙', ',': "'", '?': '¿', '!': '¡', "'": ',', '"': '„'
    };

    this.zalgoChars = {
      up: ['̍', '̎', '̄', '̅', '̿', '̑', '̆', '̐', '͒', '͗', '͑', '̇', '̈', '̊', '͂', '̓', '̈́', '͊', '͋', '͌', '̃', '̂', '̌', '͐', '̀', '́', '̋', '̏', '̒', '̓', '̔', '̽', '̾', '͆', '͊', '͋', '͌', '̈́'],
      down: ['̖', '̗', '̘', '̙', '̜', '̝', '̞', '̟', '̠', '̤', '̥', '̦', '̩', '̪', '̫', '̬', '̭', '̮', '̯', '̰', '̱', '̲', '̳', '̹', '̺', '̻', '̼', 'ͅ', '͇', '͈', '͉', '͍', '͎', '͓', '͔', '͕', '͖', '͙', '͚', '̣']
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.homoglyphs = document.getElementById('homoglyphs');
    this.zalgo = document.getElementById('zalgo');
    this.fullwidth = document.getElementById('fullwidth');
    this.upsidedown = document.getElementById('upsidedown');
    this.obfuscateBtn = document.getElementById('obfuscateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.obfuscateBtn.addEventListener('click', () => this.obfuscate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  obfuscate() {
    let text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    if (this.upsidedown.checked) {
      text = this.applyUpsideDown(text);
    }

    if (this.homoglyphs.checked) {
      text = this.applyHomoglyphs(text);
    }

    if (this.fullwidth.checked) {
      text = this.applyFullwidth(text);
    }

    if (this.zalgo.checked) {
      text = this.applyZalgo(text);
    }

    this.outputText.value = text;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '混淆完成');
  }

  applyHomoglyphs(text) {
    return text.split('').map(char => this.homoglyphMap[char] || char).join('');
  }

  applyFullwidth(text) {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 33 && code <= 126) {
        return String.fromCharCode(code + 65248);
      }
      if (char === ' ') {
        return '\u3000';
      }
      return char;
    }).join('');
  }

  applyZalgo(text) {
    return text.split('').map(char => {
      if (char === ' ' || char === '\n') return char;

      let result = char;
      const upCount = Math.floor(Math.random() * 3) + 1;
      const downCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < upCount; i++) {
        result += this.zalgoChars.up[Math.floor(Math.random() * this.zalgoChars.up.length)];
      }
      for (let i = 0; i < downCount; i++) {
        result += this.zalgoChars.down[Math.floor(Math.random() * this.zalgoChars.down.length)];
      }

      return result;
    }).join('');
  }

  applyUpsideDown(text) {
    return text.split('').map(char => this.upsideDownMap[char] || char).reverse().join('');
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.value;
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
  window.textObfuscator = new TextObfuscator();
});

export default TextObfuscator;
