/**
 * TXT-072: Zero-Width Character Remover
 *
 * Removes zero-width characters and decodes hidden messages.
 */

class ZWCRemover {
  constructor() {
    this.ZWC = {
      ZWSP: '\u200B',
      ZWNJ: '\u200C',
      ZWJ: '\u200D',
      ZWSP2: '\uFEFF'
    };
    this.zwcRegex = /[\u200B\u200C\u200D\uFEFF]/g;
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.cleanText = document.getElementById('cleanText');
    this.hiddenText = document.getElementById('hiddenText');
    this.hiddenSection = document.getElementById('hiddenSection');
    this.zwcCount = document.getElementById('zwcCount');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.removeBtn = document.getElementById('removeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.removeBtn.addEventListener('click', () => this.remove());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  decode() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const zwcMatches = text.match(this.zwcRegex) || [];
    this.zwcCount.textContent = zwcMatches.length;

    const clean = text.replace(this.zwcRegex, '');
    this.cleanText.value = clean;

    const hidden = this.extractHidden(text);
    if (hidden) {
      this.hiddenText.value = hidden;
      this.hiddenSection.style.display = 'block';
      this.showStatus('success', '發現並解碼隱藏訊息');
    } else {
      this.hiddenSection.style.display = 'none';
      this.showStatus('success', `移除了 ${zwcMatches.length} 個零寬字元`);
    }

    this.resultArea.style.display = 'block';
  }

  remove() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const zwcMatches = text.match(this.zwcRegex) || [];
    this.zwcCount.textContent = zwcMatches.length;

    const clean = text.replace(this.zwcRegex, '');
    this.cleanText.value = clean;
    this.hiddenSection.style.display = 'none';
    this.resultArea.style.display = 'block';

    this.showStatus('success', `移除了 ${zwcMatches.length} 個零寬字元`);
  }

  extractHidden(text) {
    const startIdx = text.indexOf(this.ZWC.ZWSP2);
    const endIdx = text.indexOf(this.ZWC.ZWJ);

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      return null;
    }

    const zwcPart = text.substring(startIdx + 1, endIdx);
    let binary = '';

    for (const char of zwcPart) {
      if (char === this.ZWC.ZWSP) {
        binary += '0';
      } else if (char === this.ZWC.ZWNJ) {
        binary += '1';
      }
    }

    if (binary.length === 0 || binary.length % 8 !== 0) {
      return null;
    }

    return this.binaryToText(binary);
  }

  binaryToText(binary) {
    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
      bytes.push(parseInt(binary.substring(i, i + 8), 2));
    }

    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  }

  clear() {
    this.inputText.value = '';
    this.cleanText.value = '';
    this.hiddenText.value = '';
    this.zwcCount.textContent = '0';
    this.resultArea.style.display = 'none';
    this.hiddenSection.style.display = 'none';
  }

  async copy() {
    const text = this.cleanText.value;
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
  window.zwcRemover = new ZWCRemover();
});

export default ZWCRemover;
