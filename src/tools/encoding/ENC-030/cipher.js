/**
 * ENC-030: Atbash Cipher
 */
class AtbashCipher {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.convert());
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }
  convert() {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    const result = text.replace(/[a-zA-Z]/g, char => {
      const base = char >= 'a' ? 97 : 65;
      return String.fromCharCode(base + (25 - (char.charCodeAt(0) - base)));
    });
    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成！');
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
document.addEventListener('DOMContentLoaded', () => { window.atbashCipher = new AtbashCipher(); });
export default AtbashCipher;
