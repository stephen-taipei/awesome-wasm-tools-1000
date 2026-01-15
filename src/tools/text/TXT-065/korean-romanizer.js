/**
 * TXT-065: Korean Romanizer
 *
 * Converts Korean Hangul to Romanized text.
 */

class KoreanRomanizer {
  constructor() {
    this.cho = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
    this.jung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
    this.jong = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 's', 's', 'ng', 't', 't', 't', 't', 'p', 't', 't', 't'];

    this.choMR = ['k', 'kk', 'n', 't', 'tt', 'r', 'm', 'p', 'pp', 's', 'ss', '', 'ch', 'tch', "ch'", "k'", "t'", "p'", 'h'];
    this.jungMR = ['a', 'ae', 'ya', 'yae', 'ŏ', 'e', 'yŏ', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wŏ', 'we', 'wi', 'yu', 'ŭ', 'ŭi', 'i'];
    this.jongMR = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'ch', 't', 'p', 't', 'k', 't'];

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
      this.showStatus('error', '請輸入韓文');
      return;
    }

    const system = document.querySelector('input[name="system"]:checked').value;
    const result = this.romanize(text, system);

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  romanize(text, system) {
    let result = '';

    for (const char of text) {
      const code = char.charCodeAt(0);

      if (code >= 0xAC00 && code <= 0xD7A3) {
        const syllable = code - 0xAC00;
        const choIdx = Math.floor(syllable / 588);
        const jungIdx = Math.floor((syllable % 588) / 28);
        const jongIdx = syllable % 28;

        if (system === 'revised') {
          result += this.cho[choIdx] + this.jung[jungIdx] + this.jong[jongIdx];
        } else {
          result += this.choMR[choIdx] + this.jungMR[jungIdx] + this.jongMR[jongIdx];
        }
      } else if (code >= 0x3131 && code <= 0x3163) {
        const jamoIdx = code - 0x3131;
        result += this.getJamoRoman(jamoIdx, system);
      } else {
        result += char;
      }
    }

    return result;
  }

  getJamoRoman(idx, system) {
    const jamoMap = {
      revised: ['g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'tt', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'pp', 'bs', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
                'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'],
      mccune: ['k', 'kk', 'ks', 'n', 'nch', 'nh', 't', 'tt', 'l', 'lk', 'lm', 'lp', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'pp', 'ps', 's', 'ss', '', 'ch', 'tch', "ch'", "k'", "t'", "p'", 'h',
               'a', 'ae', 'ya', 'yae', 'ŏ', 'e', 'yŏ', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wŏ', 'we', 'wi', 'yu', 'ŭ', 'ŭi', 'i']
    };

    const map = jamoMap[system];
    return idx < map.length ? map[idx] : '';
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
  window.koreanRomanizer = new KoreanRomanizer();
});

export default KoreanRomanizer;
