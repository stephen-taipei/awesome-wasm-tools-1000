/**
 * TXT-038: CSV Formatter
 *
 * Formats and previews CSV data.
 */

class CSVFormatter {
  constructor() {
    this.parsedData = [];
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.delimiter = document.getElementById('delimiter');
    this.hasHeader = document.getElementById('hasHeader');
    this.previewBtn = document.getElementById('previewBtn');
    this.alignBtn = document.getElementById('alignBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.previewTable = document.getElementById('previewTable');
    this.alignedOutput = document.getElementById('alignedOutput');
    this.rowCount = document.getElementById('rowCount');
    this.colCount = document.getElementById('colCount');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.previewBtn.addEventListener('click', () => this.preview());
    this.alignBtn.addEventListener('click', () => this.align());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  parseCSV(csv, delimiter) {
    const lines = csv.trim().split('\n');
    const result = [];

    for (const line of lines) {
      const row = [];
      let cell = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          row.push(cell.trim());
          cell = '';
        } else {
          cell += char;
        }
      }
      row.push(cell.trim());
      result.push(row);
    }

    return result;
  }

  preview() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 CSV');
      return;
    }

    const delim = this.delimiter.value === '\\t' ? '\t' : this.delimiter.value;
    this.parsedData = this.parseCSV(input, delim);

    const headerRow = this.hasHeader.checked;
    const numCols = Math.max(...this.parsedData.map(row => row.length));

    let html = '';

    if (headerRow && this.parsedData.length > 0) {
      html += '<thead><tr>';
      for (let i = 0; i < numCols; i++) {
        html += `<th>${this.escapeHtml(this.parsedData[0][i] || '')}</th>`;
      }
      html += '</tr></thead>';
    }

    html += '<tbody>';
    const startRow = headerRow ? 1 : 0;
    for (let r = startRow; r < this.parsedData.length; r++) {
      html += '<tr>';
      for (let c = 0; c < numCols; c++) {
        html += `<td>${this.escapeHtml(this.parsedData[r][c] || '')}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    this.previewTable.innerHTML = html;
    this.rowCount.textContent = this.parsedData.length;
    this.colCount.textContent = numCols;
    this.alignedOutput.style.display = 'none';

    this.resultArea.style.display = 'block';
  }

  align() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 CSV');
      return;
    }

    const delim = this.delimiter.value === '\\t' ? '\t' : this.delimiter.value;
    this.parsedData = this.parseCSV(input, delim);

    // Find max width for each column
    const numCols = Math.max(...this.parsedData.map(row => row.length));
    const colWidths = [];

    for (let c = 0; c < numCols; c++) {
      let maxWidth = 0;
      for (const row of this.parsedData) {
        const cell = row[c] || '';
        maxWidth = Math.max(maxWidth, cell.length);
      }
      colWidths.push(maxWidth);
    }

    // Build aligned CSV
    const aligned = this.parsedData.map(row => {
      const paddedCells = [];
      for (let c = 0; c < numCols; c++) {
        const cell = row[c] || '';
        paddedCells.push(cell.padEnd(colWidths[c]));
      }
      return paddedCells.join(delim === '\t' ? '\t' : delim + ' ');
    }).join('\n');

    this.outputText.textContent = aligned;
    this.preview();
    this.alignedOutput.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', '對齊完成');
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
    this.previewTable.innerHTML = '';
    this.resultArea.style.display = 'none';
    this.copyBtn.style.display = 'none';
    this.parsedData = [];
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
  window.csvFormatter = new CSVFormatter();
});

export default CSVFormatter;
