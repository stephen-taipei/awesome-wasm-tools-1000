/**
 * TXT-088: Line Ending Converter
 *
 * Converts between different line ending formats (LF, CRLF, CR).
 */

class LineEndingConverter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.detectedFormat = document.getElementById('detectedFormat');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.inputText.addEventListener('input', () => this.detectFormat());
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  detectFormat() {
    const text = this.inputText.value;
    if (!text) {
      this.detectedFormat.textContent = '-';
      return;
    }

    const hasCRLF = text.includes('\r\n');
    const hasCR = text.includes('\r') && !hasCRLF;
    const hasLF = text.includes('\n') && !hasCRLF;

    if (hasCRLF && !hasCR && !hasLF) {
      this.detectedFormat.textContent = 'CRLF (Windows)';
    } else if (hasLF && !hasCR) {
      this.detectedFormat.textContent = 'LF (Unix/Linux/macOS)';
    } else if (hasCR && !hasLF) {
      this.detectedFormat.textContent = 'CR (舊版 Mac)';
    } else if (hasCRLF || hasCR || hasLF) {
      this.detectedFormat.textContent = '混合格式';
    } else {
      this.detectedFormat.textContent = '無換行符';
    }
  }

  convert() {
    const text = this.inputText.value;
    if (!text) {
      this.showStatus('error', '請輸入文字');
      return;
    }

    const targetFormat = document.querySelector('input[name="targetFormat"]:checked').value;

    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let result;
    switch (targetFormat) {
      case 'lf':
        result = normalized;
        break;
      case 'crlf':
        result = normalized.replace(/\n/g, '\r\n');
        break;
      case 'cr':
        result = normalized.replace(/\n/g, '\r');
        break;
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  clear() {
    this.inputText.value = '';
    this.outputText.value = '';
    this.detectedFormat.textContent = '-';
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
  window.lineEndingConverter = new LineEndingConverter();
});

export default LineEndingConverter;
