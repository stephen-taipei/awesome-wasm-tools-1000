/**
 * PDF-006: PDF Rotate
 *
 * Rotates pages in a PDF document by specified angles.
 */

class PDFRotate {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.outputBytes = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.rotationAngle = document.getElementById('rotationAngle');
    this.applyTo = document.getElementById('applyTo');
    this.pageSelectionRow = document.getElementById('pageSelectionRow');
    this.pageSelection = document.getElementById('pageSelection');
    this.totalPagesEl = document.getElementById('totalPages');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.rotatedPages = document.getElementById('rotatedPages');

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

    this.applyTo.addEventListener('change', () => {
      this.pageSelectionRow.style.display = this.applyTo.value === 'selected' ? 'flex' : 'none';
    });

    this.processBtn.addEventListener('click', () => this.rotate());
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
      this.pageCount = this.pdfDoc.getPageCount();

      this.totalPagesEl.textContent = `${this.pageCount} 頁`;
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
    return Array.from(pages);
  }

  getTargetPages() {
    const mode = this.applyTo.value;
    const pages = [];

    switch (mode) {
      case 'all':
        for (let i = 0; i < this.pageCount; i++) pages.push(i);
        break;
      case 'selected':
        return this.parsePageSelection(this.pageSelection.value, this.pageCount);
      case 'odd':
        for (let i = 0; i < this.pageCount; i += 2) pages.push(i);
        break;
      case 'even':
        for (let i = 1; i < this.pageCount; i += 2) pages.push(i);
        break;
    }

    return pages;
  }

  async rotate() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const angle = parseInt(this.rotationAngle.value);
      const targetPages = this.getTargetPages();

      if (targetPages.length === 0) {
        throw new Error('請選擇要旋轉的頁面');
      }

      this.updateProgress(30, '旋轉頁面中...');

      const pages = this.pdfDoc.getPages();
      targetPages.forEach(pageIndex => {
        const page = pages[pageIndex];
        const currentRotation = page.getRotation().angle;
        page.setRotation(PDFLib.degrees(currentRotation + angle));
      });

      this.updateProgress(80, '生成文件...');
      this.outputBytes = await this.pdfDoc.save();

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.rotatedPages.textContent = `${targetPages.length} 頁`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '旋轉完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '旋轉完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Rotate error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '旋轉失敗');
      this.processBtn.disabled = false;
    }
  }

  download() {
    if (!this.outputBytes) return;

    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rotated.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.pageCount = 0;
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
  window.pdfRotate = new PDFRotate();
});

export default PDFRotate;
