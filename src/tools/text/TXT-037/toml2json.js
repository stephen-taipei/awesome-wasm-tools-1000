/**
 * TXT-037: TOML to JSON Converter
 *
 * Converts TOML format to JSON format.
 */

class TOMLToJSON {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.convertBtn = document.getElementById('convertBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  parseToml(toml) {
    const result = {};
    let currentSection = result;
    const lines = toml.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

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

    if ((str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }

    if (str === 'true') return true;
    if (str === 'false') return false;

    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    if (/^-?\d*\.\d+$/.test(str)) return parseFloat(str);

    if (str.startsWith('[') && str.endsWith(']')) {
      const inner = str.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map(item => this.parseValue(item.trim()));
    }

    return str;
  }

  convert() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 TOML');
      return;
    }

    try {
      const parsed = this.parseToml(input);
      const json = JSON.stringify(parsed, null, 2);

      this.outputText.textContent = json;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `TOML 解析錯誤: ${e.message}`);
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
  window.tomlToJson = new TOMLToJSON();
});

export default TOMLToJSON;
