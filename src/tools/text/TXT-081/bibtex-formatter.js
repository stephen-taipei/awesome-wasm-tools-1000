/**
 * TXT-081: BibTeX Formatter
 *
 * Generates and formats BibTeX bibliography entries.
 */

class BibTeXFormatter {
  constructor() {
    this.fields = {
      article: ['author', 'title', 'journal', 'year', 'volume', 'number', 'pages', 'doi'],
      book: ['author', 'title', 'publisher', 'year', 'address', 'edition', 'isbn'],
      inproceedings: ['author', 'title', 'booktitle', 'year', 'pages', 'organization', 'address'],
      misc: ['author', 'title', 'howpublished', 'year', 'note', 'url'],
      phdthesis: ['author', 'title', 'school', 'year', 'address', 'month'],
      techreport: ['author', 'title', 'institution', 'year', 'number', 'address']
    };

    this.fieldLabels = {
      author: '作者',
      title: '標題',
      journal: '期刊',
      year: '年份',
      volume: '卷',
      number: '期',
      pages: '頁碼',
      doi: 'DOI',
      publisher: '出版社',
      address: '地址',
      edition: '版本',
      isbn: 'ISBN',
      booktitle: '會議/書名',
      organization: '組織',
      howpublished: '發布方式',
      note: '備註',
      url: 'URL',
      school: '學校',
      month: '月份',
      institution: '機構'
    };

    this.init();
  }

  init() {
    this.entryType = document.getElementById('entryType');
    this.formFields = document.getElementById('formFields');
    this.outputText = document.getElementById('outputText');
    this.generateBtn = document.getElementById('generateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.resultArea = document.getElementById('resultArea');
    this.statusMessage = document.getElementById('statusMessage');

    this.renderFields();
    this.bindEvents();
  }

  bindEvents() {
    this.entryType.addEventListener('change', () => this.renderFields());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  renderFields() {
    const type = this.entryType.value;
    const fields = this.fields[type];

    this.formFields.innerHTML = '';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.id = 'citekey';
    keyInput.className = 'text-input';
    keyInput.placeholder = '引用鍵 (例如: smith2023)';
    this.formFields.appendChild(keyInput);

    for (const field of fields) {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = field;
      input.className = 'text-input';
      input.placeholder = this.fieldLabels[field] || field;
      this.formFields.appendChild(input);
    }
  }

  getData() {
    const data = {};
    const inputs = this.formFields.querySelectorAll('input');
    for (const input of inputs) {
      const value = input.value.trim();
      if (value) {
        data[input.id] = value;
      }
    }
    return data;
  }

  generate() {
    const data = this.getData();
    const type = this.entryType.value;

    if (!data.citekey) {
      this.showStatus('error', '請輸入引用鍵');
      return;
    }

    let bibtex = `@${type}{${data.citekey},\n`;

    const fields = this.fields[type];
    for (const field of fields) {
      if (data[field]) {
        const value = data[field];
        bibtex += `  ${field} = {${value}},\n`;
      }
    }

    bibtex = bibtex.slice(0, -2) + '\n}';

    this.outputText.value = bibtex;
    this.resultArea.style.display = 'block';
    this.showStatus('success', 'BibTeX 條目生成完成');
  }

  clear() {
    const inputs = this.formFields.querySelectorAll('input');
    for (const input of inputs) {
      input.value = '';
    }
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
  window.bibtexFormatter = new BibTeXFormatter();
});

export default BibTeXFormatter;
