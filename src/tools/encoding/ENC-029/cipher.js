/**
 * ENC-029: Caesar Cipher
 */
class CaesarCipher {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.shift = document.getElementById('shift');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.encodeBtn.addEventListener('click', () => this.process(true));
    this.decodeBtn.addEventListener('click', () => this.process(false));
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.inputText.addEventListener('input', () => this.process(true));
    this.shift.addEventListener('input', () => this.process(true));
  }
  process(encode) {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    const shiftAmount = parseInt(this.shift.value) || 3;
    const actualShift = encode ? shiftAmount : (26 - shiftAmount);
    const result = text.replace(/[a-zA-Z]/g, char => {
      const base = char >= 'a' ? 97 : 65;
      return String.fromCharCode(((char.charCodeAt(0) - base + actualShift) % 26) + base);
    });
    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', encode ? '加密完成！' : '解密完成！');
  }
  clear() { this.inputText.value = ''; this.outputText.value = ''; this.resultArea.style.display = 'none'; }
  async copy() {
    try { await navigator.clipboard.writeText(this.outputText.value); this.showStatus('success', '已複製！'); }
    catch (e) { this.showStatus('error', '複製失敗'); }
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.caesarCipher = new CaesarCipher(); });
export default CaesarCipher;
