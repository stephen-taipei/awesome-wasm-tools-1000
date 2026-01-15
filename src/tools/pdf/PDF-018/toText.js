/**
 * PDF-018: PDF to Text Converter
 *
 * Extracts plain text content from PDF documents.
 */

class PDFToText {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.textContent = '';
    this.init();
  }

  init() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.separator = document.getElementById('separator');
    this.fileInfo = document.getElementById('fileInfo');
    this.previewArea = document.getElementById('previewArea');
    this.textPreview = document.getElementById('textPreview');
    this.copyBtn = document.getElementById('copyBtn');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.charCount = document.getElementById('charCount');

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

    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.processBtn.addEventListener('click', () => this.extract());
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

  async extract() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const numPages = this.pdfDoc.numPages;
      const separatorType = this.separator.value;
      const pages = [];

      for (let i = 1; i <= numPages; i++) {
        this.updateProgress((i / numPages) * 80, `提取第 ${i} 頁...`);

        const page = await this.pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items.map(item => item.str).join(' ');
        pages.push(pageText);
      }

      this.updateProgress(90, '整理文字...');

      // Join pages based on separator setting
      switch (separatorType) {
        case 'page':
          this.textContent = pages.map((text, i) =>
            `=== 第 ${i + 1} 頁 ===\n${text}`
          ).join('\n\n');
          break;
        case 'line':
          this.textContent = pages.join('\n\n');
          break;
        case 'none':
          this.textContent = pages.join(' ');
          break;
      }

      // Show preview
      this.textPreview.value = this.textContent;
      this.previewArea.style.display = 'block';

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.charCount.textContent = `${this.textContent.length.toLocaleString()} 字元`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '提取完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '文字提取完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Extract error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '提取失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.textContent);
      this.showStatus('success', '已複製到剪貼簿！');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  download() {
    if (!this.textContent) return;

    const fileName = this.file.name.replace(/\.pdf$/i, '');
    const blob = new Blob([this.textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.textContent = '';
    this.fileInput.value = '';
    this.textPreview.value = '';
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
  window.pdfToText = new PDFToText();
});

export default PDFToText;
