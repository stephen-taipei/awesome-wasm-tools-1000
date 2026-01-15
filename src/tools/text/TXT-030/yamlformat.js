/**
 * TXT-030: YAML Formatter
 *
 * Formats and beautifies YAML data.
 */

class YAMLFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.indentSize = document.getElementById('indentSize');
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

  // Simple YAML parser
  parseYaml(yaml) {
    const lines = yaml.split('\n');
    return this.parseLines(lines, 0).value;
  }

  parseLines(lines, startIndent) {
    const result = {};
    let isArray = false;
    let arrayResult = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      const indent = line.search(/\S/);
      if (indent < startIndent) break;

      if (trimmed.startsWith('- ')) {
        isArray = true;
        const content = trimmed.slice(2);
        if (content.includes(':')) {
          const colonPos = content.indexOf(':');
          const key = content.slice(0, colonPos).trim();
          const value = content.slice(colonPos + 1).trim();
          const obj = { [key]: this.parseValue(value) };
          arrayResult.push(obj);
        } else {
          arrayResult.push(this.parseValue(content));
        }
        i++;
        continue;
      }

      const colonPos = trimmed.indexOf(':');
      if (colonPos === -1) {
        i++;
        continue;
      }

      const key = trimmed.slice(0, colonPos).trim().replace(/^["']|["']$/g, '');
      const valueStr = trimmed.slice(colonPos + 1).trim();

      if (valueStr) {
        result[key] = this.parseValue(valueStr);
        i++;
      } else {
        const nestedLines = [];
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          const nextTrimmed = nextLine.trim();
          if (!nextTrimmed || nextTrimmed.startsWith('#')) {
            i++;
            continue;
          }
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent <= indent) break;
          nestedLines.push(nextLine);
          i++;
        }
        if (nestedLines.length > 0) {
          result[key] = this.parseLines(nestedLines, indent + 2).value;
        } else {
          result[key] = null;
        }
      }
    }

    return { value: isArray ? arrayResult : result, consumed: i };
  }

  parseValue(str) {
    const trimmed = str.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === '~') return null;
    if (trimmed === 'true' || trimmed === 'yes') return true;
    if (trimmed === 'false' || trimmed === 'no') return false;
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  // Convert object back to YAML
  objectToYaml(obj, indent = 0, indentStr = '  ') {
    const currentIndent = indentStr.repeat(indent);

    if (obj === null) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return '\n' + obj.map(item => {
        const value = this.objectToYaml(item, indent + 1, indentStr);
        return `${currentIndent}- ${value.trim()}`;
      }).join('\n');
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      return keys.map(key => {
        const value = obj[key];
        const yamlValue = this.objectToYaml(value, indent + 1, indentStr);
        if (typeof value === 'object' && value !== null) {
          return `${currentIndent}${key}:${yamlValue}`;
        }
        return `${currentIndent}${key}: ${yamlValue}`;
      }).join('\n');
    }

    return String(obj);
  }

  format() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 YAML');
      return;
    }

    try {
      const parsed = this.parseYaml(input);
      const indentStr = ' '.repeat(parseInt(this.indentSize.value));
      const formatted = this.objectToYaml(parsed, 0, indentStr);

      this.outputText.textContent = formatted;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'YAML 格式化成功');
    } catch (e) {
      this.showStatus('error', `YAML 解析錯誤: ${e.message}`);
    }
  }

  validate() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 YAML');
      return;
    }

    try {
      this.parseYaml(input);
      this.showStatus('success', 'YAML 格式正確');
    } catch (e) {
      this.showStatus('error', `YAML 格式錯誤: ${e.message}`);
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
  window.yamlFormatter = new YAMLFormatter();
});

export default YAMLFormatter;
