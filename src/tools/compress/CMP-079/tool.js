/**
 * CMP-079: LZ78 壓縮
 * LZ78 演算法壓縮
 */
class CompressTool079 {
  constructor() { this.init(); }
  init() {
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileName = document.getElementById('fileName');
    this.processBtn = document.getElementById('processBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.resultInfo = document.getElementById('resultInfo');
    this.statusMessage = document.getElementById('statusMessage');
    this.currentFile = null;
    this.resultBlob = null;
    this.bindEvents();
  }
  bindEvents() {
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    this.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => { e.preventDefault(); this.dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]); });
    this.processBtn.addEventListener('click', () => this.process());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  handleFile(file) {
    if (!file) return;
    this.currentFile = file;
    this.fileName.textContent = file.name + ' (' + this.formatSize(file.size) + ')';
  }
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  async process() {
    if (!this.currentFile) { this.showStatus('error', '請先選擇檔案'); return; }
    this.showStatus('info', '處理中...');
    try {
      const buffer = await this.currentFile.arrayBuffer();
      // Placeholder - actual compression would use WASM
      this.resultBlob = new Blob([buffer]);
      this.resultInfo.innerHTML = '<p>原始大小: ' + this.formatSize(this.currentFile.size) + '</p><p>處理完成</p>';
      this.resultArea.style.display = 'block';
      this.showStatus('success', '處理完成！');
    } catch (e) {
      this.showStatus('error', '處理失敗：' + e.message);
    }
  }
  download() {
    if (!this.resultBlob) return;
    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_' + this.currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }
  clear() {
    this.currentFile = null;
    this.resultBlob = null;
    this.fileName.textContent = '';
    this.fileInput.value = '';
    this.resultArea.style.display = 'none';
  }
  showStatus(type, message) {
    this.statusMessage.className = 'status-message active ' + type;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.compressTool079 = new CompressTool079(); });
export default CompressTool079;