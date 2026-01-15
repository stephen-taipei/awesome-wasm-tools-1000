/**
 * PDF-007: PDF Compress
 *
 * Compresses PDF files to reduce file size.
 * Note: Client-side compression is limited; this removes unused objects and optimizes structure.
 */

class PDFCompress {
  constructor() {
    this.file = null;
    this.outputBytes = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.compressionLevel = document.getElementById('compressionLevel');
    this.originalSizeEl = document.getElementById('originalSize');
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.compressedSize = document.getElementById('compressedSize');
    this.savedSpace = document.getElementById('savedSpace');

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

    this.processBtn.addEventListener('click', () => this.compress());
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
    this.originalSizeEl.textContent = this.formatFileSize(file.size);
    this.settingsPanel.style.display = 'block';
    this.processBtn.disabled = false;
    this.showStatus('success', `已載入: ${file.name}`);
  }

  async compress() {
    if (!this.file) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;

    try {
      this.updateProgress(20, '讀取 PDF...');

      const arrayBuffer = await this.file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true
      });

      this.updateProgress(50, '優化文件結構...');

      // Get compression options based on level
      const level = this.compressionLevel.value;
      const options = {
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: level === 'high' ? 20 : level === 'medium' ? 50 : 100
      };

      this.updateProgress(70, '壓縮中...');

      // Save with compression options
      this.outputBytes = await pdfDoc.save({
        useObjectStreams: options.useObjectStreams,
        addDefaultPage: options.addDefaultPage,
        objectsPerTick: options.objectsPerTick
      });

      const endTime = performance.now();
      const originalSize = this.file.size;
      const newSize = this.outputBytes.length;
      const savedBytes = originalSize - newSize;
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.compressedSize.textContent = this.formatFileSize(newSize);
      this.savedSpace.textContent = savedBytes > 0
        ? `${this.formatFileSize(savedBytes)} (${savedPercent}%)`
        : '無法進一步壓縮';
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compress error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }

  download() {
    if (!this.outputBytes) return;

    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'compressed.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.file = null;
    this.outputBytes = null;
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
  window.pdfCompress = new PDFCompress();
});

export default PDFCompress;
