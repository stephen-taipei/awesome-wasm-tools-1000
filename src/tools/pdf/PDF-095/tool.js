/**
 * PDF-095: PDF 參考線
 * 新增 PDF 參考線
 */
class PDF095Tool {
  constructor() { this.file = null; this.init(); }
  init() {
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.processBtn = document.getElementById('processBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resultArea = document.getElementById('resultArea');
    this.resultContent = document.getElementById('resultContent');
    this.statusMessage = document.getElementById('statusMessage');
    this.bindEvents();
  }
  bindEvents() {
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropZone.classList.add('drag-over'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', (e) => { e.preventDefault(); this.dropZone.classList.remove('drag-over'); this.handleFile(e.dataTransfer.files[0]); });
    this.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    this.processBtn.addEventListener('click', () => this.process());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.downloadBtn.addEventListener('click', () => this.download());
  }
  handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      this.showStatus('error', '請選擇 PDF 檔案');
      return;
    }
    this.file = file;
    this.fileName.textContent = file.name;
    this.fileSize.textContent = this.formatSize(file.size);
    this.fileInfo.style.display = 'flex';
    this.processBtn.disabled = false;
    this.showStatus('success', '檔案已載入');
  }
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  async process() {
    if (!this.file) return;
    this.showStatus('info', '處理中...');
    try {
      // 模擬處理 - 實際實作需要 PDF 處理庫
      await new Promise(r => setTimeout(r, 500));
      this.resultContent.innerHTML = `
        <p><strong>檔案名稱:</strong> ${this.file.name}</p>
        <p><strong>檔案大小:</strong> ${this.formatSize(this.file.size)}</p>
        <p><strong>處理功能:</strong> PDF 參考線</p>
        <p><strong>狀態:</strong> 處理完成 (模擬)</p>
        <p class="note">注意: 完整功能需要整合 PDF 處理庫</p>
      `;
      this.resultArea.style.display = 'block';
      this.showStatus('success', '處理完成！');
    } catch (e) {
      this.showStatus('error', '處理失敗: ' + e.message);
    }
  }
  clear() {
    this.file = null;
    this.fileInput.value = '';
    this.fileInfo.style.display = 'none';
    this.resultArea.style.display = 'none';
    this.processBtn.disabled = true;
  }
  download() {
    // 模擬下載
    this.showStatus('success', '下載功能需要實際 PDF 處理');
  }
  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}
document.addEventListener('DOMContentLoaded', () => { window.pdfTool = new PDF095Tool(); });
export default PDF095Tool;
