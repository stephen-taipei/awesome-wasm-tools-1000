/**
 * ENC-031: Vigenere Cipher
 */
class VigenereCipher {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.key = document.getElementById('key');
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
  }
  process(encode) {
    const text = this.inputText.value;
    const keyText = this.key.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!text || !keyText) { this.showStatus('error', '請輸入文字和密鑰'); return; }
    let keyIndex = 0;
    const result = text.replace(/[a-zA-Z]/g, char => {
      const base = char >= 'a' ? 97 : 65;
      const charCode = char.toUpperCase().charCodeAt(0) - 65;
      const keyCode = keyText.charCodeAt(keyIndex % keyText.length) - 65;
      keyIndex++;
      const shift = encode ? keyCode : (26 - keyCode);
      return String.fromCharCode(((charCode + shift) % 26) + base);
    });
    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', encode ? '加密完成！' : '解密完成！');
  }
  clear() { this.inputText.value = ''; this.outputText.value = ''; this.key.value = ''; this.resultArea.style.display = 'none'; }
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
document.addEventListener('DOMContentLoaded', () => { window.vigenereCipher = new VigenereCipher(); });
export default VigenereCipher;
