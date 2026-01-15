/**
 * TXT-044: Table Generator
 *
 * Generates tables in Markdown, HTML, CSV, TSV formats.
 */

class TableGenerator {
  constructor() {
    this.init();
  }

  init() {
    this.rowsInput = document.getElementById('rows');
    this.columnsInput = document.getElementById('columns');
    this.outputFormat = document.getElementById('outputFormat');
    this.includeHeader = document.getElementById('includeHeader');
    this.createBtn = document.getElementById('createBtn');
    this.generateBtn = document.getElementById('generateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.editorArea = document.getElementById('editorArea');
    this.tableEditor = document.getElementById('tableEditor');
    this.resultArea = document.getElementById('resultArea');
    this.outputText = document.getElementById('outputText');
    this.statusMessage = document.getElementById('statusMessage');

    this.tableData = [];

    this.bindEvents();
  }

  bindEvents() {
    this.createBtn.addEventListener('click', () => this.createTable());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  createTable() {
    const rows = parseInt(this.rowsInput.value) || 3;
    const cols = parseInt(this.columnsInput.value) || 3;

    if (rows < 1 || rows > 50 || cols < 1 || cols > 20) {
      this.showStatus('error', '列數需在 1-50 之間，欄數需在 1-20 之間');
      return;
    }

    // Initialize table data
    this.tableData = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push(i === 0 && this.includeHeader.checked ? `標題 ${j + 1}` : '');
      }
      this.tableData.push(row);
    }

    this.renderEditor();
    this.editorArea.style.display = 'block';
    this.resultArea.style.display = 'none';
  }

  renderEditor() {
    const table = document.createElement('table');
    table.className = 'editable-table';

    for (let i = 0; i < this.tableData.length; i++) {
      const tr = document.createElement('tr');

      for (let j = 0; j < this.tableData[i].length; j++) {
        const td = document.createElement(i === 0 && this.includeHeader.checked ? 'th' : 'td');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.tableData[i][j];
        input.dataset.row = i;
        input.dataset.col = j;
        input.addEventListener('input', (e) => {
          this.tableData[i][j] = e.target.value;
        });
        td.appendChild(input);
        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    this.tableEditor.innerHTML = '';
    this.tableEditor.appendChild(table);
  }

  generate() {
    const format = this.outputFormat.value;
    let output = '';

    switch (format) {
      case 'markdown':
        output = this.generateMarkdown();
        break;
      case 'html':
        output = this.generateHTML();
        break;
      case 'csv':
        output = this.generateCSV(',');
        break;
      case 'tsv':
        output = this.generateCSV('\t');
        break;
    }

    this.outputText.textContent = output;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '表格生成成功');
  }

  generateMarkdown() {
    if (this.tableData.length === 0) return '';

    const lines = [];
    const hasHeader = this.includeHeader.checked;

    for (let i = 0; i < this.tableData.length; i++) {
      const row = this.tableData[i].map(cell => cell.replace(/\|/g, '\\|'));
      lines.push(`| ${row.join(' | ')} |`);

      // Add separator after header
      if (i === 0 && hasHeader) {
        const separator = this.tableData[i].map(() => '---');
        lines.push(`| ${separator.join(' | ')} |`);
      }
    }

    return lines.join('\n');
  }

  generateHTML() {
    const hasHeader = this.includeHeader.checked;
    const lines = ['<table>'];

    for (let i = 0; i < this.tableData.length; i++) {
      lines.push('  <tr>');
      const tag = i === 0 && hasHeader ? 'th' : 'td';

      for (const cell of this.tableData[i]) {
        const escaped = cell
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        lines.push(`    <${tag}>${escaped}</${tag}>`);
      }

      lines.push('  </tr>');
    }

    lines.push('</table>');
    return lines.join('\n');
  }

  generateCSV(delimiter) {
    return this.tableData.map(row => {
      return row.map(cell => {
        if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(delimiter);
    }).join('\n');
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.outputText.textContent);
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
  window.tableGen = new TableGenerator();
});

export default TableGenerator;
