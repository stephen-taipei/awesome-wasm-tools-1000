/**
 * PDF-011: Word to PDF Converter
 *
 * Converts Word documents (DOCX) to PDF format using Mammoth.js and jsPDF.
 */

class WordToPDF {
  constructor() {
    this.file = null;
    this.outputBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.pageSize = document.getElementById('pageSize');
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

  processFile(file) {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(docx?|doc)$/i)) {
      this.showStatus('error', '請選擇 Word 文件 (DOCX/DOC)');
      return;
    }

    this.file = file;
    this.fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
    this.settingsPanel.style.display = 'block';
    this.processBtn.disabled = false;
    this.showStatus('success', `已載入: ${file.name}`);
  }

  async convert() {
    if (!this.file) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(20, '讀取 Word 文檔...');

      const arrayBuffer = await this.file.arrayBuffer();

      this.updateProgress(40, '提取文字內容...');

      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      this.updateProgress(60, '生成 PDF...');

      const { jsPDF } = window.jspdf;
      const pageFormat = this.pageSize.value;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pageFormat
      });

      // Set font for Chinese support
      doc.setFont('helvetica');
      doc.setFontSize(12);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - margin * 2;

      let y = margin;
      const lines = doc.splitTextToSize(text, maxWidth);

      lines.forEach(line => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      this.updateProgress(90, '完成處理...');

      this.outputBlob = doc.output('blob');

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

  download() {
    if (!this.outputBlob) return;

    const originalName = this.file.name.replace(/\.(docx?|doc)$/i, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${originalName}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
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

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.wordToPdf = new WordToPDF();
});

export default WordToPDF;
