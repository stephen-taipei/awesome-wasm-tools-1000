/**
 * TXT-004: Text Deduplication Tool
 *
 * Removes duplicate lines or words from text.
 */

class TextDedup {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.dedupMode = document.getElementById('dedupMode');
    this.ignoreCase = document.getElementById('ignoreCase');
    this.trimWhitespace = document.getElementById('trimWhitespace');
    this.keepEmpty = document.getElementById('keepEmpty');
    this.dedupBtn = document.getElementById('dedupBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.originalCount = document.getElementById('originalCount');
    this.uniqueCount = document.getElementById('uniqueCount');
    this.removedCount = document.getElementById('removedCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.dedupBtn.addEventListener('click', () => this.deduplicate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  deduplicate() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const mode = this.dedupMode.value;
    const caseInsensitive = this.ignoreCase.checked;
    const trim = this.trimWhitespace.checked;
    const keepEmptyLines = this.keepEmpty.checked;

    let items;
    let separator;

    if (mode === 'line') {
      items = text.split('\n');
      separator = '\n';
    } else {
      items = text.split(/\s+/);
      separator = ' ';
    }

    const originalLength = items.length;
    const seen = new Set();
    const uniqueItems = [];

    for (let item of items) {
      let processedItem = trim ? item.trim() : item;

      // Handle empty items
      if (!processedItem) {
        if (keepEmptyLines && mode === 'line') {
          uniqueItems.push(item);
        }
        continue;
      }

      const key = caseInsensitive ? processedItem.toLowerCase() : processedItem;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(trim ? processedItem : item);
      }
    }

    const result = uniqueItems.join(separator);
    this.outputText.value = result;

    this.originalCount.textContent = originalLength;
    this.uniqueCount.textContent = uniqueItems.length;
    this.removedCount.textContent = originalLength - uniqueItems.length;

    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', `已移除 ${originalLength - uniqueItems.length} 個重複項目`);
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
  window.textDedup = new TextDedup();
});

export default TextDedup;
