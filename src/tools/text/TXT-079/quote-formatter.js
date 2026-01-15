/**
 * TXT-079: Quote Formatter
 *
 * Formats text quotes in various citation styles.
 */

class QuoteFormatter {
  constructor() {
    this.init();
  }

  init() {
    this.quoteText = document.getElementById('quoteText');
    this.author = document.getElementById('author');
    this.title = document.getElementById('title');
    this.year = document.getElementById('year');
    this.page = document.getElementById('page');
    this.url = document.getElementById('url');
    this.styleSelect = document.getElementById('styleSelect');
    this.outputText = document.getElementById('outputText');
    this.formatBtn = document.getElementById('formatBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.formatBtn.addEventListener('click', () => this.format());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  format() {
    const quote = this.quoteText.value.trim();
    if (!quote) {
      this.showStatus('error', '請輸入引用文字');
      return;
    }

    const info = {
      author: this.author.value.trim(),
      title: this.title.value.trim(),
      year: this.year.value.trim(),
      page: this.page.value.trim(),
      url: this.url.value.trim()
    };

    const style = this.styleSelect.value;
    let result;

    switch (style) {
      case 'block':
        result = this.formatBlock(quote, info);
        break;
      case 'inline':
        result = this.formatInline(quote, info);
        break;
      case 'markdown':
        result = this.formatMarkdown(quote, info);
        break;
      case 'html':
        result = this.formatHTML(quote, info);
        break;
      case 'latex':
        result = this.formatLaTeX(quote, info);
        break;
    }

    this.outputText.value = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '格式化完成');
  }

  formatBlock(quote, info) {
    let result = `「${quote}」\n\n`;
    if (info.author || info.title || info.year) {
      result += '——';
      if (info.author) result += info.author;
      if (info.title) result += `《${info.title}》`;
      if (info.year) result += ` (${info.year})`;
      if (info.page) result += `, 第 ${info.page} 頁`;
    }
    return result;
  }

  formatInline(quote, info) {
    let citation = '';
    if (info.author) citation += info.author;
    if (info.year) citation += ` (${info.year})`;
    if (info.page) citation += `, p. ${info.page}`;

    if (citation) {
      return `"${quote}" (${citation})`;
    }
    return `"${quote}"`;
  }

  formatMarkdown(quote, info) {
    let result = `> ${quote.split('\n').join('\n> ')}\n`;
    if (info.author || info.title) {
      result += '>\n> —';
      if (info.author) result += ` ${info.author}`;
      if (info.title) result += `, *${info.title}*`;
      if (info.year) result += ` (${info.year})`;
    }
    if (info.url) {
      result += `\n\n[Source](${info.url})`;
    }
    return result;
  }

  formatHTML(quote, info) {
    let result = `<blockquote>\n  <p>${this.escapeHtml(quote)}</p>\n`;
    if (info.author || info.title) {
      result += '  <footer>\n    ';
      if (info.author) result += `<cite>${this.escapeHtml(info.author)}</cite>`;
      if (info.title) result += `, <em>${this.escapeHtml(info.title)}</em>`;
      if (info.year) result += ` (${info.year})`;
      result += '\n  </footer>\n';
    }
    result += '</blockquote>';
    return result;
  }

  formatLaTeX(quote, info) {
    let result = `\\begin{quote}\n  ${quote}\n`;
    if (info.author || info.title) {
      result += '  \\par\\raggedleft---';
      if (info.author) result += info.author;
      if (info.title) result += `, \\textit{${info.title}}`;
      if (info.year) result += ` (${info.year})`;
      result += '\n';
    }
    result += '\\end{quote}';
    return result;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  clear() {
    this.quoteText.value = '';
    this.author.value = '';
    this.title.value = '';
    this.year.value = '';
    this.page.value = '';
    this.url.value = '';
    this.outputText.value = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('success', '已複製到剪貼簿');
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
  window.quoteFormatter = new QuoteFormatter();
});

export default QuoteFormatter;
