/**
 * PDF-014: PDF to PowerPoint Converter
 *
 * Converts PDF pages to PowerPoint slides.
 */

class PDFToPPT {
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
    this.convertMode = document.getElementById('convertMode');
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
    this.slideCount = document.getElementById('slideCount');

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

  async convert() {
    if (!this.pdfDoc) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      const pptx = new PptxGenJS();
      const numPages = this.pdfDoc.numPages;
      const mode = this.convertMode.value;

      for (let i = 1; i <= numPages; i++) {
        this.updateProgress((i / numPages) * 80, `處理第 ${i} 頁...`);

        const page = await this.pdfDoc.getPage(i);
        const slide = pptx.addSlide();

        if (mode === 'image') {
          // Render page to canvas
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport }).promise;

          const imageData = canvas.toDataURL('image/png');
          slide.addImage({
            data: imageData,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%'
          });
        } else {
          // Extract text
          const textContent = await page.getTextContent();
          const text = textContent.items.map(item => item.str).join(' ');

          slide.addText(text, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 6.5,
            fontSize: 12,
            wrap: true
          });
        }
      }

      this.updateProgress(90, '生成 PPTX...');

      this.outputBlob = await pptx.write({ outputType: 'blob' });

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.slideCount.textContent = `${numPages} 張`;
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

    const originalName = this.file.name.replace(/\.pdf$/i, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.outputBlob);
    link.download = `${originalName}.pptx`;
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
  window.pdfToPpt = new PDFToPPT();
});

export default PDFToPPT;
