/**
 * TXT-043: HTML to Markdown Converter
 *
 * Converts HTML to Markdown format.
 */

class HTMLToMarkdown {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
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

  parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return this.processNode(doc.body);
  }

  processNode(node) {
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(n => this.processNode(n)).join('');

    switch (tag) {
      case 'h1':
        return `# ${children.trim()}\n\n`;
      case 'h2':
        return `## ${children.trim()}\n\n`;
      case 'h3':
        return `### ${children.trim()}\n\n`;
      case 'h4':
        return `#### ${children.trim()}\n\n`;
      case 'h5':
        return `##### ${children.trim()}\n\n`;
      case 'h6':
        return `###### ${children.trim()}\n\n`;

      case 'p':
        return `${children.trim()}\n\n`;

      case 'br':
        return '\n';

      case 'hr':
        return '---\n\n';

      case 'strong':
      case 'b':
        return `**${children}**`;

      case 'em':
      case 'i':
        return `*${children}*`;

      case 'del':
      case 's':
      case 'strike':
        return `~~${children}~~`;

      case 'code':
        if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') {
          return children;
        }
        return `\`${children}\``;

      case 'pre':
        const codeNode = node.querySelector('code');
        const lang = codeNode ? (codeNode.className.match(/language-(\w+)/) || [])[1] || '' : '';
        const codeContent = codeNode ? codeNode.textContent : children;
        return `\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`;

      case 'blockquote':
        return children.split('\n').filter(l => l.trim()).map(l => `> ${l}`).join('\n') + '\n\n';

      case 'a':
        const href = node.getAttribute('href') || '';
        return `[${children}](${href})`;

      case 'img':
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        return `![${alt}](${src})`;

      case 'ul':
        return this.processList(node, false) + '\n';

      case 'ol':
        return this.processList(node, true) + '\n';

      case 'li':
        return children.trim();

      case 'table':
        return this.processTable(node) + '\n';

      case 'div':
      case 'span':
      case 'body':
        return children;

      default:
        return children;
    }
  }

  processList(node, ordered) {
    const items = Array.from(node.children).filter(n => n.tagName.toLowerCase() === 'li');
    return items.map((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : '- ';
      const content = this.processNode(item);
      return prefix + content;
    }).join('\n');
  }

  processTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result = [];
    let headerProcessed = false;

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const isHeader = cells.some(c => c.tagName.toLowerCase() === 'th');

      const rowContent = cells.map(cell => this.processNode(cell).trim()).join(' | ');
      result.push(`| ${rowContent} |`);

      if (isHeader && !headerProcessed) {
        const separator = cells.map(() => '---').join(' | ');
        result.push(`| ${separator} |`);
        headerProcessed = true;
      }
    }

    return result.join('\n');
  }

  convert() {
    const html = this.inputText.value;
    if (!html.trim()) {
      this.showStatus('error', '請輸入 HTML');
      return;
    }

    try {
      let md = this.parseHTML(html);

      // Clean up extra newlines
      md = md.replace(/\n{3,}/g, '\n\n').trim();

      this.outputText.textContent = md;
      this.resultArea.style.display = 'block';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `轉換錯誤: ${e.message}`);
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
  window.htmlToMd = new HTMLToMarkdown();
});

export default HTMLToMarkdown;
