/**
 * PDF-002: PDF Splitter
 *
 * Splits a PDF document into multiple files based on different modes.
 * Uses pdf-lib for PDF manipulation and JSZip for bundling output.
 */

class PDFSplitter {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.outputFiles = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.splitMode = document.getElementById('splitMode');
    this.rangeSettings = document.getElementById('rangeSettings');
    this.fixedSettings = document.getElementById('fixedSettings');
    this.pageRanges = document.getElementById('pageRanges');
    this.pagesPerFile = document.getElementById('pagesPerFile');
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
    this.outputCount = document.getElementById('outputCount');

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

    this.splitMode.addEventListener('change', () => this.updateModeSettings());

    this.processBtn.addEventListener('click', () => this.split());
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

      this.fileInfo.textContent = `${file.name} (${pageCount} 頁)`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  updateModeSettings() {
    const mode = this.splitMode.value;
    this.rangeSettings.style.display = mode === 'range' ? 'flex' : 'none';
    this.fixedSettings.style.display = mode === 'fixed' ? 'flex' : 'none';
  }

  parseRanges(rangeStr, maxPage) {
    const ranges = [];
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n));
        if (start >= 1 && end <= maxPage && start <= end) {
          ranges.push({ start: start - 1, end: end - 1 });
        }
      } else {
        const page = parseInt(trimmed);
        if (page >= 1 && page <= maxPage) {
          ranges.push({ start: page - 1, end: page - 1 });
        }
      }
    }
    return ranges;
  }

  async split() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;
    this.outputFiles = [];

    try {
      const pageCount = this.pdfDoc.getPageCount();
      const mode = this.splitMode.value;
      let splitRanges = [];

      if (mode === 'each') {
        for (let i = 0; i < pageCount; i++) {
          splitRanges.push({ start: i, end: i });
        }
      } else if (mode === 'range') {
        splitRanges = this.parseRanges(this.pageRanges.value, pageCount);
        if (splitRanges.length === 0) {
          throw new Error('無效的頁面範圍');
        }
      } else if (mode === 'fixed') {
        const pagesPerFile = parseInt(this.pagesPerFile.value) || 1;
        for (let i = 0; i < pageCount; i += pagesPerFile) {
          splitRanges.push({ start: i, end: Math.min(i + pagesPerFile - 1, pageCount - 1) });
        }
      }

      for (let i = 0; i < splitRanges.length; i++) {
        this.updateProgress((i / splitRanges.length) * 90, `分割文件 ${i + 1}/${splitRanges.length}...`);

        const range = splitRanges[i];
        const newPdf = await PDFLib.PDFDocument.create();
        const pageIndices = [];

        for (let j = range.start; j <= range.end; j++) {
          pageIndices.push(j);
        }

        const pages = await newPdf.copyPages(this.pdfDoc, pageIndices);
        pages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        const fileName = `split_${i + 1}_pages_${range.start + 1}-${range.end + 1}.pdf`;
        this.outputFiles.push({ name: fileName, data: pdfBytes });
      }

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.outputCount.textContent = `${this.outputFiles.length} 個文件`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '分割完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '分割完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Split error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '分割失敗');
      this.processBtn.disabled = false;
    }
  }

  async download() {
    if (this.outputFiles.length === 0) return;

    if (this.outputFiles.length === 1) {
      const file = this.outputFiles[0];
      const blob = new Blob([file.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      const zip = new JSZip();
      this.outputFiles.forEach(file => {
        zip.file(file.name, file.data);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'split_pdfs.zip';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.outputFiles = [];
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
  window.pdfSplitter = new PDFSplitter();
});

export default PDFSplitter;
