/**
 * TXT-080: Bibliography Formatter
 *
 * Generates bibliography in APA, MLA, Chicago formats.
 */

class BibliographyFormatter {
  constructor() {
    this.fields = {
      book: [
        { id: 'author', label: '作者', placeholder: '姓, 名' },
        { id: 'title', label: '書名', placeholder: '書籍標題' },
        { id: 'publisher', label: '出版社', placeholder: '出版社名稱' },
        { id: 'year', label: '出版年份', placeholder: 'YYYY' },
        { id: 'city', label: '出版地點', placeholder: '城市' },
        { id: 'edition', label: '版本', placeholder: '第 X 版 (選填)' }
      ],
      journal: [
        { id: 'author', label: '作者', placeholder: '姓, 名' },
        { id: 'title', label: '文章標題', placeholder: '文章標題' },
        { id: 'journal', label: '期刊名稱', placeholder: '期刊名稱' },
        { id: 'volume', label: '卷', placeholder: '卷號' },
        { id: 'issue', label: '期', placeholder: '期號' },
        { id: 'pages', label: '頁碼', placeholder: '起始頁-結束頁' },
        { id: 'year', label: '年份', placeholder: 'YYYY' },
        { id: 'doi', label: 'DOI', placeholder: '10.xxxx/xxxxx (選填)' }
      ],
      website: [
        { id: 'author', label: '作者/組織', placeholder: '作者或組織名稱' },
        { id: 'title', label: '頁面標題', placeholder: '網頁標題' },
        { id: 'website', label: '網站名稱', placeholder: '網站名稱' },
        { id: 'url', label: 'URL', placeholder: 'https://...' },
        { id: 'year', label: '發布年份', placeholder: 'YYYY' },
        { id: 'accessed', label: '存取日期', placeholder: 'YYYY-MM-DD' }
      ]
    };

    this.init();
  }

  init() {
    this.sourceType = document.getElementById('sourceType');
    this.formFields = document.getElementById('formFields');
    this.styleSelect = document.getElementById('styleSelect');
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
    this.sourceType.addEventListener('change', () => this.renderFields());
    this.generateBtn.addEventListener('click', () => this.generate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copy());
  }

  renderFields() {
    const type = this.sourceType.value;
    const fields = this.fields[type];

    this.formFields.innerHTML = '';
    for (const field of fields) {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = field.id;
      input.className = 'text-input';
      input.placeholder = field.placeholder;
      input.setAttribute('data-label', field.label);
      this.formFields.appendChild(input);
    }
  }

  getData() {
    const data = {};
    const inputs = this.formFields.querySelectorAll('input');
    for (const input of inputs) {
      data[input.id] = input.value.trim();
    }
    return data;
  }

  generate() {
    const data = this.getData();
    const type = this.sourceType.value;
    const style = this.styleSelect.value;

    if (!data.author && !data.title) {
      this.showStatus('error', '請至少填寫作者或標題');
      return;
    }

    let result;
    switch (style) {
      case 'apa':
        result = this.formatAPA(type, data);
        break;
      case 'mla':
        result = this.formatMLA(type, data);
        break;
      case 'chicago':
        result = this.formatChicago(type, data);
        break;
      case 'harvard':
        result = this.formatHarvard(type, data);
        break;
    }

    this.outputText.innerHTML = result;
    this.resultArea.style.display = 'block';
    this.showStatus('success', '參考文獻生成完成');
  }

  formatAPA(type, data) {
    if (type === 'book') {
      let ref = `${data.author || 'Author'} (${data.year || 'n.d.'}). `;
      ref += `<em>${data.title || 'Title'}</em>`;
      if (data.edition) ref += ` (${data.edition})`;
      ref += `. ${data.publisher || 'Publisher'}.`;
      return ref;
    } else if (type === 'journal') {
      let ref = `${data.author || 'Author'} (${data.year || 'n.d.'}). `;
      ref += `${data.title || 'Title'}. `;
      ref += `<em>${data.journal || 'Journal'}</em>`;
      if (data.volume) ref += `, <em>${data.volume}</em>`;
      if (data.issue) ref += `(${data.issue})`;
      if (data.pages) ref += `, ${data.pages}`;
      ref += '.';
      if (data.doi) ref += ` https://doi.org/${data.doi}`;
      return ref;
    } else {
      let ref = `${data.author || data.website || 'Author'} (${data.year || 'n.d.'}). `;
      ref += `<em>${data.title || 'Title'}</em>. `;
      if (data.website) ref += `${data.website}. `;
      ref += `${data.url || 'URL'}`;
      return ref;
    }
  }

  formatMLA(type, data) {
    if (type === 'book') {
      let ref = `${data.author || 'Author'}. `;
      ref += `<em>${data.title || 'Title'}</em>. `;
      if (data.edition) ref += `${data.edition}, `;
      ref += `${data.publisher || 'Publisher'}, ${data.year || 'Year'}.`;
      return ref;
    } else if (type === 'journal') {
      let ref = `${data.author || 'Author'}. `;
      ref += `"${data.title || 'Title'}." `;
      ref += `<em>${data.journal || 'Journal'}</em>`;
      if (data.volume) ref += `, vol. ${data.volume}`;
      if (data.issue) ref += `, no. ${data.issue}`;
      if (data.year) ref += `, ${data.year}`;
      if (data.pages) ref += `, pp. ${data.pages}`;
      ref += '.';
      return ref;
    } else {
      let ref = `${data.author || 'Author'}. `;
      ref += `"${data.title || 'Title'}." `;
      ref += `<em>${data.website || 'Website'}</em>, `;
      if (data.year) ref += `${data.year}, `;
      ref += `${data.url || 'URL'}`;
      if (data.accessed) ref += `. Accessed ${data.accessed}`;
      ref += '.';
      return ref;
    }
  }

  formatChicago(type, data) {
    if (type === 'book') {
      let ref = `${data.author || 'Author'}. `;
      ref += `<em>${data.title || 'Title'}</em>. `;
      if (data.city) ref += `${data.city}: `;
      ref += `${data.publisher || 'Publisher'}, ${data.year || 'Year'}.`;
      return ref;
    } else if (type === 'journal') {
      let ref = `${data.author || 'Author'}. `;
      ref += `"${data.title || 'Title'}." `;
      ref += `<em>${data.journal || 'Journal'}</em> `;
      if (data.volume) ref += `${data.volume}`;
      if (data.issue) ref += `, no. ${data.issue}`;
      if (data.year) ref += ` (${data.year})`;
      if (data.pages) ref += `: ${data.pages}`;
      ref += '.';
      return ref;
    } else {
      let ref = `${data.author || 'Author'}. `;
      ref += `"${data.title || 'Title'}." `;
      ref += `${data.website || 'Website'}. `;
      if (data.year) ref += `${data.year}. `;
      ref += `${data.url || 'URL'}.`;
      return ref;
    }
  }

  formatHarvard(type, data) {
    if (type === 'book') {
      let ref = `${data.author || 'Author'} (${data.year || 'Year'}) `;
      ref += `<em>${data.title || 'Title'}</em>. `;
      if (data.edition) ref += `${data.edition}. `;
      if (data.city) ref += `${data.city}: `;
      ref += `${data.publisher || 'Publisher'}.`;
      return ref;
    } else if (type === 'journal') {
      let ref = `${data.author || 'Author'} (${data.year || 'Year'}) `;
      ref += `'${data.title || 'Title'}', `;
      ref += `<em>${data.journal || 'Journal'}</em>`;
      if (data.volume) ref += `, ${data.volume}`;
      if (data.issue) ref += `(${data.issue})`;
      if (data.pages) ref += `, pp. ${data.pages}`;
      ref += '.';
      return ref;
    } else {
      let ref = `${data.author || data.website || 'Author'} (${data.year || 'Year'}) `;
      ref += `<em>${data.title || 'Title'}</em>. `;
      ref += `Available at: ${data.url || 'URL'}`;
      if (data.accessed) ref += ` (Accessed: ${data.accessed})`;
      ref += '.';
      return ref;
    }
  }

  clear() {
    const inputs = this.formFields.querySelectorAll('input');
    for (const input of inputs) {
      input.value = '';
    }
    this.outputText.innerHTML = '';
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
  window.bibliographyFormatter = new BibliographyFormatter();
});

export default BibliographyFormatter;
