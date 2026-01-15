/**
 * TXT-032: XML Formatter
 *
 * Formats and beautifies XML data.
 */

class XMLFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.indentSize = document.getElementById('indentSize');
    this.formatBtn = document.getElementById('formatBtn');
    this.minifyBtn = document.getElementById('minifyBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.minifyBtn.addEventListener('click', () => this.minify());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  formatXml(xml, indent) {
    const indentStr = indent === 'tab' ? '\t' : ' '.repeat(parseInt(indent));
    let formatted = '';
    let level = 0;

    // Remove existing whitespace between tags
    xml = xml.replace(/>\s*</g, '><').trim();

    // Split by < to process each tag
    const parts = xml.split(/(<[^>]+>)/g).filter(p => p);

    for (const part of parts) {
      if (!part.trim()) continue;

      if (part.startsWith('<?')) {
        // XML declaration
        formatted += part + '\n';
      } else if (part.startsWith('<!')) {
        // Comment or DOCTYPE
        formatted += indentStr.repeat(level) + part + '\n';
      } else if (part.startsWith('</')) {
        // Closing tag
        level--;
        formatted += indentStr.repeat(level) + part + '\n';
      } else if (part.startsWith('<') && part.endsWith('/>')) {
        // Self-closing tag
        formatted += indentStr.repeat(level) + part + '\n';
      } else if (part.startsWith('<')) {
        // Opening tag
        formatted += indentStr.repeat(level) + part + '\n';
        level++;
      } else {
        // Text content
        const text = part.trim();
        if (text) {
          // Put text on same line as opening tag
          formatted = formatted.trimEnd();
          formatted = formatted.slice(0, -1); // Remove newline after opening tag
          formatted += text;
          level--; // Next closing tag will be on same line
        }
      }
    }

    return formatted.trim();
  }

  format() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 XML');
      return;
    }

    try {
      // Validate XML
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');

      if (parseError) {
        throw new Error(parseError.textContent);
      }

      const indent = this.indentSize.value;
      const formatted = this.formatXml(input, indent);

      this.outputText.textContent = formatted;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'XML 格式化成功');
    } catch (e) {
      this.showStatus('error', `XML 解析錯誤: ${e.message}`);
    }
  }

  minify() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 XML');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/xml');
      const parseError = doc.querySelector('parsererror');

      if (parseError) {
        throw new Error(parseError.textContent);
      }

      // Remove whitespace between tags
      const minified = input
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();

      this.outputText.textContent = minified;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', 'XML 壓縮成功');
    } catch (e) {
      this.showStatus('error', `XML 解析錯誤: ${e.message}`);
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
  window.xmlFormatter = new XMLFormatter();
});

export default XMLFormatter;
