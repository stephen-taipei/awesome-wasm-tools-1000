/**
 * TXT-005: Text Sorter Tool
 *
 * Sorts text lines with various sorting methods.
 */

class TextSorter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.sortType = document.getElementById('sortType');
    this.ignoreCase = document.getElementById('ignoreCase');
    this.removeEmpty = document.getElementById('removeEmpty');
    this.naturalSort = document.getElementById('naturalSort');
    this.sortBtn = document.getElementById('sortBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.lineCount = document.getElementById('lineCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.sortBtn.addEventListener('click', () => this.sort());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  naturalCompare(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  sort() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    let lines = text.split('\n');

    if (this.removeEmpty.checked) {
      lines = lines.filter(line => line.trim());
    }

    const type = this.sortType.value;
    const caseInsensitive = this.ignoreCase.checked;
    const useNaturalSort = this.naturalSort.checked;

    switch (type) {
      case 'alpha':
        if (useNaturalSort) {
          lines.sort((a, b) => {
            const aa = caseInsensitive ? a.toLowerCase() : a;
            const bb = caseInsensitive ? b.toLowerCase() : b;
            return this.naturalCompare(aa, bb);
          });
        } else {
          lines.sort((a, b) => {
            const aa = caseInsensitive ? a.toLowerCase() : a;
            const bb = caseInsensitive ? b.toLowerCase() : b;
            return aa.localeCompare(bb);
          });
        }
        break;
      case 'alphaDesc':
        if (useNaturalSort) {
          lines.sort((a, b) => {
            const aa = caseInsensitive ? a.toLowerCase() : a;
            const bb = caseInsensitive ? b.toLowerCase() : b;
            return this.naturalCompare(bb, aa);
          });
        } else {
          lines.sort((a, b) => {
            const aa = caseInsensitive ? a.toLowerCase() : a;
            const bb = caseInsensitive ? b.toLowerCase() : b;
            return bb.localeCompare(aa);
          });
        }
        break;
      case 'numeric':
        lines.sort((a, b) => {
          const numA = parseFloat(a) || 0;
          const numB = parseFloat(b) || 0;
          return numA - numB;
        });
        break;
      case 'numericDesc':
        lines.sort((a, b) => {
          const numA = parseFloat(a) || 0;
          const numB = parseFloat(b) || 0;
          return numB - numA;
        });
        break;
      case 'length':
        lines.sort((a, b) => a.length - b.length);
        break;
      case 'lengthDesc':
        lines.sort((a, b) => b.length - a.length);
        break;
      case 'random':
        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lines[i], lines[j]] = [lines[j], lines[i]];
        }
        break;
      case 'reverse':
        lines.reverse();
        break;
    }

    this.outputText.value = lines.join('\n');
    this.lineCount.textContent = lines.length;

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', '排序完成');
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.value);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.textSorter = new TextSorter();
});

export default TextSorter;
