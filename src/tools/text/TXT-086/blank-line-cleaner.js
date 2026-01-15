/**
 * TXT-086: Blank Line Cleaner
 *
 * Removes excess blank lines and keeps code clean.
 */

class BlankLineCleaner {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.removeAll = document.getElementById('removeAll');
    this.mergeMultiple = document.getElementById('mergeMultiple');
    this.trimLines = document.getElementById('trimLines');
    this.removeLeading = document.getElementById('removeLeading');
    this.removeTrailing = document.getElementById('removeTrailing');
    this.originalLines = document.getElementById('originalLines');
    this.cleanedLines = document.getElementById('cleanedLines');
    this.cleanBtn = document.getElementById('cleanBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.cleanBtn.addEventListener('click', () => this.clean());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  clean() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const originalLineCount = text.split('\n').length;
    let lines = text.split('\n');

    if (this.trimLines.checked) {
      lines = lines.map(line => line.trimEnd());
    }

    if (this.removeAll.checked) {
      lines = lines.filter(line => line.trim() !== '');
    } else if (this.mergeMultiple.checked) {
      const merged = [];
      let prevBlank = false;
      for (const line of lines) {
        const isBlank = line.trim() === '';
        if (isBlank && prevBlank) {
          continue;
        }
        merged.push(line);
        prevBlank = isBlank;
      }
      lines = merged;
    }

    if (this.removeLeading.checked) {
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
    }

    if (this.removeTrailing.checked) {
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
    }

    const result = lines.join('\n');
    const cleanedLineCount = lines.length;

    this.outputText.value = result;
    this.originalLines.textContent = originalLineCount;
    this.cleanedLines.textContent = cleanedLineCount;
    this.resultArea.style.display = 'block';
    this.showStatus('success', `移除了 ${originalLineCount - cleanedLineCount} 行`);
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.originalLines.textContent = '0';
    this.cleanedLines.textContent = '0';
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
  window.blankLineCleaner = new BlankLineCleaner();
});

export default BlankLineCleaner;
