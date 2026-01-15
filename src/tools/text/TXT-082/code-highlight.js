/**
 * TXT-082: Code Syntax Highlighter
 *
 * Adds syntax highlighting to code.
 */

class CodeHighlighter {
  constructor() {
    this.patterns = {
      javascript: {
        keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|async|await|try|catch|finally|throw|typeof|instanceof)\b/g,
        strings: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        numbers: /\b(\d+\.?\d*)\b/g,
        functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g
      },
      python: {
        keywords: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|True|False|None|pass|break|continue|raise|global|nonlocal|assert)\b/g,
        strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g,
        comments: /(#.*$)/gm,
        numbers: /\b(\d+\.?\d*)\b/g,
        functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g
      },
      html: {
        tags: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g,
        attributes: /\s([a-zA-Z-]+)(?==)/g,
        strings: /(".*?"|'.*?')/g,
        comments: /(&lt;!--[\s\S]*?--&gt;)/g
      },
      css: {
        selectors: /([.#]?[a-zA-Z_][\w-]*)\s*(?={)/g,
        properties: /([a-zA-Z-]+)\s*(?=:)/g,
        values: /:\s*([^;]+)/g,
        comments: /(\/\*[\s\S]*?\*\/)/g
      },
      java: {
        keywords: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|import|package|void|int|long|double|float|boolean|char|byte|short|String|null|true|false|this|super)\b/g,
        strings: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        numbers: /\b(\d+\.?\d*[fFdDlL]?)\b/g,
        functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g
      },
      cpp: {
        keywords: /\b(int|long|double|float|char|void|bool|class|struct|public|private|protected|virtual|static|const|return|if|else|for|while|do|switch|case|break|continue|new|delete|try|catch|throw|namespace|using|include|define|typedef|sizeof|nullptr|true|false|this|template|typename)\b/g,
        strings: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g,
        comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        numbers: /\b(\d+\.?\d*[fFlL]?)\b/g,
        preprocessor: /(#\w+)/g
      },
      sql: {
        keywords: /\b(SELECT|FROM|WHERE|AND|OR|NOT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|NULL|IS|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN)\b/gi,
        strings: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g,
        comments: /(--.*$|\/\*[\s\S]*?\*\/)/gm,
        numbers: /\b(\d+\.?\d*)\b/g
      },
      json: {
        keys: /("[\w-]+")\s*(?=:)/g,
        strings: /(:\s*"[^"]*")/g,
        numbers: /:\s*(-?\d+\.?\d*)/g,
        booleans: /:\s*(true|false|null)/g
      }
    };

    this.init();
  }

  init() {
    this.inputCode = document.getElementById('inputCode');
    this.outputCode = document.getElementById('outputCode');
    this.langSelect = document.getElementById('langSelect');
    this.themeSelect = document.getElementById('themeSelect');
    this.highlightBtn = document.getElementById('highlightBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyHtmlBtn = document.getElementById('copyHtmlBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.highlightBtn.addEventListener('click', () => this.highlight());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyHtmlBtn.addEventListener('click', () => this.copyHtml());
    this.themeSelect.addEventListener('change', () => this.updateTheme());
  }

  highlight() {
    const code = this.inputCode.value;
    if (!code) {
      this.showStatus('error', '請輸入程式碼');
      return;
    }

    const lang = this.langSelect.value;
    const highlighted = this.highlightCode(code, lang);

    this.outputCode.innerHTML = highlighted;
    this.updateTheme();
    this.resultArea.style.display = 'block';
    this.showStatus('success', '程式碼高亮完成');
  }

  highlightCode(code, lang) {
    let result = this.escapeHtml(code);
    const patterns = this.patterns[lang];

    if (!patterns) return result;

    if (patterns.comments) {
      result = result.replace(patterns.comments, '<span class="hl-comment">$1</span>');
    }
    if (patterns.strings) {
      result = result.replace(patterns.strings, '<span class="hl-string">$1</span>');
    }
    if (patterns.keywords) {
      result = result.replace(patterns.keywords, '<span class="hl-keyword">$1</span>');
    }
    if (patterns.numbers) {
      result = result.replace(patterns.numbers, '<span class="hl-number">$1</span>');
    }
    if (patterns.functions) {
      result = result.replace(patterns.functions, '<span class="hl-function">$1</span>');
    }
    if (patterns.preprocessor) {
      result = result.replace(patterns.preprocessor, '<span class="hl-preprocessor">$1</span>');
    }
    if (patterns.tags) {
      result = result.replace(patterns.tags, '<span class="hl-tag">$1</span>');
    }
    if (patterns.attributes) {
      result = result.replace(patterns.attributes, ' <span class="hl-attr">$1</span>');
    }
    if (patterns.keys) {
      result = result.replace(patterns.keys, '<span class="hl-key">$1</span>');
    }
    if (patterns.booleans) {
      result = result.replace(patterns.booleans, ': <span class="hl-boolean">$1</span>');
    }

    return result;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  updateTheme() {
    const theme = this.themeSelect.value;
    this.outputCode.className = `highlighted-code theme-${theme}`;
  }

  clear() {
    this.inputCode.value = '';
    this.outputCode.innerHTML = '';
    this.resultArea.style.display = 'none';
  }

  async copyHtml() {
    const html = this.outputCode.innerHTML;
    if (!html) return;

    try {
      await navigator.clipboard.writeText(html);
      this.showStatus('success', 'HTML 已複製到剪貼簿');
    } catch (err) {
      this.showStatus('error', '複製失敗');
    }
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
  window.codeHighlighter = new CodeHighlighter();
});

export default CodeHighlighter;
