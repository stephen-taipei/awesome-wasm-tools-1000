/**
 * TXT-051: Unicode Character Lookup
 *
 * Looks up detailed information about Unicode characters including codepoint, name, block, etc.
 */

class UnicodeLookup {
  constructor() {
    this.unicodeBlocks = [
      { start: 0x0000, end: 0x007F, name: 'Basic Latin' },
      { start: 0x0080, end: 0x00FF, name: 'Latin-1 Supplement' },
      { start: 0x0100, end: 0x017F, name: 'Latin Extended-A' },
      { start: 0x0180, end: 0x024F, name: 'Latin Extended-B' },
      { start: 0x0370, end: 0x03FF, name: 'Greek and Coptic' },
      { start: 0x0400, end: 0x04FF, name: 'Cyrillic' },
      { start: 0x0530, end: 0x058F, name: 'Armenian' },
      { start: 0x0590, end: 0x05FF, name: 'Hebrew' },
      { start: 0x0600, end: 0x06FF, name: 'Arabic' },
      { start: 0x3000, end: 0x303F, name: 'CJK Symbols and Punctuation' },
      { start: 0x3040, end: 0x309F, name: 'Hiragana' },
      { start: 0x30A0, end: 0x30FF, name: 'Katakana' },
      { start: 0x4E00, end: 0x9FFF, name: 'CJK Unified Ideographs' },
      { start: 0xAC00, end: 0xD7AF, name: 'Hangul Syllables' },
      { start: 0x1F600, end: 0x1F64F, name: 'Emoticons' },
      { start: 0x1F300, end: 0x1F5FF, name: 'Miscellaneous Symbols and Pictographs' },
    ];
    this.init();
  }

  init() {
    this.inputChar = document.getElementById('inputChar');
    this.searchBtn = document.getElementById('searchBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.charDisplay = document.getElementById('charDisplay');
    this.codepoint = document.getElementById('codepoint');
    this.decimal = document.getElementById('decimal');
    this.utf8 = document.getElementById('utf8');
    this.utf16 = document.getElementById('utf16');
    this.htmlEntity = document.getElementById('htmlEntity');
    this.cssEscape = document.getElementById('cssEscape');
    this.block = document.getElementById('block');
    this.category = document.getElementById('category');

    this.bindEvents();
  }

  bindEvents() {
    this.searchBtn.addEventListener('click', () => this.search());
    this.inputChar.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
  }

  search() {
    const input = this.inputChar.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入字元或碼點');
      return;
    }

    let char;
    if (input.match(/^U\+[0-9A-Fa-f]+$/i)) {
      const codePoint = parseInt(input.slice(2), 16);
      char = String.fromCodePoint(codePoint);
    } else if (input.match(/^0x[0-9A-Fa-f]+$/i)) {
      const codePoint = parseInt(input, 16);
      char = String.fromCodePoint(codePoint);
    } else {
      char = [...input][0];
    }

    if (!char) {
      this.showStatus('error', '無效的輸入');
      return;
    }

    this.displayCharInfo(char);
  }

  displayCharInfo(char) {
    const codePoint = char.codePointAt(0);

    this.charDisplay.textContent = char;
    this.codepoint.textContent = 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
    this.decimal.textContent = codePoint;
    this.utf8.textContent = this.getUtf8Bytes(char);
    this.utf16.textContent = this.getUtf16Bytes(char);
    this.htmlEntity.textContent = `&#${codePoint}; / &#x${codePoint.toString(16)};`;
    this.cssEscape.textContent = `\\${codePoint.toString(16)}`;
    this.block.textContent = this.getUnicodeBlock(codePoint);
    this.category.textContent = this.getCategory(char);

    this.resultArea.style.display = 'block';
  }

  getUtf8Bytes(char) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(char);
    return Array.from(bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  }

  getUtf16Bytes(char) {
    const bytes = [];
    for (let i = 0; i < char.length; i++) {
      bytes.push(char.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'));
    }
    return bytes.join(' ');
  }

  getUnicodeBlock(codePoint) {
    for (const block of this.unicodeBlocks) {
      if (codePoint >= block.start && codePoint <= block.end) {
        return block.name;
      }
    }
    return 'Unknown Block';
  }

  getCategory(char) {
    if (/\p{L}/u.test(char)) return 'Letter';
    if (/\p{N}/u.test(char)) return 'Number';
    if (/\p{P}/u.test(char)) return 'Punctuation';
    if (/\p{S}/u.test(char)) return 'Symbol';
    if (/\p{Z}/u.test(char)) return 'Separator';
    if (/\p{C}/u.test(char)) return 'Other';
    return 'Unknown';
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
  window.unicodeLookup = new UnicodeLookup();
});

export default UnicodeLookup;
