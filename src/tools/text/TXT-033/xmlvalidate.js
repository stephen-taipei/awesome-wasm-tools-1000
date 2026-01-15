/**
 * TXT-033: XML Validator
 *
 * Validates XML data format.
 */

class XMLValidator {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.validateBtn = document.getElementById('validateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.validationResult = document.getElementById('validationResult');
    this.xmlInfo = document.getElementById('xmlInfo');
    this.rootElement = document.getElementById('rootElement');
    this.elementCount = document.getElementById('elementCount');
    this.attributeCount = document.getElementById('attributeCount');
    this.maxDepth = document.getElementById('maxDepth');
    this.elementTree = document.getElementById('elementTree');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.validateBtn.addEventListener('click', () => this.validate());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  countElements(element) {
    let count = 1;
    for (const child of element.children) {
      count += this.countElements(child);
    }
    return count;
  }

  countAttributes(element) {
    let count = element.attributes.length;
    for (const child of element.children) {
      count += this.countAttributes(child);
    }
    return count;
  }

  getDepth(element, current = 1) {
    if (element.children.length === 0) return current;
    return Math.max(...Array.from(element.children).map(c => this.getDepth(c, current + 1)));
  }

  buildTree(element, indent = 0) {
    const indentStr = '  '.repeat(indent);
    let tree = `${indentStr}<${element.tagName}`;

    // Add attributes
    for (const attr of element.attributes) {
      tree += ` ${attr.name}="${attr.value}"`;
    }

    if (element.children.length === 0) {
      const text = element.textContent.trim();
      if (text) {
        tree += `>${text}</${element.tagName}>`;
      } else {
        tree += ' />';
      }
    } else {
      tree += '>\n';
      for (const child of element.children) {
        tree += this.buildTree(child, indent + 1) + '\n';
      }
      tree += `${indentStr}</${element.tagName}>`;
    }

    return tree;
  }

  validate() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 XML');
      return;
    }

    this.resultArea.style.display = 'block';

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');

      if (parseError) {
        throw new Error(parseError.textContent);
      }

      this.validationResult.className = 'validation-result success';
      this.validationResult.innerHTML = `
        <div class="validation-icon">✅</div>
        <div class="validation-text">
          <strong>XML 格式正確</strong>
          <p>輸入的 XML 完全有效</p>
        </div>
      `;

      // Show XML info
      this.xmlInfo.style.display = 'block';
      const root = doc.documentElement;

      this.rootElement.textContent = root.tagName;
      this.elementCount.textContent = this.countElements(root);
      this.attributeCount.textContent = this.countAttributes(root);
      this.maxDepth.textContent = this.getDepth(root);
      this.elementTree.textContent = this.buildTree(root);

    } catch (e) {
      this.validationResult.className = 'validation-result error';
      this.validationResult.innerHTML = `
        <div class="validation-icon">❌</div>
        <div class="validation-text">
          <strong>XML 格式錯誤</strong>
          <p>${this.escapeHtml(e.message.split('\n')[0])}</p>
        </div>
      `;
      this.xmlInfo.style.display = 'none';
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
  window.xmlValidator = new XMLValidator();
});

export default XMLValidator;
