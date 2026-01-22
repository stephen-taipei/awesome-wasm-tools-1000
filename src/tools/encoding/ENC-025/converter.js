/**
 * ENC-025: Base Converter
 */
class BaseConverter {
  constructor() { this.init(); }
  init() {
    this.binary = document.getElementById('binary');
    this.octal = document.getElementById('octal');
    this.decimal = document.getElementById('decimal');
    this.hex = document.getElementById('hex');
    this.clearBtn = document.getElementById('clearBtn');
    this.statusMessage = document.getElementById('statusMessage');
    this.isUpdating = false;
    this.bindEvents();
  }
  bindEvents() {
    this.binary.addEventListener('input', () => this.convert('binary'));
    this.octal.addEventListener('input', () => this.convert('octal'));
    this.decimal.addEventListener('input', () => this.convert('decimal'));
    this.hex.addEventListener('input', () => this.convert('hex'));
    this.clearBtn.addEventListener('click', () => this.clear());
  }
  convert(source) {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      let value;
      const input = this[source].value.trim();
      if (!input) { this.clearOthers(source); this.isUpdating = false; return; }
      switch (source) {
        case 'binary': value = parseInt(input, 2); break;
        case 'octal': value = parseInt(input, 8); break;
        case 'decimal': value = parseInt(input, 10); break;
        case 'hex': value = parseInt(input, 16); break;
      }
      if (isNaN(value)) { this.showStatus('error', '無效的數字'); this.isUpdating = false; return; }
      if (source !== 'binary') this.binary.value = value.toString(2);
      if (source !== 'octal') this.octal.value = value.toString(8);
      if (source !== 'decimal') this.decimal.value = value.toString(10);
      if (source !== 'hex') this.hex.value = value.toString(16).toUpperCase();
    } catch (e) { this.showStatus('error', '轉換失敗'); }
    this.isUpdating = false;
  }
  clearOthers(source) {
    if (source !== 'binary') this.binary.value = '';
    if (source !== 'octal') this.octal.value = '';
    if (source !== 'decimal') this.decimal.value = '';
    if (source !== 'hex') this.hex.value = '';
  }
  clear() {
    this.binary.value = ''; this.octal.value = ''; this.decimal.value = ''; this.hex.value = '';
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.baseConverter = new BaseConverter(); });
export default BaseConverter;
