/**
 * PDF-010: PDF to Word Converter
 *
 * Converts PDF files to Word documents by extracting text content.
 */

class PDFToWord {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.outputBlob = null;
    this.init();
  }

  init() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.outputFormat = document.getElementById('outputFormat');
    this.preserveFormatting = document.getElementById('preserveFormatting');
    this.fileInfo = document.getElementById('fileInfo');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.textLength = document.getElementById('textLength');

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
      const pageCount = this.pdfDoc.numPages;

      this.fileInfo.textContent = `${file.name} (${pageCount} 頁)`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  async extractText() {
    const pages = [];
    const numPages = this.pdfDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
      this.updateProgress((i / numPages) * 60, `提取第 ${i} 頁文字...`);

      const page = await this.pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pages.push({
        pageNum: i,
        text: pageText
      });
    }

    return pages;
  }

  async convert() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const pages = await this.extractText();
      const format = this.outputFormat.value;

      this.updateProgress(70, '生成文檔...');

      if (format === 'docx') {
        await this.createDocx(pages);
      } else {
        this.createRtf(pages);
      }

      const totalText = pages.reduce((acc, p) => acc + p.text.length, 0);
      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.textLength.textContent = `${totalText.toLocaleString()} 字元`;
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

  async createDocx(pages) {
    const { Document, Packer, Paragraph, TextRun, PageBreak } = docx;

    const children = [];

    pages.forEach((page, index) => {
      // Add page number header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `第 ${page.pageNum} 頁`,
              bold: true,
              size: 24
            })
          ]
        })
      );

      // Add page text
      const paragraphs = page.text.split(/\n+/).filter(p => p.trim());
      paragraphs.forEach(para => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para, size: 22 })]
          })
        );
      });

      // Add empty paragraph for spacing
      if (page.text.trim()) {
        children.push(new Paragraph({ children: [] }));
      }

      // Add page break except for last page
      if (index < pages.length - 1) {
        children.push(
          new Paragraph({
            children: [new PageBreak()]
          })
        );
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    this.outputBlob = await Packer.toBlob(doc);
    this.outputFormat.ext = 'docx';
  }

  createRtf(pages) {
    let rtfContent = '{\\rtf1\\ansi\\deff0\n';
    rtfContent += '{\\fonttbl{\\f0 Arial;}}\n';
    rtfContent += '\\f0\\fs22\n';

    pages.forEach((page, index) => {
      // Page header
      rtfContent += `\\b 第 ${page.pageNum} 頁\\b0\\par\\par\n`;

      // Page text
      const escapedText = page.text
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, '\\par\n');

      rtfContent += escapedText + '\\par\\par\n';

      // Page break
      if (index < pages.length - 1) {
        rtfContent += '\\page\n';
      }
    });

    rtfContent += '}';

    this.outputBlob = new Blob([rtfContent], { type: 'application/rtf' });
    this.outputFormat.ext = 'rtf';
  }

  download() {
    if (!this.outputBlob) return;

    const format = this.outputFormat.value;
    const originalName = this.file.name.replace(/\.pdf$/i, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${originalName}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.outputBlob = null;
    this.fileInput.value = '';
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
  window.pdfToWord = new PDFToWord();
});

export default PDFToWord;
