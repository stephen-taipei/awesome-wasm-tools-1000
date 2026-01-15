/**
 * TXT-070: Text Deobfuscator
 *
 * Restores obfuscated text to normal form.
 */

class TextDeobfuscator {
  constructor() {
    this.homoglyphReverseMap = {
      'а': 'a', 'ƅ': 'b', 'с': 'c', 'ԁ': 'd', 'е': 'e', 'ɡ': 'g', 'һ': 'h',
      'і': 'i', 'ј': 'j', 'κ': 'k', 'ⅼ': 'l', 'м': 'm', 'ո': 'n', 'о': 'o',
      'р': 'p', 'ԛ': 'q', 'г': 'r', 'ѕ': 's', 'τ': 't', 'υ': 'u', 'ν': 'v',
      'ѡ': 'w', 'х': 'x', 'у': 'y', 'ᴢ': 'z',
      'Α': 'A', 'Β': 'B', 'С': 'C', 'Ⅾ': 'D', 'Ε': 'E', 'Ϝ': 'F', 'Ԍ': 'G',
      'Η': 'H', 'Ι': 'I', 'Ј': 'J', 'Κ': 'K', 'Ⅼ': 'L', 'Μ': 'M', 'Ν': 'N',
      'Ο': 'O', 'Ρ': 'P', 'Ԛ': 'Q', 'Ʀ': 'R', 'Ѕ': 'S', 'Τ': 'T',
      'Ⅴ': 'V', 'Ԝ': 'W', 'Χ': 'X', 'Υ': 'Y', 'Ζ': 'Z',
      'О': '0', 'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'б': '6'
    };

    this.upsideDownReverseMap = {
      'ɐ': 'a', 'q': 'b', 'ɔ': 'c', 'p': 'd', 'ǝ': 'e', 'ɟ': 'f', 'ƃ': 'g',
      'ɥ': 'h', 'ı': 'i', 'ɾ': 'j', 'ʞ': 'k', 'ɯ': 'm', 'u': 'n',
      'ɹ': 'r', 'ʇ': 't', 'n': 'u', 'ʌ': 'v', 'ʍ': 'w', 'ʎ': 'y',
      '∀': 'A', '𐐒': 'B', 'Ɔ': 'C', 'ᗡ': 'D', 'Ǝ': 'E', 'Ⅎ': 'F', '⅁': 'G',
      'ſ': 'J', '⋊': 'K', '˥': 'L', 'W': 'M', 'Ԁ': 'P', 'Ό': 'Q', 'ᴚ': 'R',
      '⊥': 'T', '∩': 'U', 'Λ': 'V', 'M': 'W', '⅄': 'Y',
      'Ɩ': '1', 'ᄅ': '2', 'Ɛ': '3', 'ㄣ': '4', 'ϛ': '5', '9': '6', 'ㄥ': '7',
      '˙': '.', '¿': '?', '¡': '!', '„': '"'
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.removedCount = document.getElementById('removedCount');
    this.deobfuscateBtn = document.getElementById('deobfuscateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.deobfuscateBtn.addEventListener('click', () => this.deobfuscate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  deobfuscate() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const originalLength = text.length;
    let result = text;

    result = this.removeZalgo(result);
    result = this.convertFullwidthToHalfwidth(result);
    result = this.replaceHomoglyphs(result);

    const removed = originalLength - result.length;
    this.outputText.value = result;
    this.removedCount.textContent = removed;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '去混淆完成');
  }

  removeZalgo(text) {
    return text.replace(/[\u0300-\u036f\u0489]/g, '');
  }

  convertFullwidthToHalfwidth(text) {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 0xFF01 && code <= 0xFF5E) {
        return String.fromCharCode(code - 65248);
      }
      if (char === '\u3000') {
        return ' ';
      }
      return char;
    }).join('');
  }

  replaceHomoglyphs(text) {
    const allMaps = { ...this.homoglyphReverseMap, ...this.upsideDownReverseMap };

    return text.split('').map(char => {
      return allMaps[char] || char;
    }).join('');
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.removedCount.textContent = '0';
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
  window.textDeobfuscator = new TextDeobfuscator();
});

export default TextDeobfuscator;
