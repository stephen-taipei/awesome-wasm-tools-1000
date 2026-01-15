/**
 * TXT-061: Text to SSML Converter
 *
 * Converts plain text to SSML (Speech Synthesis Markup Language).
 */

class TextToSSML {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.langSelect = document.getElementById('langSelect');
    this.rateSelect = document.getElementById('rateSelect');
    this.pitchSelect = document.getElementById('pitchSelect');
    this.addBreaks = document.getElementById('addBreaks');
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
    const text = this.inputText.value.trim();
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const lang = this.langSelect.value;
    const rate = this.rateSelect.value;
    const pitch = this.pitchSelect.value;
    const breaks = this.addBreaks.checked;

    let processedText = this.escapeXml(text);

    if (breaks) {
      processedText = processedText
        .replace(/。/g, '。<break time="500ms"/>')
        .replace(/\./g, '.<break time="500ms"/>')
        .replace(/！/g, '！<break time="300ms"/>')
        .replace(/！/g, '!<break time="300ms"/>')
        .replace(/？/g, '？<break time="300ms"/>')
        .replace(/\?/g, '?<break time="300ms"/>')
        .replace(/，/g, '，<break time="200ms"/>')
        .replace(/,/g, ',<break time="200ms"/>');
    }

    const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
  <prosody rate="${rate}" pitch="${pitch}">
    ${processedText}
  </prosody>
</speak>`;

    this.outputText.value = ssml;
    this.resultArea.style.display = 'block';
    this.showStatus('success', 'SSML 轉換完成');
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
  window.textToSSML = new TextToSSML();
});

export default TextToSSML;
