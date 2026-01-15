/**
 * PDF-016: HTML to PDF Converter
 *
 * Converts HTML content to PDF format using html2canvas and jsPDF.
 */

class HTMLToPDF {
  constructor() {
    this.file = null;
    this.htmlContent = '';
    this.outputBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.htmlInput = document.getElementById('htmlInput');
    this.pageSize = document.getElementById('pageSize');
    this.orientation = document.getElementById('orientation');
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
    if (!file.name.match(/\.html?$/i)) {
      this.showStatus('error', '請選擇 HTML 文件');
      return;
    }

    this.file = file;
    try {
      this.htmlContent = await file.text();
      this.htmlInput.value = this.htmlContent;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取文件');
    }
  }

  async convert() {
    const html = this.htmlInput.value.trim() || this.htmlContent;

    if (!html) {
      this.showStatus('error', '請輸入 HTML 內容或上傳文件');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(20, '渲染 HTML...');

      // Create hidden container for rendering
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; left: -9999px; width: 800px;';
      container.innerHTML = html;
      document.body.appendChild(container);

      this.updateProgress(40, '擷取頁面...');

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container);

      this.updateProgress(70, '生成 PDF...');

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF({
        orientation: this.orientation.value,
        unit: 'mm',
        format: this.pageSize.value
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;
      let page = 1;

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
        page++;
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

    const fileName = this.file ? this.file.name.replace(/\.html?$/i, '') : 'document';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${fileName}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.htmlContent = '';
    this.outputBlob = null;
    this.fileInput.value = '';
    this.htmlInput.value = '';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.processBtn.disabled = false;
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
  window.htmlToPdf = new HTMLToPDF();
});

export default HTMLToPDF;
