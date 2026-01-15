/**
 * CMP-037: Archive Repair
 *
 * Attempts to repair corrupted archive files.
 * All processing is done locally in the browser.
 */

class ArchiveRepair {
  constructor() {
    this.file = null;
    this.fileData = null;
    this.issues = [];
    this.recoveredFiles = [];
    this.repairedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.diagnoseBtn = document.getElementById('diagnoseBtn');
    this.repairBtn = document.getElementById('repairBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.diagnosisPanel = document.getElementById('diagnosisPanel');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.formatStatus = document.getElementById('formatStatus');
    this.structureStatus = document.getElementById('structureStatus');
    this.issueList = document.getElementById('issueList');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.recoveredPanel = document.getElementById('recoveredPanel');
    this.recoveredList = document.getElementById('recoveredList');
    this.statusMessage = document.getElementById('statusMessage');

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
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    this.diagnoseBtn.addEventListener('click', () => this.diagnose());
    this.repairBtn.addEventListener('click', () => this.repair());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.showStatus('error', '請選擇 ZIP 格式的檔案');
      return;
    }

    this.file = file;
    this.diagnoseBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  async diagnose() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.diagnoseBtn.disabled = true;
    this.issues = [];

    try {
      this.updateProgress(20, '讀取檔案...');

      const arrayBuffer = await this.file.arrayBuffer();
      this.fileData = new Uint8Array(arrayBuffer);

      this.fileName.textContent = this.file.name;
      this.fileSize.textContent = this.formatFileSize(this.file.size);

      this.updateProgress(40, '檢查檔案格式...');

      // Check ZIP signature
      const hasValidSignature = this.checkZipSignature();
      if (hasValidSignature) {
        this.formatStatus.textContent = '有效的 ZIP 簽名';
        this.formatStatus.style.color = '#4CAF50';
      } else {
        this.formatStatus.textContent = '無效或缺失的 ZIP 簽名';
        this.formatStatus.style.color = '#f44336';
        this.issues.push({
          type: 'error',
          message: 'ZIP 檔案簽名無效或損壞'
        });
      }

      this.updateProgress(60, '檢查檔案結構...');

      // Try to parse with JSZip
      let structureOk = false;
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const fileCount = Object.keys(zip.files).length;
        structureOk = true;
        this.structureStatus.textContent = `結構完整 (${fileCount} 個項目)`;
        this.structureStatus.style.color = '#4CAF50';
      } catch (e) {
        this.structureStatus.textContent = '結構損壞';
        this.structureStatus.style.color = '#f44336';
        this.issues.push({
          type: 'error',
          message: `解析錯誤: ${e.message}`
        });
      }

      this.updateProgress(80, '掃描可恢復內容...');

      // Scan for local file headers
      const localHeaders = this.scanLocalFileHeaders();
      if (localHeaders.length > 0) {
        this.issues.push({
          type: 'info',
          message: `找到 ${localHeaders.length} 個本地檔案標頭`
        });
      }

      // Check for central directory
      const centralDir = this.findCentralDirectory();
      if (!centralDir) {
        this.issues.push({
          type: 'warning',
          message: '找不到中央目錄記錄'
        });
      }

      this.updateProgress(100, '診斷完成');

      // Display issues
      this.displayIssues();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.diagnosisPanel.style.display = 'block';
        this.resetBtn.style.display = 'inline-flex';

        if (this.issues.some(i => i.type === 'error')) {
          this.repairBtn.style.display = 'inline-flex';
          this.showStatus('warning', '檢測到問題，可嘗試修復');
        } else {
          this.showStatus('success', '檔案結構完整，無需修復');
        }
      }, 500);

    } catch (error) {
      console.error('Diagnosis error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '診斷失敗');
      this.diagnoseBtn.disabled = false;
    }
  }

  checkZipSignature() {
    if (this.fileData.length < 4) return false;
    return this.fileData[0] === 0x50 && this.fileData[1] === 0x4B &&
           (this.fileData[2] === 0x03 || this.fileData[2] === 0x05) &&
           (this.fileData[3] === 0x04 || this.fileData[3] === 0x06);
  }

  scanLocalFileHeaders() {
    const headers = [];
    const signature = [0x50, 0x4B, 0x03, 0x04];

    for (let i = 0; i < this.fileData.length - 4; i++) {
      if (this.fileData[i] === signature[0] &&
          this.fileData[i + 1] === signature[1] &&
          this.fileData[i + 2] === signature[2] &&
          this.fileData[i + 3] === signature[3]) {
        headers.push(i);
      }
    }

    return headers;
  }

  findCentralDirectory() {
    const signature = [0x50, 0x4B, 0x05, 0x06];

    for (let i = this.fileData.length - 22; i >= 0; i--) {
      if (this.fileData[i] === signature[0] &&
          this.fileData[i + 1] === signature[1] &&
          this.fileData[i + 2] === signature[2] &&
          this.fileData[i + 3] === signature[3]) {
        return i;
      }
    }

    return null;
  }

  displayIssues() {
    if (this.issues.length === 0) {
      this.issueList.innerHTML = '<div class="issue-item info">無問題發現</div>';
      return;
    }

    let html = '';
    for (const issue of this.issues) {
      const icon = issue.type === 'error' ? '❌' :
                   issue.type === 'warning' ? '⚠️' : 'ℹ️';
      html += `<div class="issue-item ${issue.type}">
        ${icon} ${issue.message}
      </div>`;
    }
    this.issueList.innerHTML = html;
  }

  async repair() {
    if (!this.fileData) {
      this.showStatus('error', '請先診斷檔案');
      return;
    }

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.repairBtn.disabled = true;
    this.recoveredFiles = [];

    try {
      this.updateProgress(20, '掃描檔案內容...');

      // Find all local file headers and try to extract
      const headers = this.scanLocalFileHeaders();

      this.updateProgress(40, '嘗試恢復檔案...');

      for (let i = 0; i < headers.length; i++) {
        const offset = headers[i];
        this.updateProgress(40 + (i / headers.length) * 40, `恢復檔案 ${i + 1}/${headers.length}...`);

        try {
          const fileInfo = this.parseLocalFileHeader(offset);
          if (fileInfo && fileInfo.content) {
            this.recoveredFiles.push(fileInfo);
          }
        } catch (e) {
          // Skip corrupted file
        }
      }

      this.updateProgress(85, '重建壓縮檔...');

      // Rebuild ZIP with recovered files
      if (this.recoveredFiles.length > 0) {
        const zip = new JSZip();
        for (const file of this.recoveredFiles) {
          if (!file.isDirectory) {
            zip.file(file.name, file.content);
          }
        }

        this.repairedBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE'
        });
      }

      this.updateProgress(100, '修復完成');

      // Display recovered files
      this.displayRecoveredFiles();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        if (this.recoveredFiles.length > 0) {
          this.downloadBtn.style.display = 'inline-flex';
          this.showStatus('success', `成功恢復 ${this.recoveredFiles.length} 個檔案`);
        } else {
          this.showStatus('warning', '無法恢復任何檔案');
        }
        this.repairBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Repair error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '修復失敗');
      this.repairBtn.disabled = false;
    }
  }

  parseLocalFileHeader(offset) {
    if (offset + 30 > this.fileData.length) return null;

    const view = new DataView(this.fileData.buffer, offset);

    // Skip signature (4 bytes)
    const version = view.getUint16(4, true);
    const flags = view.getUint16(6, true);
    const compression = view.getUint16(8, true);
    const compressedSize = view.getUint32(18, true);
    const uncompressedSize = view.getUint32(22, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);

    if (offset + 30 + nameLength + extraLength > this.fileData.length) return null;

    const nameBytes = this.fileData.slice(offset + 30, offset + 30 + nameLength);
    const name = new TextDecoder().decode(nameBytes);

    const dataOffset = offset + 30 + nameLength + extraLength;

    if (dataOffset + compressedSize > this.fileData.length) return null;

    const content = this.fileData.slice(dataOffset, dataOffset + compressedSize);

    return {
      name: name,
      isDirectory: name.endsWith('/'),
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      content: content
    };
  }

  displayRecoveredFiles() {
    if (this.recoveredFiles.length === 0) {
      this.recoveredPanel.style.display = 'none';
      return;
    }

    let html = '';
    for (let i = 0; i < this.recoveredFiles.length; i++) {
      const file = this.recoveredFiles[i];
      if (!file.isDirectory) {
        html += `<div class="result-item">
          <div class="result-info">
            <span class="result-name">${file.name}</span>
            <span class="result-details">${this.formatFileSize(file.compressedSize)}</span>
          </div>
        </div>`;
      }
    }

    this.recoveredList.innerHTML = html;
    this.recoveredPanel.style.display = 'block';
  }

  download() {
    if (!this.repairedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.repairedBlob);
    link.download = this.file.name.replace('.zip', '_repaired.zip');
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.fileData = null;
    this.issues = [];
    this.recoveredFiles = [];
    this.repairedBlob = null;
    this.diagnosisPanel.style.display = 'none';
    this.recoveredPanel.style.display = 'none';
    this.repairBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.diagnoseBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
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
  window.archiveRepair = new ArchiveRepair();
});

export default ArchiveRepair;
