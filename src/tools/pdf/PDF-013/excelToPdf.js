/**
 * PDF-013: Excel to PDF Converter
 *
 * Converts Excel spreadsheets to PDF format using SheetJS and jsPDF.
 */

class ExcelToPDF {
  constructor() {
    this.file = null;
    this.workbook = null;
    this.outputBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.orientation = document.getElementById('orientation');
    this.sheetSelect = document.getElementById('sheetSelect');
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

  async processFile(file) {
    this.file = file;
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Populate sheet selector
      this.sheetSelect.innerHTML = '';
      this.workbook.SheetNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        this.sheetSelect.appendChild(option);
      });

      this.fileInfo.textContent = `${file.name} (${this.workbook.SheetNames.length} 工作表)`;
      this.settingsPanel.style.display = 'block';
      this.processBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取 Excel 文件');
    }
  }

  async convert() {
    if (!this.workbook) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(30, '讀取工作表...');

      const sheetName = this.sheetSelect.value;
      const worksheet = this.workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      this.updateProgress(50, '生成 PDF...');

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: this.orientation.value,
        unit: 'mm',
        format: 'a4'
      });

      if (data.length > 0) {
        const headers = data[0].map(h => String(h || ''));
        const rows = data.slice(1).map(row =>
          row.map(cell => String(cell || ''))
        );

        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 20,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }

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

    const originalName = this.file.name.replace(/\.(xlsx?|csv)$/i, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${originalName}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.workbook = null;
    this.outputBlob = null;
    this.fileInput.value = '';
    this.sheetSelect.innerHTML = '';
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
  window.excelToPdf = new ExcelToPDF();
});

export default ExcelToPDF;
