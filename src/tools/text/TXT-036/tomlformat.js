/**
 * TXT-036: TOML Formatter
 *
 * Formats and beautifies TOML data.
 */

class TOMLFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.formatBtn = document.getElementById('formatBtn');
    this.validateBtn = document.getElementById('validateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.validateBtn.addEventListener('click', () => this.validate());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  parseToml(toml) {
    const result = {};
    let currentSection = result;
    const lines = toml.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Section header
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const sectionName = trimmed.slice(1, -1);
        const parts = sectionName.split('.');
        currentSection = result;

        for (const part of parts) {
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part];
        }
        continue;
      }

      // Key-value pair
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const valueStr = trimmed.slice(eqIndex + 1).trim();
        currentSection[key] = this.parseValue(valueStr);
      }
    }

    return result;
  }

  parseValue(str) {
    str = str.trim();

    // String (double or single quoted)
    if ((str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }

    // Boolean
    if (str === 'true') return true;
    if (str === 'false') return false;

    // Number
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    if (/^-?\d*\.\d+$/.test(str)) return parseFloat(str);

    // Array
    if (str.startsWith('[') && str.endsWith(']')) {
      const inner = str.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map(item => this.parseValue(item.trim()));
    }

    return str;
  }

  objectToToml(obj, prefix = '') {
    let output = '';
    const sections = [];
    const values = [];

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sections.push([key, value]);
      } else {
        values.push([key, value]);
      }
    }

    // Output values first
    for (const [key, value] of values) {
      output += `${key} = ${this.valueToToml(value)}\n`;
    }

    // Then sections
    for (const [key, value] of sections) {
      const sectionName = prefix ? `${prefix}.${key}` : key;
      output += `\n[${sectionName}]\n`;
      output += this.objectToToml(value, sectionName);
    }

    return output;
  }

  valueToToml(value) {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.valueToToml(v)).join(', ')}]`;
    }
    return String(value);
  }

  format() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 TOML');
      return;
    }

    try {
      const parsed = this.parseToml(input);
      const formatted = this.objectToToml(parsed).trim();

      this.outputText.textContent = formatted;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'TOML 格式化成功');
    } catch (e) {
      this.showStatus('error', `TOML 解析錯誤: ${e.message}`);
    }
  }

  validate() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 TOML');
      return;
    }

    try {
      this.parseToml(input);
      this.showStatus('success', 'TOML 格式正確');
    } catch (e) {
      this.showStatus('error', `TOML 格式錯誤: ${e.message}`);
    }
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.textContent);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
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
  window.tomlFormatter = new TOMLFormatter();
});

export default TOMLFormatter;
