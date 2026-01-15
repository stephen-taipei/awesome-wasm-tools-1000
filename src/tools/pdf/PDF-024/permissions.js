/**
 * PDF-024: PDF Permissions
 */
class PDFPermissions {
  constructor() { this.file = null; this.outputBytes = null; this.init(); }
  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
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
    this.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) this.processFile(e.target.files[0]); });
    this.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadArea.classList.add('dragover'); });
    this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
    this.uploadArea.addEventListener('drop', (e) => { e.preventDefault(); this.uploadArea.classList.remove('dragover'); if (e.dataTransfer.files[0]) this.processFile(e.dataTransfer.files[0]); });
    this.processBtn.addEventListener('click', () => this.applyPermissions());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }
  processFile(file) {
    if (file.type !== 'application/pdf') { this.showStatus('error', '請選擇 PDF 文件'); return; }
    this.file = file;
    this.fileInfo.textContent = file.name;
    this.settingsPanel.style.display = 'block';
    this.processBtn.disabled = false;
    this.showStatus('success', `已載入: ${file.name}`);
  }
  async applyPermissions() {
    if (!this.file) return;
    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.processBtn.disabled = true;
    try {
      this.updateProgress(30, '讀取 PDF...');
      const arrayBuffer = await this.file.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      this.updateProgress(70, '套用權限...');
      this.outputBytes = await pdfDoc.save();
      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.performanceInfo.style.display = 'block';
      this.updateProgress(100, '完成！');
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('info', '注意：瀏覽器端權限設定功能有限');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.processBtn.disabled = false;
      }, 500);
    } catch (error) {
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '處理失敗：' + error.message);
      this.processBtn.disabled = false;
    }
  }
  download() {
    if (!this.outputBytes) return;
    const blob = new Blob([this.outputBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = this.file.name.replace(/\.pdf$/i, '_protected.pdf');
    link.click();
    URL.revokeObjectURL(link.href);
  }
  reset() {
    this.file = null; this.outputBytes = null; this.fileInput.value = '';
    this.settingsPanel.style.display = 'none'; this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none'; this.performanceInfo.style.display = 'none';
    this.processBtn.disabled = true; this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }
  updateProgress(p, t) { this.progressFill.style.width = `${p}%`; if (t) this.progressText.textContent = t; }
  showStatus(type, msg) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = msg; if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}
document.addEventListener('DOMContentLoaded', () => { window.pdfPermissions = new PDFPermissions(); });
export default PDFPermissions;
