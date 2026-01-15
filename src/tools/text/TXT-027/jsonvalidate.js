/**
 * TXT-027: JSON Validator
 *
 * Validates JSON data format.
 */

class JSONValidator {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.validateBtn = document.getElementById('validateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.validationResult = document.getElementById('validationResult');
    this.jsonInfo = document.getElementById('jsonInfo');
    this.rootType = document.getElementById('rootType');
    this.jsonDepth = document.getElementById('jsonDepth');
    this.keyCount = document.getElementById('keyCount');
    this.arrayCount = document.getElementById('arrayCount');
    this.structurePreview = document.getElementById('structurePreview');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.validateBtn.addEventListener('click', () => this.validate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.inputText.addEventListener('input', () => this.validateRealtime());
  }

  getDepth(obj, current = 0) {
    if (obj === null || typeof obj !== 'object') {
      return current;
    }

    const values = Array.isArray(obj) ? obj : Object.values(obj);
    if (values.length === 0) return current + 1;

    return Math.max(...values.map(v => this.getDepth(v, current + 1)));
  }

  countKeys(obj) {
    if (obj === null || typeof obj !== 'object') return 0;

    let count = Array.isArray(obj) ? 0 : Object.keys(obj).length;

    const values = Array.isArray(obj) ? obj : Object.values(obj);
    for (const v of values) {
      count += this.countKeys(v);
    }
    return count;
  }

  countArrayElements(obj) {
    if (obj === null || typeof obj !== 'object') return 0;

    let count = Array.isArray(obj) ? obj.length : 0;

    const values = Array.isArray(obj) ? obj : Object.values(obj);
    for (const v of values) {
      count += this.countArrayElements(v);
    }
    return count;
  }

  getStructure(obj, depth = 0, maxDepth = 3) {
    if (depth >= maxDepth) {
      return typeof obj === 'object' && obj !== null ? '...' : typeof obj;
    }

    if (obj === null) return 'null';
    if (typeof obj !== 'object') return typeof obj;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const first = this.getStructure(obj[0], depth + 1, maxDepth);
      return `[${first}${obj.length > 1 ? ', ...' : ''}]`;
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const indent = '  '.repeat(depth + 1);
    const closeIndent = '  '.repeat(depth);

    const entries = keys.slice(0, 5).map(key => {
      const value = this.getStructure(obj[key], depth + 1, maxDepth);
      return `${indent}"${key}": ${value}`;
    });

    if (keys.length > 5) {
      entries.push(`${indent}...`);
    }

    return `{\n${entries.join(',\n')}\n${closeIndent}}`;
  }

  validateRealtime() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.inputText.classList.remove('valid', 'invalid');
      return;
    }

    try {
      JSON.parse(input);
      this.inputText.classList.add('valid');
      this.inputText.classList.remove('invalid');
    } catch {
      this.inputText.classList.add('invalid');
      this.inputText.classList.remove('valid');
    }
  }

  validate() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    this.resultArea.style.display = 'block';

    try {
      const parsed = JSON.parse(input);

      this.validationResult.className = 'validation-result success';
      this.validationResult.innerHTML = `
        <div class="validation-icon">✅</div>
        <div class="validation-text">
          <strong>JSON 格式正確</strong>
          <p>輸入的 JSON 完全有效</p>
        </div>
      `;

      // Show JSON info
      this.jsonInfo.style.display = 'block';

      const rootType = Array.isArray(parsed) ? 'Array' : typeof parsed;
      this.rootType.textContent = rootType;
      this.jsonDepth.textContent = this.getDepth(parsed);
      this.keyCount.textContent = this.countKeys(parsed);
      this.arrayCount.textContent = this.countArrayElements(parsed);
      this.structurePreview.textContent = this.getStructure(parsed);

    } catch (e) {
      this.validationResult.className = 'validation-result error';

      // Try to find error position
      const match = e.message.match(/position (\d+)/);
      let errorContext = '';
      if (match) {
        const pos = parseInt(match[1]);
        const start = Math.max(0, pos - 20);
        const end = Math.min(input.length, pos + 20);
        const before = input.slice(start, pos);
        const after = input.slice(pos, end);
        errorContext = `<pre class="error-context">${this.escapeHtml(before)}<mark>▼</mark>${this.escapeHtml(after)}</pre>`;
      }

      this.validationResult.innerHTML = `
        <div class="validation-icon">❌</div>
        <div class="validation-text">
          <strong>JSON 格式錯誤</strong>
          <p>${this.escapeHtml(e.message)}</p>
          ${errorContext}
        </div>
      `;

      this.jsonInfo.style.display = 'none';
    }
  }

  clear() {
    this.inputText.value = '';
    this.inputText.classList.remove('valid', 'invalid');
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
  window.jsonValidator = new JSONValidator();
});

export default JSONValidator;
