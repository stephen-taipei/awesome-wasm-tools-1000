/**
 * TXT-046: Code Formatter
 *
 * Formats JavaScript, CSS, and HTML code.
 */

class CodeFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.language = document.getElementById('language');
    this.indentSize = document.getElementById('indentSize');
    this.formatBtn = document.getElementById('formatBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  getIndent() {
    const size = this.indentSize.value;
    if (size === 'tab') return '\t';
    return ' '.repeat(parseInt(size));
  }

  format() {
    const code = this.inputText.value;
    if (!code.trim()) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const lang = this.language.value;
    let formatted = '';

    try {
      switch (lang) {
        case 'javascript':
          formatted = this.formatJavaScript(code);
          break;
        case 'css':
          formatted = this.formatCSS(code);
          break;
        case 'html':
          formatted = this.formatHTML(code);
          break;
      }

      this.outputText.textContent = formatted;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '格式化成功');
    } catch (e) {
      this.showStatus('error', `格式化錯誤: ${e.message}`);
    }
  }

  formatJavaScript(code) {
    const indent = this.getIndent();
    let result = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = '';
    let inRegex = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1] || '';
      const prevChar = code[i - 1] || '';

      // Handle comments
      if (!inString && !inRegex && !inComment) {
        if (char === '/' && nextChar === '/') {
          inComment = true;
          commentType = 'line';
          result += '//';
          i++;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inComment = true;
          commentType = 'block';
          result += '/*';
          i++;
          continue;
        }
      }

      if (inComment) {
        result += char;
        if (commentType === 'line' && char === '\n') {
          inComment = false;
          result += indent.repeat(depth);
        } else if (commentType === 'block' && char === '/' && prevChar === '*') {
          inComment = false;
        }
        continue;
      }

      // Handle strings
      if (!inString && !inRegex && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        result += char;
        continue;
      }

      if (inString) {
        result += char;
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
        continue;
      }

      // Handle brackets
      if (char === '{' || char === '[' || char === '(') {
        result += char;
        if (char === '{') {
          depth++;
          result += '\n' + indent.repeat(depth);
        }
        continue;
      }

      if (char === '}' || char === ']' || char === ')') {
        if (char === '}') {
          depth = Math.max(0, depth - 1);
          result = result.trimEnd() + '\n' + indent.repeat(depth);
        }
        result += char;
        continue;
      }

      // Handle semicolons
      if (char === ';') {
        result += ';\n' + indent.repeat(depth);
        continue;
      }

      // Handle commas
      if (char === ',') {
        result += ', ';
        continue;
      }

      // Handle colons
      if (char === ':') {
        result += ': ';
        continue;
      }

      // Skip extra whitespace
      if (/\s/.test(char)) {
        if (result && !result.endsWith(' ') && !result.endsWith('\n') && !result.endsWith('\t')) {
          result += ' ';
        }
        continue;
      }

      result += char;
    }

    // Clean up
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.replace(/\s+$/gm, '');

    return result.trim();
  }

  formatCSS(code) {
    const indent = this.getIndent();
    let result = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1] || '';
      const prevChar = code[i - 1] || '';

      // Handle comments
      if (!inString && !inComment && char === '/' && nextChar === '*') {
        result += '/*';
        inComment = true;
        i++;
        continue;
      }

      if (inComment) {
        result += char;
        if (char === '/' && prevChar === '*') {
          inComment = false;
          result += '\n' + indent.repeat(depth);
        }
        continue;
      }

      // Handle strings
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        result += char;
        continue;
      }

      if (inString) {
        result += char;
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
        continue;
      }

      // Handle braces
      if (char === '{') {
        result = result.trimEnd() + ' {\n';
        depth++;
        result += indent.repeat(depth);
        continue;
      }

      if (char === '}') {
        depth = Math.max(0, depth - 1);
        result = result.trimEnd() + '\n' + indent.repeat(depth) + '}\n';
        if (depth > 0) {
          result += indent.repeat(depth);
        }
        continue;
      }

      // Handle semicolons
      if (char === ';') {
        result += ';\n' + indent.repeat(depth);
        continue;
      }

      // Handle colons
      if (char === ':') {
        result += ': ';
        continue;
      }

      // Skip extra whitespace
      if (/\s/.test(char)) {
        if (result && !result.endsWith(' ') && !result.endsWith('\n') && !result.endsWith('\t')) {
          result += ' ';
        }
        continue;
      }

      result += char;
    }

    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.replace(/\s+$/gm, '');

    return result.trim();
  }

  formatHTML(code) {
    const indent = this.getIndent();
    const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    const inlineTags = ['a', 'abbr', 'b', 'bdo', 'br', 'button', 'cite', 'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map', 'object', 'q', 'samp', 'script', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'tt', 'var'];

    let result = '';
    let depth = 0;
    let inTag = false;
    let tagName = '';
    let isClosing = false;
    let currentTag = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      if (char === '<') {
        inTag = true;
        isClosing = code[i + 1] === '/';
        tagName = '';
        currentTag = char;
        continue;
      }

      if (inTag) {
        currentTag += char;

        if (char === '>') {
          inTag = false;

          // Extract tag name
          const match = currentTag.match(/<\/?([a-zA-Z0-9]+)/);
          if (match) {
            tagName = match[1].toLowerCase();
          }

          if (isClosing) {
            depth = Math.max(0, depth - 1);
            if (!inlineTags.includes(tagName)) {
              result = result.trimEnd() + '\n' + indent.repeat(depth);
            }
          } else {
            if (!inlineTags.includes(tagName) && result) {
              result = result.trimEnd() + '\n' + indent.repeat(depth);
            }
          }

          result += currentTag;

          if (!isClosing && !selfClosing.includes(tagName) && !currentTag.endsWith('/>')) {
            depth++;
          }

          continue;
        }

        continue;
      }

      // Regular content
      if (/\s/.test(char)) {
        if (result && !result.endsWith(' ') && !result.endsWith('\n')) {
          result += ' ';
        }
        continue;
      }

      result += char;
    }

    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    result = result.replace(/\s+$/gm, '');

    return result.trim();
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
  window.codeFormatter = new CodeFormatter();
});

export default CodeFormatter;
