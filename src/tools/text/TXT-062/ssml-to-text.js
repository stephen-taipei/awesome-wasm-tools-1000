/**
 * TXT-062: SSML to Text Converter
 *
 * Extracts plain text from SSML (Speech Synthesis Markup Language).
 */

class SSMLToText {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.infoLang = document.getElementById('infoLang');
    this.infoRate = document.getElementById('infoRate');
    this.infoPitch = document.getElementById('infoPitch');
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
    const ssml = this.inputText.value.trim();
    if (!ssml) {
      this.showStatus('error', '請輸入 SSML');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ssml, 'text/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('無效的 XML 格式');
      }

      const speak = doc.querySelector('speak');
      const lang = speak ? speak.getAttribute('xml:lang') || speak.getAttribute('lang') : '-';

      const prosody = doc.querySelector('prosody');
      const rate = prosody ? prosody.getAttribute('rate') : '-';
      const pitch = prosody ? prosody.getAttribute('pitch') : '-';

      let text = this.extractText(doc.documentElement);
      text = text.replace(/\s+/g, ' ').trim();

      this.outputText.value = text;
      this.infoLang.textContent = lang || '-';
      this.infoRate.textContent = rate || '-';
      this.infoPitch.textContent = pitch || '-';

      this.resultArea.style.display = 'block';
      this.showStatus('success', '文字提取完成');
    } catch (err) {
      this.showStatus('error', `解析失敗: ${err.message}`);
    }
  }

  extractText(node) {
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName.toLowerCase() === 'break') {
          text += ' ';
        } else {
          text += this.extractText(child);
        }
      }
    }
    return text;
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.infoLang.textContent = '-';
    this.infoRate.textContent = '-';
    this.infoPitch.textContent = '-';
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
  window.ssmlToText = new SSMLToText();
});

export default SSMLToText;
