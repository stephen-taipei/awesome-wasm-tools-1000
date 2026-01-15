/**
 * PDF-008: PDF to Image Converter
 *
 * Converts PDF pages to image format using PDF.js for rendering.
 */

class PDFToImage {
  constructor() {
    this.file = null;
    this.pdfDoc = null;
    this.images = [];
    this.init();
  }

  init() {
    // Set PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    }

    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.outputFormat = document.getElementById('outputFormat');
    this.scale = document.getElementById('scale');
    this.pageRange = document.getElementById('pageRange');
    this.customRangeRow = document.getElementById('customRangeRow');
    this.customRange = document.getElementById('customRange');
    this.totalPagesEl = document.getElementById('totalPages');
    this.previewArea = document.getElementById('previewArea');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.imageCount = document.getElementById('imageCount');

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

      this.totalPagesEl.textContent = `${pageCount} 頁`;
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
    const pageCount = this.pdfDoc.numPages;
    const mode = this.pageRange.value;

    switch (mode) {
      case 'all':
        return Array.from({ length: pageCount }, (_, i) => i + 1);
      case 'first':
        return [1];
      case 'custom':
        return this.parsePageRange(this.customRange.value, pageCount);
      default:
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
  }

  async convert() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;
    this.images = [];
    this.previewArea.innerHTML = '';

    try {
      const targetPages = this.getTargetPages();
      if (targetPages.length === 0) {
        throw new Error('請選擇要轉換的頁面');
      }

      const scale = parseFloat(this.scale.value);
      const format = this.outputFormat.value;
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        this.updateProgress((i / targetPages.length) * 90, `轉換第 ${pageNum} 頁...`);

        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // White background for JPEG
        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, mimeType, 0.92);
        });

        this.images.push({
          name: `page_${pageNum}.${format}`,
          blob,
          url: URL.createObjectURL(blob)
        });

        // Add preview
        const previewImg = document.createElement('img');
        previewImg.src = this.images[this.images.length - 1].url;
        previewImg.alt = `Page ${pageNum}`;
        previewImg.className = 'preview-image';
        this.previewArea.appendChild(previewImg);
      }

      this.previewArea.style.display = 'grid';

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.imageCount.textContent = `${this.images.length} 張`;
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
      this.showStatus('error', error.message || '轉換失敗');
      this.processBtn.disabled = false;
    }
  }

  async download() {
    if (this.images.length === 0) return;

    if (this.images.length === 1) {
      const link = document.createElement('a');
      link.href = this.images[0].url;
      link.download = this.images[0].name;
      link.click();
    } else {
      const zip = new JSZip();
      for (const img of this.images) {
        zip.file(img.name, img.blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'pdf_images.zip';
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }

  reset() {
    this.file = null;
    this.pdfDoc = null;
    this.images.forEach(img => URL.revokeObjectURL(img.url));
    this.images = [];
    this.fileInput.value = '';
    this.customRange.value = '';
    this.previewArea.innerHTML = '';
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
  window.pdfToImage = new PDFToImage();
});

export default PDFToImage;
