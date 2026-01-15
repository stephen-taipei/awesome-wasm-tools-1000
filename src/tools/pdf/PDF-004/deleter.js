/**
 * PDF-004: PDF Page Deleter
 *
 * Deletes specific pages from a PDF document.
 */

class PDFDeleter {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.outputBytes = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.totalPagesEl = document.getElementById('totalPages');
    this.pageSelection = document.getElementById('pageSelection');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.deletedPages = document.getElementById('deletedPages');
    this.remainingPages = document.getElementById('remainingPages');

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

    this.processBtn.addEventListener('click', () => this.deletePages());
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
      this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const pageCount = this.pdfDoc.getPageCount();

      this.totalPagesEl.textContent = `${pageCount} 頁`;
      this.pageSelection.placeholder = `1-${pageCount}`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  parsePageSelection(selectionStr, maxPage) {
    const pages = new Set();
    const parts = selectionStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n));
        if (start >= 1 && end <= maxPage && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.add(i - 1);
          }
        }
      } else {
        const page = parseInt(trimmed);
        if (page >= 1 && page <= maxPage) {
          pages.add(page - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  async deletePages() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const pageCount = this.pdfDoc.getPageCount();
      const pagesToDelete = this.parsePageSelection(this.pageSelection.value, pageCount);

      if (pagesToDelete.length === 0) {
        throw new Error('請輸入有效的頁面範圍');
      }

      if (pagesToDelete.length >= pageCount) {
        throw new Error('不能刪除所有頁面');
      }

      this.updateProgress(30, '處理頁面中...');

      const pagesToKeep = [];
      for (let i = 0; i < pageCount; i++) {
        if (!pagesToDelete.includes(i)) {
          pagesToKeep.push(i);
        }
      }

      const newPdf = await PDFLib.PDFDocument.create();
      const pages = await newPdf.copyPages(this.pdfDoc, pagesToKeep);
      pages.forEach(page => newPdf.addPage(page));

      this.updateProgress(80, '生成文件...');
      this.outputBytes = await newPdf.save();

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.deletedPages.textContent = `${pagesToDelete.length} 頁`;
      this.remainingPages.textContent = `${pagesToKeep.length} 頁`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '刪除完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '頁面刪除完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Delete error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '刪除失敗');
      this.processBtn.disabled = false;
    }
  }

  download() {
    if (!this.outputBytes) return;

    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modified.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.outputBytes = null;
    this.fileInput.value = '';
    this.pageSelection.value = '';
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
  window.pdfDeleter = new PDFDeleter();
});

export default PDFDeleter;
