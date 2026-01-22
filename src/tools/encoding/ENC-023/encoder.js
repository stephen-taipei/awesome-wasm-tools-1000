/**
 * ENC-023: Octal Encoder
 */
class OctalEncoder {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.encodeBtn = document.getElementById('encodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.addSpace = document.getElementById('addSpace');
    this.add0o = document.getElementById('add0o');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.encode());
    this.encodeBtn.addEventListener('click', () => this.encode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.addSpace.addEventListener('change', () => this.encode());
    this.add0o.addEventListener('change', () => this.encode());
  }
  encode() {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      let octArray = Array.from(data).map(byte => {
        let oct = byte.toString(8).padStart(3, '0');
        if (this.add0o.checked) oct = '0o' + oct;
        return oct;
      });
      const result = this.addSpace.checked ? octArray.join(' ') : octArray.join('');
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
document.addEventListener('DOMContentLoaded', () => { window.octalEncoder = new OctalEncoder(); });
export default OctalEncoder;
