/**
 * TXT-063: IPA (International Phonetic Alphabet) Input
 *
 * Provides an interface for easy input of IPA symbols.
 */

class IPAInput {
  constructor() {
    this.symbols = {
      consonants: [
        'p', 'b', 't', 'd', 'ʈ', 'ɖ', 'c', 'ɟ', 'k', 'ɡ', 'q', 'ɢ', 'ʔ',
        'm', 'ɱ', 'n', 'ɳ', 'ɲ', 'ŋ', 'ɴ',
        'ʙ', 'r', 'ʀ',
        'ⱱ', 'ɾ', 'ɽ',
        'ɸ', 'β', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'ʂ', 'ʐ', 'ç', 'ʝ',
        'x', 'ɣ', 'χ', 'ʁ', 'ħ', 'ʕ', 'h', 'ɦ',
        'ɬ', 'ɮ',
        'ʋ', 'ɹ', 'ɻ', 'j', 'ɰ',
        'l', 'ɭ', 'ʎ', 'ʟ',
        'ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ',
        'ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ',
        'ʼ', 'ʍ', 'w', 'ɥ', 'ʜ', 'ʢ', 'ʡ',
        'ɕ', 'ʑ', 'ɺ', 'ɧ'
      ],
      vowels: [
        'i', 'y', 'ɨ', 'ʉ', 'ɯ', 'u',
        'ɪ', 'ʏ', 'ʊ',
        'e', 'ø', 'ɘ', 'ɵ', 'ɤ', 'o',
        'ə',
        'ɛ', 'œ', 'ɜ', 'ɞ', 'ʌ', 'ɔ',
        'æ', 'ɐ',
        'a', 'ɶ', 'ä', 'ɑ', 'ɒ'
      ],
      diacritics: [
        '̥', '̬', 'ʰ', '̹', '̜', '̟', '̠', '̈', '̽', '̩', '̯',
        '˞', '̤', '̰', '̼', 'ʷ', 'ʲ', 'ˠ', 'ˤ', '̴',
        '̝', '̞', '̘', '̙', '̪', '̺', '̻', '̃', 'ⁿ', 'ˡ',
        '̚', '̋', '́', '̄', '̀', '̏'
      ],
      suprasegmentals: [
        'ˈ', 'ˌ', 'ː', 'ˑ', '̆', '|', '‖', '.', '‿'
      ],
      tones: [
        '˥', '˦', '˧', '˨', '˩',
        '̋', '́', '̄', '̀', '̏',
        '̌', '̂', '᷄', '᷅', '᷈',
        '↗', '↘'
      ]
    };
    this.init();
  }

  init() {
    this.ipaText = document.getElementById('ipaText');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.populateSymbols();
    this.bindEvents();
  }

  populateSymbols() {
    for (const [category, symbols] of Object.entries(this.symbols)) {
      const container = document.getElementById(category);
      if (!container) continue;

      for (const symbol of symbols) {
        const btn = document.createElement('button');
        btn.className = 'ipa-btn';
        btn.textContent = symbol;
        btn.title = `U+${symbol.codePointAt(0).toString(16).toUpperCase()}`;
        btn.addEventListener('click', () => this.insertSymbol(symbol));
        container.appendChild(btn);
      }
    }
  }

  bindEvents() {
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  insertSymbol(symbol) {
    const start = this.ipaText.selectionStart;
    const end = this.ipaText.selectionEnd;
    const text = this.ipaText.value;

    this.ipaText.value = text.substring(0, start) + symbol + text.substring(end);
    this.ipaText.selectionStart = this.ipaText.selectionEnd = start + symbol.length;
    this.ipaText.focus();
  }

  clear() {
    this.ipaText.value = '';
    this.ipaText.focus();
  }

  async copy() {
    const text = this.ipaText.value;
    if (!text) {
      this.showStatus('error', '沒有內容可複製');
      return;
    }

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
  window.ipaInput = new IPAInput();
});

export default IPAInput;
