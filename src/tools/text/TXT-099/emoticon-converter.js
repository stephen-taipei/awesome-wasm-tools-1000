/**
 * TXT-099: Emoticon Converter
 *
 * Converts between text emoticons and emoji.
 */

class EmoticonConverter {
  constructor() {
    this.mappings = [
      // Smileys
      { text: ':)', emoji: '😊', alt: ['(:'] },
      { text: ':D', emoji: '😃', alt: [':-D'] },
      { text: ':P', emoji: '😛', alt: [':-P', ':p', ':-p'] },
      { text: ';)', emoji: '😉', alt: [';-)'] },
      { text: ':(', emoji: '😢', alt: ['):'] },
      { text: ":'(", emoji: '😭', alt: [":'-("] },
      { text: ':O', emoji: '😮', alt: [':-O', ':o', ':-o'] },
      { text: 'XD', emoji: '😆', alt: ['xD'] },
      { text: '<3', emoji: '❤️', alt: [] },
      { text: '</3', emoji: '💔', alt: [] },
      { text: ':*', emoji: '😘', alt: [':-*'] },
      { text: ':-)', emoji: '🙂', alt: [] },
      { text: ':-(', emoji: '🙁', alt: [] },
      { text: ':-|', emoji: '😐', alt: [':|'] },
      { text: ':-/', emoji: '😕', alt: [':/'] },
      { text: '>:(', emoji: '😠', alt: ['>:-('] },
      { text: '>:)', emoji: '😈', alt: ['>:-)'] },
      { text: 'O:)', emoji: '😇', alt: ['O:-)', '0:)', '0:-)'] },
      { text: 'B)', emoji: '😎', alt: ['B-)', '8)', '8-)'] },
      { text: ':3', emoji: '😺', alt: [] },
      { text: '^_^', emoji: '😄', alt: ['^-^'] },
      { text: '-_-', emoji: '😑', alt: ['-.-'] },
      { text: 'T_T', emoji: '😭', alt: ['T.T', 'TT'] },
      { text: 'o_o', emoji: '😳', alt: ['O_O', 'o.o', 'O.O'] },
      { text: '>_<', emoji: '😣', alt: ['>.<'] },
      { text: '\\o/', emoji: '🙌', alt: [] },
      { text: '(Y)', emoji: '👍', alt: ['(y)'] },
      { text: '(N)', emoji: '👎', alt: ['(n)'] },
      { text: ':+1:', emoji: '👍', alt: ['+1'] },
      { text: ':-1:', emoji: '👎', alt: ['-1'] },
      { text: '<(^.^)>', emoji: '🐱', alt: [] },
      { text: '(*.*)', emoji: '⭐', alt: [] },
      { text: '(~.~)', emoji: '😴', alt: [] },
      { text: '(?)', emoji: '❓', alt: [] },
      { text: '(!)', emoji: '❗', alt: [] },
      { text: '(c)', emoji: '©️', alt: [] },
      { text: '(r)', emoji: '®️', alt: [] },
      { text: '(tm)', emoji: '™️', alt: [] }
    ];

    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.convertDirection = document.getElementById('convertDirection');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.referenceTable = document.getElementById('referenceTable');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
    this.displayReferenceTable();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  displayReferenceTable() {
    this.referenceTable.innerHTML = '';
    this.mappings.forEach(mapping => {
      const item = document.createElement('div');
      item.className = 'reference-item';
      item.innerHTML = `
        <span class="reference-text">${this.escapeHtml(mapping.text)}</span>
        <span class="reference-emoji">${mapping.emoji}</span>
      `;
      this.referenceTable.appendChild(item);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  convert() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const direction = this.convertDirection.value;
    let result;

    if (direction === 'textToEmoji') {
      result = this.textToEmoji(text);
    } else {
      result = this.emojiToText(text);
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  textToEmoji(text) {
    let result = text;

    // Sort by length (longer patterns first) to avoid partial replacements
    const sortedMappings = [...this.mappings].sort((a, b) => {
      const maxLenA = Math.max(a.text.length, ...a.alt.map(s => s.length));
      const maxLenB = Math.max(b.text.length, ...b.alt.map(s => s.length));
      return maxLenB - maxLenA;
    });

    sortedMappings.forEach(mapping => {
      // Replace main text pattern
      result = this.replaceAll(result, mapping.text, mapping.emoji);

      // Replace alternative patterns
      mapping.alt.forEach(alt => {
        result = this.replaceAll(result, alt, mapping.emoji);
      });
    });

    return result;
  }

  emojiToText(text) {
    let result = text;

    this.mappings.forEach(mapping => {
      result = this.replaceAll(result, mapping.emoji, mapping.text);
    });

    return result;
  }

  replaceAll(str, find, replace) {
    // Escape special regex characters
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return str.replace(new RegExp(escaped, 'g'), replace);
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
  window.emoticonConverter = new EmoticonConverter();
});

export default EmoticonConverter;
