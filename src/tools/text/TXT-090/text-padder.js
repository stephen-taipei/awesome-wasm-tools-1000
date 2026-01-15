/**
 * TXT-090: Text Padder
 *
 * Pads text with characters to specified length.
 */

class TextPadder {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.targetLength = document.getElementById('targetLength');
    this.padChar = document.getElementById('padChar');
    this.padPosition = document.getElementById('padPosition');
    this.padBtn = document.getElementById('padBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.padBtn.addEventListener('click', () => this.pad());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  pad() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const length = parseInt(this.targetLength.value) || 20;
    const char = this.padChar.value || ' ';
    const position = this.padPosition.value;

    const lines = text.split('\n');
    const paddedLines = lines.map(line => this.padLine(line, length, char, position));

    this.outputText.value = paddedLines.join('\n');
    this.resultArea.style.display = 'block';
    this.showStatus('success', '填充完成');
  }

  padLine(line, length, char, position) {
    if (line.length >= length) return line;

    const padLength = length - line.length;

    switch (position) {
      case 'start':
        return char.repeat(Math.ceil(padLength / char.length)).substring(0, padLength) + line;
      case 'end':
        return line + char.repeat(Math.ceil(padLength / char.length)).substring(0, padLength);
      case 'both':
        const leftPad = Math.floor(padLength / 2);
        const rightPad = padLength - leftPad;
        const leftChars = char.repeat(Math.ceil(leftPad / char.length)).substring(0, leftPad);
        const rightChars = char.repeat(Math.ceil(rightPad / char.length)).substring(0, rightPad);
        return leftChars + line + rightChars;
      default:
        return line;
    }
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
  window.textPadder = new TextPadder();
});

export default TextPadder;
