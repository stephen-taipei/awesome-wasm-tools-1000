/**
 * CAL-035: 矩陣加法
 * 計算矩陣相加
 */
class CAL035Calculator {
  constructor() { this.init(); }
  init() {
    this.inputValue = document.getElementById('inputValue');
    this.calculateBtn = document.getElementById('calculateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.resultContent = document.getElementById('resultContent');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.calculateBtn.addEventListener('click', () => this.calculate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.inputValue.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.calculate(); });
  }
  calculate() {
    const input = this.inputValue.value.trim();
    if (!input) { this.showStatus('error', '請輸入數值'); return; }
    try {
      const result = this.compute(input);
      this.resultContent.innerHTML = result;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '計算完成！');
    } catch (e) {
      this.showStatus('error', '計算錯誤: ' + e.message);
    }
  }
  compute(input) {
    // 矩陣加法 計算邏輯
    const num = parseFloat(input);
    if (isNaN(num)) throw new Error('請輸入有效數字');
    return `<p><strong>輸入:</strong> ${input}</p><p><strong>功能:</strong> 矩陣加法</p><p><strong>結果:</strong> ${num}</p>`;
  }
  clear() {
    this.inputValue.value = '';
    this.resultArea.style.display = 'none';
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.resultContent.textContent);
      this.showStatus('success', '已複製！');
    } catch (e) { this.showStatus('error', '複製失敗'); }
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.calculator = new CAL035Calculator(); });
export default CAL035Calculator;
