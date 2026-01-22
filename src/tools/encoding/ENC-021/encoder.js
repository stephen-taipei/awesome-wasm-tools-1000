/**
 * ENC-021: Binary Encoder
 */
class BinaryEncoder {
  constructor() {
    this.init();
  }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.addSpace = document.getElementById('addSpace');
    this.add0b = document.getElementById('add0b');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.addSpace.addEventListener('change', () => this.encode());
    this.add0b.addEventListener('change', () => this.encode());
  }
  encode() {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      let binArray = Array.from(data).map(byte => {
        let bin = byte.toString(2).padStart(8, '0');
        if (this.add0b.checked) bin = '0b' + bin;
        return bin;
      });
      const result = this.addSpace.checked ? binArray.join(' ') : binArray.join('');
      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '編碼完成！');
    } catch (error) {
      this.showStatus('error', '編碼失敗：' + error.message);
    }
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
document.addEventListener('DOMContentLoaded', () => { window.binaryEncoder = new BinaryEncoder(); });
export default BinaryEncoder;
