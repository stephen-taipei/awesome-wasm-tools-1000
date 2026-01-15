/**
 * TXT-040: JSON to CSV Converter
 *
 * Converts JSON format to CSV format.
 */

class JSONToCSV {
  constructor() {
    this.init();
  }

  init() {
    this.inputText = document.getElementById('inputText');
    this.outputText = document.getElementById('outputText');
    this.delimiter = document.getElementById('delimiter');
    this.includeHeader = document.getElementById('includeHeader');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.copyBtn.addEventListener('click', () => this.copy());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  escapeCSV(value, delimiter) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  convert() {
    const input = this.inputText.value.trim();
    if (!input) {
      this.showStatus('error', '請輸入 JSON');
      return;
    }

    const delim = this.delimiter.value === '\\t' ? '\t' : this.delimiter.value;
    const withHeader = this.includeHeader.checked;

    try {
      let data = JSON.parse(input);

      // Handle non-array JSON
      if (!Array.isArray(data)) {
        if (typeof data === 'object' && data !== null) {
          data = [data];
        } else {
          this.showStatus('error', 'JSON 必須是陣列或物件');
          return;
        }
      }

      if (data.length === 0) {
        this.showStatus('error', 'JSON 陣列為空');
        return;
      }

      // Flatten nested objects
      const flatData = data.map(item => this.flattenObject(item));

      // Get all unique headers
      const headers = new Set();
      for (const item of flatData) {
        for (const key of Object.keys(item)) {
          headers.add(key);
        }
      }
      const headerArray = Array.from(headers);

      // Build CSV
      const lines = [];

      if (withHeader) {
        lines.push(headerArray.map(h => this.escapeCSV(h, delim)).join(delim));
      }

      for (const item of flatData) {
        const row = headerArray.map(header => this.escapeCSV(item[header], delim));
        lines.push(row.join(delim));
      }

      this.outputText.textContent = lines.join('\n');
      this.resultArea.style.display = 'block';
      this.downloadBtn.style.display = 'inline-flex';
      this.copyBtn.style.display = 'inline-flex';
      this.showStatus('success', '轉換成功');
    } catch (e) {
      this.showStatus('error', `JSON 解析錯誤: ${e.message}`);
    }
  }

  download() {
    const csv = this.outputText.textContent;
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.csv';
    link.click();
    URL.revokeObjectURL(link.href);
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
    this.downloadBtn.style.display = 'none';
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
  window.jsonToCsv = new JSONToCSV();
});

export default JSONToCSV;
