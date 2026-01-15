/**
 * PDF-012: PDF to Excel Converter
 *
 * Extracts text/table data from PDF and converts to Excel format.
 */

class PDFToExcel {
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
    this.dataInfo = document.getElementById('dataInfo');

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

      this.fileInfo.textContent = `${file.name} (${this.pdfDoc.numPages} 頁)`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 PDF 文件');
    }
  }

  async extractTextData() {
    const allData = [];
    const numPages = this.pdfDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
      this.updateProgress((i / numPages) * 60, `提取第 ${i} 頁...`);

      const page = await this.pdfDoc.getPage(i);
      const textContent = await page.getTextContent();

      // Group text items by Y position to form rows
      const rows = {};
      textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!rows[y]) rows[y] = [];
        rows[y].push({
          x: item.transform[4],
          text: item.str
        });
      });

      // Sort rows by Y position (top to bottom)
      const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);

      sortedYs.forEach(y => {
        // Sort items in row by X position
        const row = rows[y].sort((a, b) => a.x - b.x);
        const rowText = row.map(item => item.text.trim()).filter(t => t);
        if (rowText.length > 0) {
          allData.push(rowText);
        }
      });

      // Add empty row between pages
      if (i < numPages) {
        allData.push([`--- 第 ${i} 頁結束 ---`]);
      }
    }

    return allData;
  }

  async convert() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const data = await this.extractTextData();

      this.updateProgress(70, '生成文件...');

      const format = this.outputFormat.value;

      if (format === 'xlsx') {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PDF Data');

        const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        this.outputBlob = new Blob([xlsxData], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      } else {
        const csvContent = data.map(row => row.join(',')).join('\n');
        this.outputBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      }

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.dataInfo.textContent = `${data.length} 行資料`;
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
  window.pdfToExcel = new PDFToExcel();
});

export default PDFToExcel;
