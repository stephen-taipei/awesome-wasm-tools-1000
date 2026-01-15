/**
 * TXT-039: CSV to JSON Converter
 *
 * Converts CSV format to JSON format.
 */

class CSVToJSON {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.delimiter = document.getElementById('delimiter');
    this.outputFormat = document.getElementById('outputFormat');
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

  parseValue(str) {
    if (str === '') return null;
    if (str === 'true') return true;
    if (str === 'false') return false;
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    if (/^-?\d*\.\d+$/.test(str)) return parseFloat(str);
    return str;
  }

  convert() {
    const input = this.inputText.value;
    if (!input.trim()) {
      this.showStatus('error', '請輸入 CSV');
      return;
    }

    const delim = this.delimiter.value === '\\t' ? '\t' : this.delimiter.value;
    const format = this.outputFormat.value;

    const rows = this.parseCSV(input, delim);

    let result;

    if (format === 'arrays') {
      result = rows.map(row => row.map(cell => this.parseValue(cell)));
    } else {
      // Objects format - use first row as headers
      if (rows.length < 2) {
        this.showStatus('error', 'CSV 需要至少兩行 (標題和資料)');
        return;
      }

      const headers = rows[0];
      result = [];

      for (let i = 1; i < rows.length; i++) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = this.parseValue(rows[i][j] || '');
        }
        result.push(obj);
      }
    }

    this.outputText.textContent = JSON.stringify(result, null, 2);
    this.resultArea.style.display = 'block';
    this.copyBtn.style.display = 'inline-flex';
    this.showStatus('success', '轉換成功');
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
  window.csvToJson = new CSVToJSON();
});

export default CSVToJSON;
