/**
 * TXT-064: Japanese Kana Converter
 *
 * Converts between Hiragana, Katakana, and Romaji.
 */

class KanaConverter {
  constructor() {
    this.hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっ';
    this.katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポァィゥェォャュョッ';

    this.romajiMap = {
      'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
      'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
      'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
      'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
      'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
      'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
      'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
      'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
      'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
      'わ': 'wa', 'を': 'wo', 'ん': 'n',
      'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
      'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
      'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
      'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
      'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
      'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
      'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 'っ': ''
    };

    this.romajiToHiragana = {};
    for (const [k, v] of Object.entries(this.romajiMap)) {
      if (v) this.romajiToHiragana[v] = k;
    }

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
  }

  convert() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const convType = document.querySelector('input[name="convType"]:checked').value;
    let result;

    switch (convType) {
      case 'hiragana':
        result = this.toHiragana(text);
        break;
      case 'katakana':
        result = this.toKatakana(text);
        break;
      case 'romaji':
        result = this.toRomaji(text);
        break;
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  toHiragana(text) {
    let result = '';
    for (const char of text) {
      const idx = this.katakana.indexOf(char);
      if (idx !== -1) {
        result += this.hiragana[idx];
      } else {
        result += char;
      }
    }

    result = this.romajiToKana(result, 'hiragana');
    return result;
  }

  toKatakana(text) {
    let result = '';
    for (const char of text) {
      const idx = this.hiragana.indexOf(char);
      if (idx !== -1) {
        result += this.katakana[idx];
      } else {
        result += char;
      }
    }

    result = this.romajiToKana(result, 'katakana');
    return result;
  }

  toRomaji(text) {
    let result = '';
    let hiraganaText = this.toHiragana(text);

    for (let i = 0; i < hiraganaText.length; i++) {
      const char = hiraganaText[i];

      if (char === 'っ' && i < hiraganaText.length - 1) {
        const next = this.romajiMap[hiraganaText[i + 1]];
        if (next) {
          result += next[0];
        }
      } else if (this.romajiMap[char] !== undefined) {
        result += this.romajiMap[char];
      } else {
        result += char;
      }
    }

    return result;
  }

  romajiToKana(text, type) {
    const targetMap = type === 'hiragana' ? this.romajiToHiragana : this.romajiToHiragana;
    let result = text;

    const sortedRomaji = Object.keys(targetMap).sort((a, b) => b.length - a.length);

    for (const romaji of sortedRomaji) {
      let kana = targetMap[romaji];
      if (type === 'katakana') {
        const idx = this.hiragana.indexOf(kana);
        if (idx !== -1) kana = this.katakana[idx];
      }
      result = result.replace(new RegExp(romaji, 'gi'), kana);
    }

    return result;
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
  window.kanaConverter = new KanaConverter();
});

export default KanaConverter;
