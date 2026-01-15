/**
 * PDF-019: Markdown to PDF Converter
 *
 * Converts Markdown content to PDF format using marked.js and html2canvas/jsPDF.
 */

class MarkdownToPDF {
  constructor() {
    this.file = null;
    this.mdContent = '';
    this.outputBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.mdInput = document.getElementById('mdInput');
    this.pageSize = document.getElementById('pageSize');
    this.theme = document.getElementById('theme');
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
    if (!file.name.match(/\.(md|markdown)$/i)) {
      this.showStatus('error', '請選擇 Markdown 文件');
      return;
    }

    this.file = file;
    try {
      this.mdContent = await file.text();
      this.mdInput.value = this.mdContent;
      this.showStatus('success', `已載入: ${file.name}`);
    } catch (error) {
      this.showStatus('error', '無法讀取文件');
    }
  }

  getThemeStyles() {
    const theme = this.theme.value;

    const defaultStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; padding: 40px; }
      h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
      h3 { font-size: 1.25em; }
      code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
      pre { background: #f4f4f4; padding: 16px; overflow: auto; border-radius: 6px; }
      pre code { background: none; padding: 0; }
      blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f4f4f4; }
      a { color: #0066cc; }
      img { max-width: 100%; }
    `;

    const githubStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #24292f; padding: 40px; max-width: 800px; margin: 0 auto; }
      h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
      h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      code { background: rgba(175,184,193,0.2); padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; }
      pre { background: #f6f8fa; padding: 16px; overflow: auto; border-radius: 6px; line-height: 1.45; }
      pre code { background: none; padding: 0; font-size: 100%; }
      blockquote { border-left: 0.25em solid #d0d7de; margin: 0; padding: 0 1em; color: #57606a; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d0d7de; padding: 6px 13px; }
      th { font-weight: 600; background: #f6f8fa; }
      a { color: #0969da; text-decoration: none; }
      a:hover { text-decoration: underline; }
    `;

    return theme === 'github' ? githubStyles : defaultStyles;
  }

  async convert() {
    const markdown = this.mdInput.value.trim() || this.mdContent;

    if (!markdown) {
      this.showStatus('error', '請輸入 Markdown 內容或上傳文件');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(20, '解析 Markdown...');

      // Convert Markdown to HTML
      const html = marked.parse(markdown);

      this.updateProgress(40, '渲染頁面...');

      // Create hidden container for rendering
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; left: -9999px; width: 800px; background: white;';
      container.innerHTML = `<style>${this.getThemeStyles()}</style><div class="markdown-body">${html}</div>`;
      document.body.appendChild(container);

      this.updateProgress(60, '擷取頁面...');

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container);

      this.updateProgress(80, '生成 PDF...');

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: this.pageSize.value
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      this.updateProgress(95, '完成處理...');

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

    const fileName = this.file ? this.file.name.replace(/\.(md|markdown)$/i, '') : 'document';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${fileName}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.mdContent = '';
    this.outputBlob = null;
    this.fileInput.value = '';
    this.mdInput.value = '';
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
  window.mdToPdf = new MarkdownToPDF();
});

export default MarkdownToPDF;
