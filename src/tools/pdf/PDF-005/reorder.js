/**
 * PDF-005: PDF Page Reorder
 *
 * Reorders pages in a PDF document based on user-specified order.
 */

class PDFReorder {
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
    this.pageOrder = document.getElementById('pageOrder');
    this.totalPagesEl = document.getElementById('totalPages');
    this.reverseBtn = document.getElementById('reverseBtn');
    this.oddFirstBtn = document.getElementById('oddFirstBtn');
    this.evenFirstBtn = document.getElementById('evenFirstBtn');
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

    this.reverseBtn.addEventListener('click', () => this.setReverseOrder());
    this.oddFirstBtn.addEventListener('click', () => this.setOddFirstOrder());
    this.evenFirstBtn.addEventListener('click', () => this.setEvenFirstOrder());

    this.processBtn.addEventListener('click', () => this.reorder());
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
      this.pageOrder.placeholder = Array.from({ length: this.pageCount }, (_, i) => i + 1).join(',');
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  setReverseOrder() {
    const order = Array.from({ length: this.pageCount }, (_, i) => this.pageCount - i);
    this.pageOrder.value = order.join(',');
  }

  setOddFirstOrder() {
    const odd = [];
    const even = [];
    for (let i = 1; i <= this.pageCount; i++) {
      if (i % 2 === 1) odd.push(i);
      else even.push(i);
    }
    this.pageOrder.value = [...odd, ...even].join(',');
  }

  setEvenFirstOrder() {
    const odd = [];
    const even = [];
    for (let i = 1; i <= this.pageCount; i++) {
      if (i % 2 === 0) even.push(i);
      else odd.push(i);
    }
    this.pageOrder.value = [...even, ...odd].join(',');
  }

  parsePageOrder(orderStr) {
    return orderStr.split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= this.pageCount)
      .map(n => n - 1);
  }

  async reorder() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const newOrder = this.parsePageOrder(this.pageOrder.value);

      if (newOrder.length === 0) {
        throw new Error('請輸入有效的頁面順序');
      }

      this.updateProgress(30, '重新排列頁面...');

      const newPdf = await PDFLib.PDFDocument.create();
      const pages = await newPdf.copyPages(this.pdfDoc, newOrder);
      pages.forEach(page => newPdf.addPage(page));

      this.updateProgress(80, '生成文件...');
      this.outputBytes = await newPdf.save();

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '重排完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '頁面重排完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Reorder error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '重排失敗');
      this.processBtn.disabled = false;
    }
  }

  download() {
    if (!this.outputBytes) return;

    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'reordered.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.outputBytes = null;
    this.fileInput.value = '';
    this.pageOrder.value = '';
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
  window.pdfReorder = new PDFReorder();
});

export default PDFReorder;
