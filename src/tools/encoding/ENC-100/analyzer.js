/**
 * ENC-100: 字元分析
 * 字元詳細資訊分析
 */
class Tool100 {
  constructor() { this.init(); }
  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.processBtn = document.getElementById('processBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.inputText.addEventListener('input', () => this.process());
    this.processBtn.addEventListener('click', () => this.process());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }
  process() {
    const text = this.inputText.value;
    if (!text) { this.resultArea.style.display = 'none'; return; }
    try {
      const result = this.transform(text);
      this.outputText.value = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '處理完成！');
    } catch (e) {
      this.showStatus('error', '處理失敗：' + e.message);
    }
  }
  transform(text) {
    // Tool-specific implementation
    return text;
  }
  clear() { this.inputText.value = ''; this.outputText.value = ''; this.resultArea.style.display = 'none'; }
  async copy() {
    try { await navigator.clipboard.writeText(this.outputText.value); this.showStatus('success', '已複製！'); }
    catch (e) { this.showStatus('error', '複製失敗'); }
  }
  showStatus(type, message) {
    this.statusMessage.className = 'status-message active ' + type;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.tool100 = new Tool100(); });
export default Tool100;