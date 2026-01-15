/**
 * PDF-017: PDF to HTML Converter
 *
 * Converts PDF documents to HTML format by extracting text content.
 */

class PDFToHTML {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.htmlContent = '';
    this.init();
  }

  init() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.outputMode = document.getElementById('outputMode');
    this.fileInfo = document.getElementById('fileInfo');
    this.previewArea = document.getElementById('previewArea');
    this.htmlPreview = document.getElementById('htmlPreview');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.processFile(e.dataTransfer.files[0]);
    });

    this.processBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files[0]) this.processFile(event.target.files[0]);
  }

  async processFile(file) {
    if (file.type !== 'application/pdf') {
      this.showStatus('error', '請選擇 PDF 文件');
      return;
    }

    this.file = file;
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      this.fileInfo.textContent = `${file.name} (${this.pdfDoc.numPages} 頁)`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  async convert() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const numPages = this.pdfDoc.numPages;
      const mode = this.outputMode.value;
      const pages = [];

      for (let i = 1; i <= numPages; i++) {
        this.updateProgress((i / numPages) * 80, `處理第 ${i} 頁...`);

        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items.map(item => item.str).join(' ');
        pages.push({ pageNum: i, text: pageText });
      }

      this.updateProgress(90, '生成 HTML...');

      if (mode === 'structured') {
        this.htmlContent = this.generateStructuredHTML(pages);
      } else {
        this.htmlContent = this.generateSimpleHTML(pages);
      }

      // Show preview
      this.htmlPreview.innerHTML = this.htmlContent;
      this.previewArea.style.display = 'block';

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '轉換完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Convert error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }

  generateStructuredHTML(pages) {
    const fileName = this.file.name.replace(/\.pdf$/i, '');

    let html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(fileName)}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    .page { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .page-header { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    .page-content { text-align: justify; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(fileName)}</h1>
`;

    pages.forEach(page => {
      html += `  <div class="page">
    <div class="page-header">第 ${page.pageNum} 頁</div>
    <div class="page-content">${this.escapeHtml(page.text)}</div>
  </div>\n`;
    });

    html += `</body>
</html>`;

    return html;
  }

  generateSimpleHTML(pages) {
    const text = pages.map(p => p.text).join('\n\n');
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>PDF Content</title></head>
<body><pre>${this.escapeHtml(text)}</pre></body>
</html>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  download() {
    if (!this.htmlContent) return;

    const fileName = this.file.name.replace(/\.pdf$/i, '');
    const blob = new Blob([this.htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.htmlContent = '';
    this.fileInput.value = '';
    this.htmlPreview.innerHTML = '';
    this.previewArea.style.display = 'none';
    this.settingsPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.processBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
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
  window.pdfToHtml = new PDFToHTML();
});

export default PDFToHTML;
