/**
 * TXT-047: Code Minifier
 *
 * Minifies JavaScript, CSS, and HTML code.
 */

class CodeMinifier {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.language = document.getElementById('language');
    this.removeComments = document.getElementById('removeComments');
    this.minifyBtn = document.getElementById('minifyBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.originalSize = document.getElementById('originalSize');
    this.minifiedSize = document.getElementById('minifiedSize');
    this.savings = document.getElementById('savings');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.minifyBtn.addEventListener('click', () => this.minify());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  minify() {
    const code = this.inputText.value;
    if (!code.trim()) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const lang = this.language.value;
    const stripComments = this.removeComments.checked;
    let minified = '';

    try {
      switch (lang) {
        case 'javascript':
          minified = this.minifyJavaScript(code, stripComments);
          break;
        case 'css':
          minified = this.minifyCSS(code, stripComments);
          break;
        case 'html':
          minified = this.minifyHTML(code, stripComments);
          break;
      }

      this.outputText.textContent = minified;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';

      // Calculate stats
      const origBytes = new Blob([code]).size;
      const minBytes = new Blob([minified]).size;
      const saved = origBytes > 0 ? ((1 - minBytes / origBytes) * 100).toFixed(1) : 0;

      this.originalSize.textContent = origBytes;
      this.minifiedSize.textContent = minBytes;
      this.savings.textContent = `${saved}%`;

      this.showStatus('success', '壓縮成功');
    } catch (e) {
      this.showStatus('error', `壓縮錯誤: ${e.message}`);
    }
  }

  minifyJavaScript(code, stripComments) {
    let result = code;

    // Remove comments if requested
    if (stripComments) {
      // Remove single-line comments (but not URLs)
      result = result.replace(/(?<!:)\/\/.*$/gm, '');
      // Remove multi-line comments
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    // Process character by character to handle strings properly
    let output = '';
    let inString = false;
    let stringChar = '';
    let lastChar = '';

    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      const prevChar = result[i - 1] || '';

      // Handle strings
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        output += char;
        continue;
      }

      if (inString) {
        output += char;
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
        continue;
      }

      // Handle whitespace outside strings
      if (/\s/.test(char)) {
        // Keep one space if needed for syntax
        if (output && /[a-zA-Z0-9_$]/.test(lastChar) && /[a-zA-Z0-9_$]/.test(result[i + 1] || '')) {
          output += ' ';
          lastChar = ' ';
        }
        continue;
      }

      output += char;
      lastChar = char;
    }

    // Remove spaces around operators
    output = output.replace(/\s*([+\-*/%=<>!&|^~?:,;{}()\[\]])\s*/g, '$1');

    // Add back necessary spaces
    output = output.replace(/([a-zA-Z0-9_$])(return|var|let|const|function|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|delete|void|throw|try|catch|finally|class|extends|import|export|from|as|default)([^a-zA-Z0-9_$])/g, '$1 $2$3');
    output = output.replace(/(return|var|let|const|function|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|delete|void|throw|try|catch|finally|class|extends|import|export|from|as|default)([a-zA-Z0-9_$])/g, '$1 $2');

    return output.trim();
  }

  minifyCSS(code, stripComments) {
    let result = code;

    // Remove comments
    if (stripComments) {
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    // Remove whitespace
    result = result.replace(/\s+/g, ' ');

    // Remove spaces around special characters
    result = result.replace(/\s*([{};:,>+~])\s*/g, '$1');

    // Remove trailing semicolons before closing braces
    result = result.replace(/;}/g, '}');

    // Remove leading/trailing spaces
    result = result.trim();

    return result;
  }

  minifyHTML(code, stripComments) {
    let result = code;

    // Remove HTML comments
    if (stripComments) {
      result = result.replace(/<!--[\s\S]*?-->/g, '');
    }

    // Preserve content in pre, script, style, and textarea tags
    const preserved = [];
    const preserveTags = ['pre', 'script', 'style', 'textarea'];

    for (const tag of preserveTags) {
      const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
      result = result.replace(regex, (match) => {
        preserved.push(match);
        return `__PRESERVED_${preserved.length - 1}__`;
      });
    }

    // Remove whitespace between tags
    result = result.replace(/>\s+</g, '><');

    // Collapse whitespace
    result = result.replace(/\s+/g, ' ');

    // Remove spaces around = in attributes
    result = result.replace(/\s*=\s*/g, '=');

    // Restore preserved content
    for (let i = 0; i < preserved.length; i++) {
      result = result.replace(`__PRESERVED_${i}__`, preserved[i]);
    }

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
  window.codeMinifier = new CodeMinifier();
});

export default CodeMinifier;
