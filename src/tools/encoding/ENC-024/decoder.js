/**
 * ENC-024: Octal Decoder
 */
class OctalDecoder {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.decodeBtn = document.getElementById('decodeBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.decode());
    this.decodeBtn.addEventListener('click', () => this.decode());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }
  decode() {
    let input = this.inputText.value.trim();
    if (!input) { this.resultArea.style.display = 'none'; return; }
    try {
      input = input.replace(/0o/gi, '').replace(/[\s,;]/g, ' ').trim();
      const octArray = input.split(/\s+/).filter(b => b);
      const bytes = octArray.map(o => parseInt(o, 8));
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const result = decoder.decode(new Uint8Array(bytes));
      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '解碼完成！');
    } catch (error) {
      this.showStatus('error', '解碼失敗：無效的八進位格式');
      this.resultArea.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', () => { window.octalDecoder = new OctalDecoder(); });
export default OctalDecoder;
