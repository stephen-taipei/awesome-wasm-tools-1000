/**
 * PDF-015: PowerPoint to PDF Converter
 *
 * Converts PowerPoint presentations to PDF format.
 * Note: Basic text extraction - full rendering requires server-side processing.
 */

class PPTToPDF {
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
    if (!file.name.match(/\.pptx$/i)) {
      this.showStatus('error', '請選擇 PPTX 文件');
      return;
    }

    this.file = file;
    this.fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
    this.settingsPanel.style.display = 'block';
    this.processBtn.disabled = false;
    this.showStatus('success', `已載入: ${file.name}`);
  }

  async extractSlidesContent(arrayBuffer) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slides = [];

    // Find all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.match(/slide(\d+)/)[1]);
        return numA - numB;
      });

    for (const slideFile of slideFiles) {
      const content = await zip.file(slideFile).async('text');
      const textContent = this.extractTextFromXML(content);
      slides.push(textContent);
    }

    return slides;
  }

  extractTextFromXML(xmlContent) {
    const texts = [];
    const regex = /<a:t>([^<]*)<\/a:t>/g;
    let match;

    while ((match = regex.exec(xmlContent)) !== null) {
      if (match[1].trim()) {
        texts.push(match[1].trim());
      }
    }

    return texts.join('\n');
  }

  async convert() {
    if (!this.file) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(20, '讀取 PowerPoint...');

      const arrayBuffer = await this.file.arrayBuffer();
      const slides = await this.extractSlidesContent(arrayBuffer);

      this.updateProgress(50, '生成 PDF...');

      const { jsPDF } = window.jspdf;
      const isWide = this.pageSize.value === 'wide';

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: isWide ? [297, 167] : [297, 223]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      slides.forEach((slideText, index) => {
        if (index > 0) doc.addPage();

        // Add slide number
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`投影片 ${index + 1}`, pageWidth - 30, pageHeight - 10);

        // Add slide content
        doc.setFontSize(14);
        doc.setTextColor(0);

        const lines = doc.splitTextToSize(slideText || '(空白投影片)', pageWidth - 40);
        doc.text(lines, 20, 30);
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

    const originalName = this.file.name.replace(/\.pptx$/i, '');
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
  window.pptToPdf = new PPTToPDF();
});

export default PPTToPDF;
