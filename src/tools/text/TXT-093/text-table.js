/**
 * TXT-093: Text Table Generator
 *
 * Converts text data to table format.
 */

class TextTable {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.delimiter = document.getElementById('delimiter');
    this.tableStyle = document.getElementById('tableStyle');
    this.hasHeader = document.getElementById('hasHeader');
    this.convertBtn = document.getElementById('convertBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  convert() {
    const text = this.inputText.value;
    if (!text.trim()) {
      this.showStatus('error', '請輸入資料');
      return;
    }

    let delim = this.delimiter.value;
    if (delim === '\\t') delim = '\t';

    const rows = text.split('\n').filter(line => line.trim());
    const data = rows.map(row => row.split(delim).map(cell => cell.trim()));

    const style = this.tableStyle.value;
    const header = this.hasHeader.checked;

    let result;
    switch (style) {
      case 'ascii':
        result = this.generateAsciiTable(data, header);
        break;
      case 'markdown':
        result = this.generateMarkdownTable(data, header);
        break;
      case 'html':
        result = this.generateHtmlTable(data, header);
        break;
      case 'simple':
        result = this.generateSimpleTable(data);
        break;
    }

    this.outputText.textContent = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '轉換完成');
  }

  getColumnWidths(data) {
    const widths = [];
    for (const row of data) {
      for (let i = 0; i < row.length; i++) {
        widths[i] = Math.max(widths[i] || 0, row[i].length);
      }
    }
    return widths;
  }

  generateAsciiTable(data, hasHeader) {
    const widths = this.getColumnWidths(data);
    const separator = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';

    const lines = [separator];

    data.forEach((row, index) => {
      const cells = row.map((cell, i) => ` ${cell.padEnd(widths[i])} `);
      lines.push('|' + cells.join('|') + '|');

      if (index === 0 && hasHeader) {
        lines.push(separator.replace(/-/g, '='));
      } else if (index < data.length - 1) {
        lines.push(separator);
      }
    });

    lines.push(separator);
    return lines.join('\n');
  }

  generateMarkdownTable(data, hasHeader) {
    const widths = this.getColumnWidths(data);
    const lines = [];

    data.forEach((row, index) => {
      const cells = row.map((cell, i) => cell.padEnd(widths[i]));
      lines.push('| ' + cells.join(' | ') + ' |');

      if (index === 0 && hasHeader) {
        const separator = widths.map(w => '-'.repeat(w)).join(' | ');
        lines.push('| ' + separator + ' |');
      }
    });

    return lines.join('\n');
  }

  generateHtmlTable(data, hasHeader) {
    let html = '<table>\n';

    data.forEach((row, index) => {
      const tag = (index === 0 && hasHeader) ? 'th' : 'td';
      const rowHtml = row.map(cell => `    <${tag}>${this.escapeHtml(cell)}</${tag}>`).join('\n');

      if (index === 0 && hasHeader) {
        html += '  <thead>\n  <tr>\n' + rowHtml + '\n  </tr>\n  </thead>\n  <tbody>\n';
      } else {
        html += '  <tr>\n' + rowHtml + '\n  </tr>\n';
      }
    });

    if (hasHeader && data.length > 0) {
      html += '  </tbody>\n';
    }
    html += '</table>';

    return html;
  }

  generateSimpleTable(data) {
    const widths = this.getColumnWidths(data);
    return data.map(row =>
      row.map((cell, i) => cell.padEnd(widths[i])).join('  ')
    ).join('\n');
  }

  escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  clear() {
    this.inputText.value = '';
    this.outputText.textContent = '';
    this.resultArea.style.display = 'none';
  }

  async copy() {
    const text = this.outputText.textContent;
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
  window.textTable = new TextTable();
});

export default TextTable;
