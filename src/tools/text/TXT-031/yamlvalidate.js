/**
 * TXT-031: YAML Validator
 *
 * Validates YAML data format.
 */

class YAMLValidator {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.validateBtn = document.getElementById('validateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.validationResult = document.getElementById('validationResult');
    this.yamlInfo = document.getElementById('yamlInfo');
    this.structurePreview = document.getElementById('structurePreview');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.validateBtn.addEventListener('click', () => this.validate());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

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
        arrayResult.push(this.parseValue(content));
        i++;
        continue;
      }

      const colonPos = trimmed.indexOf(':');
      if (colonPos === -1) {
        i++;
        continue;
      }

      const key = trimmed.slice(0, colonPos).trim();
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

  validate() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 YAML');
      return;
    }

    this.resultArea.style.display = 'block';

    try {
      const parsed = this.parseYaml(input);

      this.validationResult.className = 'validation-result success';
      this.validationResult.innerHTML = `
        <div class="validation-icon">✅</div>
        <div class="validation-text">
          <strong>YAML 格式正確</strong>
          <p>輸入的 YAML 完全有效</p>
        </div>
      `;

      this.yamlInfo.style.display = 'block';
      this.structurePreview.textContent = JSON.stringify(parsed, null, 2);

    } catch (e) {
      this.validationResult.className = 'validation-result error';
      this.validationResult.innerHTML = `
        <div class="validation-icon">❌</div>
        <div class="validation-text">
          <strong>YAML 格式錯誤</strong>
          <p>${this.escapeHtml(e.message)}</p>
        </div>
      `;
      this.yamlInfo.style.display = 'none';
    }
  }

  clear() {
    this.inputText.value = '';
    this.resultArea.style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  window.yamlValidator = new YAMLValidator();
});

export default YAMLValidator;
