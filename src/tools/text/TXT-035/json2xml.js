/**
 * TXT-035: JSON to XML Converter
 *
 * Converts JSON format to XML format.
 */

class JSONToXML {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.rootName = document.getElementById('rootName');
    this.addDeclaration = document.getElementById('addDeclaration');
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

  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  jsonToXml(obj, tagName = 'item', indent = 0) {
    const indentStr = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return `${indentStr}<${tagName}/>\n`;
    }

    if (typeof obj !== 'object') {
      return `${indentStr}<${tagName}>${this.escapeXml(obj)}</${tagName}>\n`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.jsonToXml(item, tagName, indent)).join('');
    }

    // Handle @attributes
    let attributes = '';
    const attrObj = obj['@attributes'];
    if (attrObj) {
      attributes = Object.entries(attrObj)
        .map(([key, val]) => ` ${key}="${this.escapeXml(val)}"`)
        .join('');
    }

    // Handle #text
    const textContent = obj['#text'];

    // Get other children
    const children = Object.entries(obj)
      .filter(([key]) => key !== '@attributes' && key !== '#text');

    if (children.length === 0 && !textContent) {
      return `${indentStr}<${tagName}${attributes}/>\n`;
    }

    if (children.length === 0 && textContent) {
      return `${indentStr}<${tagName}${attributes}>${this.escapeXml(textContent)}</${tagName}>\n`;
    }

    let xml = `${indentStr}<${tagName}${attributes}>\n`;

    if (textContent) {
      xml += `${indentStr}  ${this.escapeXml(textContent)}\n`;
    }

    for (const [key, value] of children) {
      xml += this.jsonToXml(value, key, indent + 1);
    }

    xml += `${indentStr}</${tagName}>\n`;
    return xml;
  }

  convert() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const rootElement = this.rootName.value || 'root';

      let xml = '';

      if (this.addDeclaration.checked) {
        xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
      }

      // Check if the JSON already has a single root key
      const keys = Object.keys(parsed);
      if (keys.length === 1 && typeof parsed[keys[0]] === 'object') {
        xml += this.jsonToXml(parsed[keys[0]], keys[0], 0);
      } else {
        xml += this.jsonToXml(parsed, rootElement, 0);
      }

      this.outputText.textContent = xml.trim();
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
  window.jsonToXml = new JSONToXML();
});

export default JSONToXML;
