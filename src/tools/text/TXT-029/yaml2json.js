/**
 * TXT-029: YAML to JSON Converter
 *
 * Converts YAML format to JSON format.
 * Simple YAML parser for common cases.
 */

class YAMLToJSON {
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

  parseYaml(yaml) {
    const lines = yaml.split('\n');
    const result = this.parseLines(lines, 0).value;
    return result;
  }

  parseLines(lines, startIndent) {
    const result = {};
    let isArray = false;
    let arrayResult = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      // Calculate indent
      const indent = line.search(/\S/);
      if (indent < startIndent) {
        break;
      }

      // Check for array item
      if (trimmed.startsWith('- ')) {
        isArray = true;
        const content = trimmed.slice(2);

        if (content.includes(':')) {
          // Inline object in array
          const colonPos = content.indexOf(':');
          const key = content.slice(0, colonPos).trim();
          const value = content.slice(colonPos + 1).trim();

          const obj = {};
          obj[key] = this.parseValue(value);

          // Check for nested content
          const nestedLines = [];
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            const nextIndent = nextLine.search(/\S/);
            if (nextIndent <= indent && nextLine.trim()) break;
            if (nextLine.trim()) nestedLines.push(nextLine);
            i++;
          }

          if (nestedLines.length > 0) {
            const nested = this.parseLines(nestedLines, indent + 2);
            Object.assign(obj, nested.value);
          }

          arrayResult.push(obj);
        } else {
          arrayResult.push(this.parseValue(content));
          i++;
        }
        continue;
      }

      // Key-value pair
      const colonPos = trimmed.indexOf(':');
      if (colonPos === -1) {
        i++;
        continue;
      }

      const key = trimmed.slice(0, colonPos).trim().replace(/^["']|["']$/g, '');
      const valueStr = trimmed.slice(colonPos + 1).trim();

      if (valueStr) {
        // Inline value
        result[key] = this.parseValue(valueStr);
        i++;
      } else {
        // Nested value
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
          const nested = this.parseLines(nestedLines, indent + 2);
          result[key] = nested.value;
        } else {
          result[key] = null;
        }
      }
    }

    return {
      value: isArray ? arrayResult : result,
      consumed: i
    };
  }

  parseValue(str) {
    const trimmed = str.trim();

    // Null
    if (trimmed === '' || trimmed === 'null' || trimmed === '~') {
      return null;
    }

    // Boolean
    if (trimmed === 'true' || trimmed === 'yes' || trimmed === 'on') {
      return true;
    }
    if (trimmed === 'false' || trimmed === 'no' || trimmed === 'off') {
      return false;
    }

    // Number
    if (/^-?\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (/^-?\d*\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Quoted string
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Inline array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }

    // Inline object
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  convert() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 YAML');
      return;
    }

    try {
      const parsed = this.parseYaml(input);
      const indent = parseInt(this.indentSize.value);
      const json = JSON.stringify(parsed, null, indent);

      this.outputText.textContent = json;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `YAML 解析錯誤: ${e.message}`);
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
  window.yamlToJson = new YAMLToJSON();
});

export default YAMLToJSON;
