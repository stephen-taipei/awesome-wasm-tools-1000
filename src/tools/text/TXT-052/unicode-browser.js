/**
 * TXT-052: Unicode Block Browser
 *
 * Browse characters in different Unicode blocks.
 */

class UnicodeBrowser {
  constructor() {
    this.blocks = [
      { name: 'Basic Latin', start: 0x0020, end: 0x007F },
      { name: 'Latin-1 Supplement', start: 0x00A0, end: 0x00FF },
      { name: 'Latin Extended-A', start: 0x0100, end: 0x017F },
      { name: 'Latin Extended-B', start: 0x0180, end: 0x024F },
      { name: 'Greek and Coptic', start: 0x0370, end: 0x03FF },
      { name: 'Cyrillic', start: 0x0400, end: 0x04FF },
      { name: 'Armenian', start: 0x0530, end: 0x058F },
      { name: 'Hebrew', start: 0x0590, end: 0x05FF },
      { name: 'Arabic', start: 0x0600, end: 0x06FF },
      { name: 'Thai', start: 0x0E00, end: 0x0E7F },
      { name: 'Georgian', start: 0x10A0, end: 0x10FF },
      { name: 'Hangul Jamo', start: 0x1100, end: 0x11FF },
      { name: 'General Punctuation', start: 0x2000, end: 0x206F },
      { name: 'Currency Symbols', start: 0x20A0, end: 0x20CF },
      { name: 'Letterlike Symbols', start: 0x2100, end: 0x214F },
      { name: 'Number Forms', start: 0x2150, end: 0x218F },
      { name: 'Arrows', start: 0x2190, end: 0x21FF },
      { name: 'Mathematical Operators', start: 0x2200, end: 0x22FF },
      { name: 'Box Drawing', start: 0x2500, end: 0x257F },
      { name: 'Block Elements', start: 0x2580, end: 0x259F },
      { name: 'Geometric Shapes', start: 0x25A0, end: 0x25FF },
      { name: 'Miscellaneous Symbols', start: 0x2600, end: 0x26FF },
      { name: 'Dingbats', start: 0x2700, end: 0x27BF },
      { name: 'CJK Symbols and Punctuation', start: 0x3000, end: 0x303F },
      { name: 'Hiragana', start: 0x3040, end: 0x309F },
      { name: 'Katakana', start: 0x30A0, end: 0x30FF },
      { name: 'Bopomofo', start: 0x3100, end: 0x312F },
      { name: 'Enclosed CJK Letters', start: 0x3200, end: 0x32FF },
      { name: 'CJK Compatibility', start: 0x3300, end: 0x33FF },
      { name: 'CJK Unified Ideographs (Sample)', start: 0x4E00, end: 0x4EFF },
      { name: 'Hangul Syllables (Sample)', start: 0xAC00, end: 0xACFF },
      { name: 'Private Use Area (Sample)', start: 0xE000, end: 0xE0FF },
      { name: 'Alphabetic Presentation Forms', start: 0xFB00, end: 0xFB4F },
      { name: 'Halfwidth and Fullwidth Forms', start: 0xFF00, end: 0xFFEF },
      { name: 'Emoticons', start: 0x1F600, end: 0x1F64F },
      { name: 'Transport and Map Symbols', start: 0x1F680, end: 0x1F6FF },
    ];
    this.init();
  }

  init() {
    this.blockSelect = document.getElementById('blockSelect');
    this.resultArea = document.getElementById('resultArea');
    this.blockName = document.getElementById('blockName');
    this.blockRange = document.getElementById('blockRange');
    this.charGrid = document.getElementById('charGrid');
    this.charDetail = document.getElementById('charDetail');
    this.selectedChar = document.getElementById('selectedChar');
    this.detailCodepoint = document.getElementById('detailCodepoint');
    this.detailDecimal = document.getElementById('detailDecimal');
    this.copyCharBtn = document.getElementById('copyCharBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.populateBlocks();
    this.bindEvents();
  }

  populateBlocks() {
    this.blocks.forEach((block, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${block.name} (U+${block.start.toString(16).toUpperCase()}-U+${block.end.toString(16).toUpperCase()})`;
      this.blockSelect.appendChild(option);
    });
  }

  bindEvents() {
    this.blockSelect.addEventListener('change', () => this.loadBlock());
    this.copyCharBtn.addEventListener('click', () => this.copyChar());
  }

  loadBlock() {
    const index = this.blockSelect.value;
    if (index === '') {
      this.resultArea.style.display = 'none';
      return;
    }

    const block = this.blocks[index];
    this.blockName.textContent = block.name;
    this.blockRange.textContent = `U+${block.start.toString(16).toUpperCase()} - U+${block.end.toString(16).toUpperCase()}`;

    this.charGrid.innerHTML = '';
    for (let i = block.start; i <= block.end; i++) {
      try {
        const char = String.fromCodePoint(i);
        const charBox = document.createElement('div');
        charBox.className = 'char-box';
        charBox.textContent = char;
        charBox.title = `U+${i.toString(16).toUpperCase()}`;
        charBox.addEventListener('click', () => this.selectChar(char, i));
        this.charGrid.appendChild(charBox);
      } catch (e) {
        // Skip invalid code points
      }
    }

    this.resultArea.style.display = 'block';
    this.charDetail.style.display = 'none';
  }

  selectChar(char, codePoint) {
    this.selectedChar.textContent = char;
    this.detailCodepoint.textContent = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
    this.detailDecimal.textContent = codePoint;
    this.charDetail.style.display = 'block';
    this.currentChar = char;
  }

  async copyChar() {
    if (!this.currentChar) return;
    try {
      await navigator.clipboard.writeText(this.currentChar);
      this.showStatus('success', '字元已複製到剪貼簿');
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
  window.unicodeBrowser = new UnicodeBrowser();
});

export default UnicodeBrowser;
