/**
 * TXT-028: JSON to YAML Converter
 *
 * Converts JSON format to YAML format.
 */

class JSONToYAML {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.indentSize = document.getElementById('indentSize');
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

  jsonToYaml(obj, indent = 0, indentStr = '  ') {
    const currentIndent = indentStr.repeat(indent);
    const nextIndent = indentStr.repeat(indent + 1);

    if (obj === null) {
      return 'null';
    }

    if (typeof obj === 'boolean') {
      return obj ? 'true' : 'false';
    }

    if (typeof obj === 'number') {
      return String(obj);
    }

    if (typeof obj === 'string') {
      // Check if string needs quoting
      if (obj === '' ||
          obj.includes('\n') ||
          obj.includes(':') ||
          obj.includes('#') ||
          obj.match(/^[\[\]{}&*!|>'"%@`]/) ||
          obj.match(/^(true|false|null|yes|no|on|off)$/i) ||
          obj.match(/^\d/)) {
        if (obj.includes('\n')) {
          // Use literal block scalar for multiline
          const lines = obj.split('\n').map(line => nextIndent + line).join('\n');
          return `|\n${lines}`;
        }
        // Quote the string
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      const items = obj.map(item => {
        const value = this.jsonToYaml(item, indent + 1, indentStr);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Object in array - put first key on same line
          const lines = value.split('\n');
          return `${currentIndent}- ${lines[0].trim()}\n${lines.slice(1).join('\n')}`;
        }
        return `${currentIndent}- ${value}`;
      });

      return '\n' + items.join('\n');
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';

      const entries = keys.map(key => {
        const value = obj[key];
        const yamlValue = this.jsonToYaml(value, indent + 1, indentStr);

        // Quote key if necessary
        let yamlKey = key;
        if (key.includes(':') || key.includes('#') || key.match(/^[\[\]{}&*!|>'"%@`]/)) {
          yamlKey = `"${key}"`;
        }

        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && value.length > 0) {
            return `${currentIndent}${yamlKey}:${yamlValue}`;
          }
          if (!Array.isArray(value) && Object.keys(value).length > 0) {
            return `${currentIndent}${yamlKey}:\n${yamlValue}`;
          }
          return `${currentIndent}${yamlKey}: ${yamlValue}`;
        }

        return `${currentIndent}${yamlKey}: ${yamlValue}`;
      });

      return entries.join('\n');
    }

    return String(obj);
  }

  convert() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const indentStr = ' '.repeat(parseInt(this.indentSize.value));
      const yaml = this.jsonToYaml(parsed, 0, indentStr);

      this.outputText.textContent = yaml;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `JSON 解析錯誤: ${e.message}`);
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
  window.jsonToYaml = new JSONToYAML();
});

export default JSONToYAML;
