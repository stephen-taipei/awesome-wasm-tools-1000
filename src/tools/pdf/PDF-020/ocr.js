/**
 * PDF-020: PDF OCR
 *
 * Performs OCR (Optical Character Recognition) on PDF pages using Tesseract.js.
 */

class PDFOCR {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.ocrResult = '';
    this.init();
  }

  init() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.ocrLanguage = document.getElementById('ocrLanguage');
    this.pageRange = document.getElementById('pageRange');
    this.customRangeRow = document.getElementById('customRangeRow');
    this.customRange = document.getElementById('customRange');
    this.fileInfo = document.getElementById('fileInfo');
    this.resultArea = document.getElementById('resultArea');
    this.ocrResultEl = document.getElementById('ocrResult');
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

    this.pageRange.addEventListener('change', () => {
      this.customRangeRow.style.display = this.pageRange.value === 'custom' ? 'flex' : 'none';
    });

    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.processBtn.addEventListener('click', () => this.runOCR());
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

  parsePageRange(rangeStr, maxPage) {
    const pages = new Set();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n));
        if (start >= 1 && end <= maxPage && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.add(i);
          }
        }
      } else {
        const page = parseInt(trimmed);
        if (page >= 1 && page <= maxPage) {
          pages.add(page);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  getTargetPages() {
    const numPages = this.pdfDoc.numPages;
    const mode = this.pageRange.value;

    switch (mode) {
      case 'all':
        return Array.from({ length: numPages }, (_, i) => i + 1);
      case 'first':
        return [1];
      case 'custom':
        return this.parsePageRange(this.customRange.value, numPages);
      default:
        return Array.from({ length: numPages }, (_, i) => i + 1);
    }
  }

  async runOCR() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;
    this.ocrResult = '';

    try {
      const targetPages = this.getTargetPages();
      if (targetPages.length === 0) {
        throw new Error('請選擇要處理的頁面');
      }

      const language = this.ocrLanguage.value;

      this.updateProgress(5, '初始化 OCR 引擎...');

      const worker = await Tesseract.createWorker(language, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            // Progress is handled per page
          }
        }
      });

      const results = [];

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        const baseProgress = (i / targetPages.length) * 85 + 10;

        this.updateProgress(baseProgress, `OCR 處理第 ${pageNum} 頁...`);

        // Render page to canvas
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Run OCR on canvas
        const { data } = await worker.recognize(canvas);
        results.push(`=== 第 ${pageNum} 頁 ===\n${data.text}`);
      }

      await worker.terminate();

      this.ocrResult = results.join('\n\n');
      this.ocrResultEl.value = this.ocrResult;
      this.resultArea.style.display = 'block';

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.charCount.textContent = `${this.ocrResult.length.toLocaleString()} 字元`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, 'OCR 完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'OCR 識別完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('OCR error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', 'OCR 失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.ocrResult);
      this.showStatus('success', '已複製到剪貼簿！');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  download() {
    if (!this.ocrResult) return;

    const fileName = this.file.name.replace(/\.pdf$/i, '');
    const blob = new Blob([this.ocrResult], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_ocr.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.ocrResult = '';
    this.fileInput.value = '';
    this.customRange.value = '';
    this.ocrResultEl.value = '';
    this.resultArea.style.display = 'none';
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
  window.pdfOcr = new PDFOCR();
});

export default PDFOCR;
