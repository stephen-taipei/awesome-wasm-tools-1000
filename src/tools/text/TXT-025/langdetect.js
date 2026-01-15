/**
 * TXT-025: Language Detection Tool
 *
 * Detects the language of input text.
 */

class LanguageDetector {
  constructor() {
    this.languages = {
      chinese: { name: '中文', flag: '🇨🇳', regex: /[\u4e00-\u9fa5]/ },
      english: { name: '英文', flag: '🇬🇧', regex: /[a-zA-Z]/ },
      japanese: { name: '日文', flag: '🇯🇵', regex: /[\u3040-\u309f\u30a0-\u30ff]/ },
      korean: { name: '韓文', flag: '🇰🇷', regex: /[\uac00-\ud7af\u1100-\u11ff]/ },
      arabic: { name: '阿拉伯文', flag: '🇸🇦', regex: /[\u0600-\u06ff]/ },
      russian: { name: '俄文', flag: '🇷🇺', regex: /[\u0400-\u04ff]/ },
      thai: { name: '泰文', flag: '🇹🇭', regex: /[\u0e00-\u0e7f]/ },
      vietnamese: { name: '越南文', flag: '🇻🇳', regex: /[\u1e00-\u1eff]/ },
      greek: { name: '希臘文', flag: '🇬🇷', regex: /[\u0370-\u03ff]/ },
      hebrew: { name: '希伯來文', flag: '🇮🇱', regex: /[\u0590-\u05ff]/ }
    };

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.detectBtn = document.getElementById('detectBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.langFlag = document.getElementById('langFlag');
    this.langName = document.getElementById('langName');
    this.langConfidence = document.getElementById('langConfidence');
    this.languageBreakdown = document.getElementById('languageBreakdown');
    this.chineseCount = document.getElementById('chineseCount');
    this.englishCount = document.getElementById('englishCount');
    this.japaneseCount = document.getElementById('japaneseCount');
    this.koreanCount = document.getElementById('koreanCount');
    this.numberCount = document.getElementById('numberCount');
    this.symbolCount = document.getElementById('symbolCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.detectBtn.addEventListener('click', () => this.detect());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  countCharacterTypes(text) {
    const counts = {
      chinese: 0,
      english: 0,
      japanese: 0,
      korean: 0,
      arabic: 0,
      russian: 0,
      thai: 0,
      greek: 0,
      hebrew: 0,
      number: 0,
      symbol: 0,
      space: 0
    };

    for (const char of text) {
      if (/\s/.test(char)) {
        counts.space++;
      } else if (/\d/.test(char)) {
        counts.number++;
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        counts.chinese++;
      } else if (/[a-zA-Z]/.test(char)) {
        counts.english++;
      } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(char)) {
        counts.japanese++;
      } else if (/[\uac00-\ud7af]/.test(char)) {
        counts.korean++;
      } else if (/[\u0600-\u06ff]/.test(char)) {
        counts.arabic++;
      } else if (/[\u0400-\u04ff]/.test(char)) {
        counts.russian++;
      } else if (/[\u0e00-\u0e7f]/.test(char)) {
        counts.thai++;
      } else if (/[\u0370-\u03ff]/.test(char)) {
        counts.greek++;
      } else if (/[\u0590-\u05ff]/.test(char)) {
        counts.hebrew++;
      } else {
        counts.symbol++;
      }
    }

    return counts;
  }

  detect() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const counts = this.countCharacterTypes(text);
    const totalChars = text.length - counts.space;

    // Determine primary language
    const langCounts = {
      chinese: counts.chinese,
      english: counts.english,
      japanese: counts.japanese,
      korean: counts.korean,
      arabic: counts.arabic,
      russian: counts.russian,
      thai: counts.thai,
      greek: counts.greek,
      hebrew: counts.hebrew
    };

    const sorted = Object.entries(langCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    // Update main result
    if (sorted.length > 0) {
      const [topLang, topCount] = sorted[0];
      const langInfo = this.languages[topLang];
      const confidence = Math.round((topCount / totalChars) * 100);

      this.langFlag.textContent = langInfo.flag;
      this.langName.textContent = langInfo.name;
      this.langConfidence.textContent = `${confidence}% 信心度`;
    } else {
      this.langFlag.textContent = '🌐';
      this.langName.textContent = '未知';
      this.langConfidence.textContent = '0%';
    }

    // Language breakdown
    this.languageBreakdown.innerHTML = sorted.map(([lang, count]) => {
      const info = this.languages[lang];
      const percent = Math.round((count / totalChars) * 100);
      return `
        <div class="lang-bar">
          <div class="lang-bar-label">
            <span>${info.flag} ${info.name}</span>
            <span>${percent}% (${count}字)</span>
          </div>
          <div class="lang-bar-track">
            <div class="lang-bar-fill" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    }).join('') || '<em>未檢測到語言字元</em>';

    // Update stats
    this.chineseCount.textContent = counts.chinese;
    this.englishCount.textContent = counts.english;
    this.japaneseCount.textContent = counts.japanese;
    this.koreanCount.textContent = counts.korean;
    this.numberCount.textContent = counts.number;
    this.symbolCount.textContent = counts.symbol;

    this.resultArea.style.display = 'block';
  }

  clear() {
    this.inputText.value = '';
    this.resultArea.style.display = 'none';
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
  window.languageDetector = new LanguageDetector();
});

export default LanguageDetector;
