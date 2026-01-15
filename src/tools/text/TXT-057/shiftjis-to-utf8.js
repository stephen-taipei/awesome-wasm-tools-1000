/**
 * TXT-057: Shift-JIS to UTF-8 Converter
 *
 * Converts Shift-JIS encoded Japanese text to UTF-8.
 */

class ShiftJisToUtf8 {
  constructor() {
    this.init();
  }

  init() {
    this.fileInput = document.getElementById('fileInput');
    this.hexInput = document.getElementById('hexInput');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.fileInput.addEventListener('change', (e) => this.handleFile(e));
    this.convertBtn.addEventListener('click', () => this.convertHex());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  async handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('shift-jis');
      const text = decoder.decode(arrayBuffer);
      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '檔案轉換完成');
    } catch (err) {
      this.showStatus('error', `轉換失敗: ${err.message}`);
    }
  }

  convertHex() {
    const hexStr = this.hexInput.value.trim();
    if (!hexStr) {
      this.showStatus('error', '請輸入十六進制資料或上傳檔案');
      return;
    }

    try {
      const hexValues = hexStr.split(/\s+/).map(h => parseInt(h, 16));
      const bytes = new Uint8Array(hexValues);
      const decoder = new TextDecoder('shift-jis');
      const text = decoder.decode(bytes);
      this.outputText.value = text;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '轉換完成');
    } catch (err) {
      this.showStatus('error', `轉換失敗: ${err.message}`);
    }
  }

  clear() {
    this.fileInput.value = '';
    this.hexInput.value = '';
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

  download() {
    const text = this.outputText.value;
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-utf8.txt';
    a.click();
    URL.revokeObjectURL(url);
    this.showStatus('success', '檔案已下載');
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
  window.shiftJisToUtf8 = new ShiftJisToUtf8();
});

export default ShiftJisToUtf8;
