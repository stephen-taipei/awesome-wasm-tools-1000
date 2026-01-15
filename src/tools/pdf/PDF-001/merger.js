/**
 * PDF-001: PDF Merger
 *
 * Merges multiple PDF files into a single PDF document.
 * Uses pdf-lib for PDF manipulation - all processing done locally.
 */

class PDFMerger {
  constructor() {
    this.files = [];
    this.mergedPdfBytes = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileListContainer = document.getElementById('fileListContainer');
    this.fileList = document.getElementById('fileList');
    this.addMoreBtn = document.getElementById('addMoreBtn');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.totalPages = document.getElementById('totalPages');
    this.outputSize = document.getElementById('outputSize');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.addMoreBtn.addEventListener('click', () => this.fileInput.click());

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
      this.addFiles(Array.from(e.dataTransfer.files));
    });

    this.processBtn.addEventListener('click', () => this.merge());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addFiles(Array.from(event.target.files));
    this.fileInput.value = '';
  }

  addFiles(newFiles) {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      this.showStatus('error', '請選擇 PDF 文件');
      return;
    }

    this.files.push(...pdfFiles);
    this.renderFileList();
    this.fileListContainer.style.display = 'block';
    this.processBtn.disabled = this.files.length < 2;

    if (this.files.length < 2) {
      this.showStatus('info', '請至少選擇 2 個 PDF 文件進行合併');
    } else {
      this.showStatus('success', `已選擇 ${this.files.length} 個文件`);
    }
  }

  renderFileList() {
    this.fileList.innerHTML = '';
    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.draggable = true;
      item.dataset.index = index;
      item.innerHTML = `
        <span class="file-icon">📄</span>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;

      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFile(index);
      });

      item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
      item.addEventListener('dragover', (e) => this.handleDragOver(e));
      item.addEventListener('drop', (e) => this.handleDrop(e, index));

      this.fileList.appendChild(item);
    });
  }

  handleDragStart(e, index) {
    e.dataTransfer.setData('text/plain', index);
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex !== targetIndex) {
      const [removed] = this.files.splice(sourceIndex, 1);
      this.files.splice(targetIndex, 0, removed);
      this.renderFileList();
    }
  }

  removeFile(index) {
    this.files.splice(index, 1);
    this.renderFileList();
    if (this.files.length === 0) {
      this.fileListContainer.style.display = 'none';
    }
    this.processBtn.disabled = this.files.length < 2;
  }

  async merge() {
    if (this.files.length < 2) {
      this.showStatus('error', '請至少選擇 2 個 PDF 文件');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();
      let totalPageCount = 0;

      for (let i = 0; i < this.files.length; i++) {
        this.updateProgress((i / this.files.length) * 80, `處理文件 ${i + 1}/${this.files.length}...`);

        const arrayBuffer = await this.files[i].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        pages.forEach(page => mergedPdf.addPage(page));
        totalPageCount += pdf.getPageCount();
      }

      this.updateProgress(90, '生成合併文件...');
      this.mergedPdfBytes = await mergedPdf.save();

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.totalPages.textContent = `${totalPageCount} 頁`;
      this.outputSize.textContent = this.formatFileSize(this.mergedPdfBytes.length);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '合併完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '合併完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Merge error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '合併失敗，請確認文件格式正確');
      this.processBtn.disabled = false;
    }
  }

  download() {
    if (!this.mergedPdfBytes) return;

    const blob = new Blob([this.mergedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.files = [];
    this.mergedPdfBytes = null;
    this.fileInput.value = '';
    this.fileList.innerHTML = '';
    this.fileListContainer.style.display = 'none';
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

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pdfMerger = new PDFMerger();
});

export default PDFMerger;
