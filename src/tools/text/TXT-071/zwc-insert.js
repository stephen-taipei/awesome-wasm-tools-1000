/**
 * TXT-071: Zero-Width Character Inserter
 *
 * Inserts zero-width characters into text for hidden messages.
 */

class ZWCInserter {
  constructor() {
    this.ZWC = {
      ZWSP: '\u200B',
      ZWNJ: '\u200C',
      ZWJ: '\u200D',
      ZWSP2: '\uFEFF'
    };
    this.init();
  }

  init() {
    this.visibleText = document.getElementById('visibleText');
    this.hiddenText = document.getElementById('hiddenText');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  encode() {
    const visible = this.visibleText.value;
    const hidden = this.hiddenText.value;

    if (!visible) {
      this.showStatus('error', '請輸入可見文字');
      return;
    }

    if (!hidden) {
      this.showStatus('error', '請輸入隱藏訊息');
      return;
    }

    const binaryHidden = this.textToBinary(hidden);
    const zwcEncoded = this.binaryToZWC(binaryHidden);

    const insertPos = Math.floor(visible.length / 2);
    const result = visible.slice(0, insertPos) + zwcEncoded + visible.slice(insertPos);

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '編碼完成');
  }

  textToBinary(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let binary = '';
    for (const byte of bytes) {
      binary += byte.toString(2).padStart(8, '0');
    }
    return binary;
  }

  binaryToZWC(binary) {
    let result = this.ZWC.ZWSP2;
    for (const bit of binary) {
      result += bit === '0' ? this.ZWC.ZWSP : this.ZWC.ZWNJ;
    }
    result += this.ZWC.ZWJ;
    return result;
  }

  clear() {
    this.visibleText.value = '';
    this.hiddenText.value = '';
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
  window.zwcInserter = new ZWCInserter();
});

export default ZWCInserter;
