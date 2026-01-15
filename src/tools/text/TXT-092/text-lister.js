/**
 * TXT-092: Text Lister
 *
 * Converts text to various list formats.
 */

class TextLister {
  constructor() {
    this.romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
      'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.listStyle = document.getElementById('listStyle');
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
      this.showStatus('error', '請輸入項目');
      return;
    }

    const items = text.split('\n').filter(line => line.trim());
    const style = this.listStyle.value;

    const listItems = items.map((item, index) => {
      const prefix = this.getPrefix(style, index);
      return prefix + item.trim();
    });

    this.outputText.value = listItems.join('\n');
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  getPrefix(style, index) {
    switch (style) {
      case 'bullet':
        return '• ';
      case 'dash':
        return '- ';
      case 'number':
        return `${index + 1}. `;
      case 'letter':
        return `${String.fromCharCode(97 + (index % 26))}. `;
      case 'roman':
        return `${this.romanNumerals[index % 20]}. `;
      case 'checkbox':
        return '[ ] ';
      case 'arrow':
        return '→ ';
      case 'star':
        return '* ';
      default:
        return '• ';
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
  window.textLister = new TextLister();
});

export default TextLister;
