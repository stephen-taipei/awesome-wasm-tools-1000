/**
 * TXT-091: Text Aligner
 *
 * Aligns text to left, right, center, or justify.
 */

class TextAligner {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.lineWidth = document.getElementById('lineWidth');
    this.alignType = document.getElementById('alignType');
    this.alignBtn = document.getElementById('alignBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.alignBtn.addEventListener('click', () => this.align());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  align() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const width = parseInt(this.lineWidth.value) || 60;
    const type = this.alignType.value;

    const words = text.split(/\s+/).filter(w => w);
    const lines = this.wrapText(words, width);
    const aligned = lines.map((line, index) => {
      const isLast = index === lines.length - 1;
      return this.alignLine(line, width, type, isLast);
    });

    this.outputText.textContent = aligned.join('\n');
    this.resultArea.style.display = 'block';
    this.showStatus('success', '對齊完成');
  }

  wrapText(words, width) {
    const lines = [];
    let currentLine = [];
    let currentLength = 0;

    for (const word of words) {
      const wordLength = word.length;
      const spaceNeeded = currentLine.length > 0 ? 1 : 0;

      if (currentLength + spaceNeeded + wordLength <= width) {
        currentLine.push(word);
        currentLength += spaceNeeded + wordLength;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [word];
        currentLength = wordLength;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  alignLine(words, width, type, isLast) {
    const text = words.join(' ');

    switch (type) {
      case 'left':
        return text;

      case 'right':
        return text.padStart(width);

      case 'center':
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(padding) + text;

      case 'justify':
        if (isLast || words.length === 1) {
          return text;
        }
        const totalSpaces = width - words.reduce((sum, w) => sum + w.length, 0);
        const gaps = words.length - 1;
        const spacePerGap = Math.floor(totalSpaces / gaps);
        const extraSpaces = totalSpaces % gaps;

        let result = words[0];
        for (let i = 1; i < words.length; i++) {
          const spaces = spacePerGap + (i <= extraSpaces ? 1 : 0);
          result += ' '.repeat(spaces) + words[i];
        }
        return result;

      default:
        return text;
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.textContent;
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
  window.textAligner = new TextAligner();
});

export default TextAligner;
