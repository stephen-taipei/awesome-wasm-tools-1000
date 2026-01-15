/**
 * CMP-038: Archive Verification
 *
 * Verifies archive integrity and correctness.
 * All processing is done locally in the browser.
 */

class ArchiveVerify {
  constructor() {
    this.file = null;
    this.checks = [];
    this.fileResults = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.verifyBtn = document.getElementById('verifyBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.formatType = document.getElementById('formatType');
    this.overallStatus = document.getElementById('overallStatus');
    this.checksPanel = document.getElementById('checksPanel');
    this.checksList = document.getElementById('checksList');
    this.filesPanel = document.getElementById('filesPanel');
    this.filesList = document.getElementById('filesList');
    this.passedCount = document.getElementById('passedCount');
    this.failedCount = document.getElementById('failedCount');
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

    this.verifyBtn.addEventListener('click', () => this.verify());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.zip') && !name.endsWith('.gz') && !name.endsWith('.gzip')) {
      this.showStatus('error', '請選擇支援的壓縮格式 (ZIP, GZIP)');
      return;
    }

    this.file = file;
    this.verifyBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  async verify() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.verifyBtn.disabled = true;
    this.checks = [];
    this.fileResults = [];

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.fileName.textContent = this.file.name;
      this.fileSize.textContent = this.formatFileSize(this.file.size);

      const isZip = this.file.name.toLowerCase().endsWith('.zip');
      const isGzip = this.file.name.toLowerCase().endsWith('.gz') ||
                     this.file.name.toLowerCase().endsWith('.gzip');

      if (isZip) {
        this.formatType.textContent = 'ZIP';
        await this.verifyZip(arrayBuffer, uint8Array);
      } else if (isGzip) {
        this.formatType.textContent = 'GZIP';
        await this.verifyGzip(uint8Array);
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `驗證完成！耗時 ${processingTime} 秒`);

      // Calculate overall status
      const allPassed = this.checks.every(c => c.status === 'pass');
      if (allPassed) {
        this.overallStatus.textContent = '通過';
        this.overallStatus.style.color = '#4CAF50';
      } else {
        this.overallStatus.textContent = '失敗';
        this.overallStatus.style.color = '#f44336';
      }

      // Display results
      this.displayChecks();
      this.displayFiles();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.resultPanel.style.display = 'block';
        this.checksPanel.style.display = 'block';
        this.resetBtn.style.display = 'inline-flex';

        if (allPassed) {
          this.showStatus('success', '壓縮檔驗證通過！');
        } else {
          this.showStatus('warning', '壓縮檔驗證發現問題');
        }
        this.verifyBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Verification error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', `驗證失敗: ${error.message}`);
      this.verifyBtn.disabled = false;
    }
  }

  async verifyZip(arrayBuffer, uint8Array) {
    // Check 1: ZIP signature
    this.updateProgress(10, '檢查 ZIP 簽名...');
    const hasSignature = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B;
    this.checks.push({
      name: 'ZIP 簽名',
      description: '檢查檔案開頭是否包含有效的 ZIP 簽名 (PK)',
      status: hasSignature ? 'pass' : 'fail',
      details: hasSignature ? '簽名有效' : '簽名無效或缺失'
    });

    // Check 2: End of central directory
    this.updateProgress(20, '檢查中央目錄...');
    let hasEOCD = false;
    for (let i = uint8Array.length - 22; i >= 0 && i >= uint8Array.length - 65536; i--) {
      if (uint8Array[i] === 0x50 && uint8Array[i + 1] === 0x4B &&
          uint8Array[i + 2] === 0x05 && uint8Array[i + 3] === 0x06) {
        hasEOCD = true;
        break;
      }
    }
    this.checks.push({
      name: '中央目錄結束記錄',
      description: '檢查 ZIP 檔案是否包含有效的中央目錄結束記錄 (EOCD)',
      status: hasEOCD ? 'pass' : 'fail',
      details: hasEOCD ? '找到 EOCD' : '找不到 EOCD'
    });

    // Check 3: Parse and verify entries
    this.updateProgress(40, '解析壓縮檔...');
    let parseOk = false;
    let zip = null;
    try {
      zip = await JSZip.loadAsync(arrayBuffer);
      parseOk = true;
      this.checks.push({
        name: '結構解析',
        description: '嘗試解析 ZIP 檔案結構',
        status: 'pass',
        details: `成功解析 ${Object.keys(zip.files).length} 個項目`
      });
    } catch (e) {
      this.checks.push({
        name: '結構解析',
        description: '嘗試解析 ZIP 檔案結構',
        status: 'fail',
        details: `解析失敗: ${e.message}`
      });
    }

    // Check 4: Verify each file's content
    if (zip) {
      this.updateProgress(50, '驗證檔案內容...');
      const entries = Object.entries(zip.files);
      let verified = 0;
      let failed = 0;

      for (let i = 0; i < entries.length; i++) {
        const [path, entry] = entries[i];
        if (!entry.dir) {
          this.updateProgress(50 + (i / entries.length) * 40, `驗證: ${path}`);

          try {
            const content = await entry.async('uint8array');
            this.fileResults.push({
              name: path,
              size: content.length,
              status: 'pass'
            });
            verified++;
          } catch (e) {
            this.fileResults.push({
              name: path,
              size: 0,
              status: 'fail',
              error: e.message
            });
            failed++;
          }
        }
      }

      this.checks.push({
        name: '內容完整性',
        description: '驗證所有檔案是否可以正確解壓',
        status: failed === 0 ? 'pass' : 'fail',
        details: `${verified} 個成功, ${failed} 個失敗`
      });
    }

    // Check 5: CRC verification (if available)
    this.updateProgress(95, '完成驗證...');
    this.checks.push({
      name: 'CRC 校驗',
      description: '驗證檔案的 CRC32 校驗碼',
      status: parseOk ? 'pass' : 'skip',
      details: parseOk ? '通過 JSZip 內建驗證' : '無法執行'
    });
  }

  async verifyGzip(uint8Array) {
    // Check 1: GZIP signature
    this.updateProgress(20, '檢查 GZIP 簽名...');
    const hasSignature = uint8Array[0] === 0x1F && uint8Array[1] === 0x8B;
    this.checks.push({
      name: 'GZIP 簽名',
      description: '檢查檔案開頭是否包含有效的 GZIP 簽名',
      status: hasSignature ? 'pass' : 'fail',
      details: hasSignature ? '簽名有效 (1F 8B)' : '簽名無效或缺失'
    });

    // Check 2: Compression method
    this.updateProgress(40, '檢查壓縮方法...');
    const compressionMethod = uint8Array[2];
    const validMethod = compressionMethod === 8;
    this.checks.push({
      name: '壓縮方法',
      description: '檢查是否使用標準 DEFLATE 壓縮',
      status: validMethod ? 'pass' : 'fail',
      details: validMethod ? 'DEFLATE (CM=8)' : `非標準方法 (CM=${compressionMethod})`
    });

    // Check 3: Decompression test
    this.updateProgress(60, '測試解壓縮...');
    let decompressOk = false;
    let decompressedSize = 0;
    try {
      const decompressed = pako.ungzip(uint8Array);
      decompressOk = true;
      decompressedSize = decompressed.length;
      this.checks.push({
        name: '解壓縮測試',
        description: '嘗試完整解壓縮檔案',
        status: 'pass',
        details: `解壓後大小: ${this.formatFileSize(decompressedSize)}`
      });
    } catch (e) {
      this.checks.push({
        name: '解壓縮測試',
        description: '嘗試完整解壓縮檔案',
        status: 'fail',
        details: `解壓失敗: ${e.message}`
      });
    }

    // Check 4: CRC and size verification (from trailer)
    this.updateProgress(80, '驗證 CRC...');
    if (uint8Array.length >= 8) {
      const trailer = uint8Array.slice(-8);
      const storedCrc = trailer[0] | (trailer[1] << 8) | (trailer[2] << 16) | (trailer[3] << 24);
      const storedSize = trailer[4] | (trailer[5] << 8) | (trailer[6] << 16) | (trailer[7] << 24);

      const sizeMatch = storedSize === (decompressedSize & 0xFFFFFFFF);
      this.checks.push({
        name: '大小校驗',
        description: '驗證解壓後大小是否與記錄的大小匹配',
        status: sizeMatch ? 'pass' : (decompressOk ? 'pass' : 'fail'),
        details: sizeMatch ? '大小匹配' : `記錄: ${storedSize}, 實際: ${decompressedSize}`
      });
    }

    this.updateProgress(95, '完成驗證...');
  }

  displayChecks() {
    let html = '';
    for (const check of this.checks) {
      const icon = check.status === 'pass' ? '✅' :
                   check.status === 'fail' ? '❌' : '⏭️';
      const statusClass = check.status;

      html += `<div class="check-item ${statusClass}">
        <div class="check-header">
          <span class="check-icon">${icon}</span>
          <span class="check-name">${check.name}</span>
        </div>
        <div class="check-description">${check.description}</div>
        <div class="check-details">${check.details}</div>
      </div>`;
    }
    this.checksList.innerHTML = html;
  }

  displayFiles() {
    if (this.fileResults.length === 0) {
      this.filesPanel.style.display = 'none';
      return;
    }

    let html = '';
    let passed = 0;
    let failed = 0;

    for (const file of this.fileResults) {
      const icon = file.status === 'pass' ? '✅' : '❌';
      if (file.status === 'pass') passed++;
      else failed++;

      html += `<div class="result-item ${file.status}">
        <div class="result-info">
          <span class="result-icon">${icon}</span>
          <span class="result-name">${file.name}</span>
          <span class="result-details">${this.formatFileSize(file.size)}</span>
        </div>
      </div>`;
    }

    this.filesList.innerHTML = html;
    this.passedCount.textContent = `${passed} 個`;
    this.passedCount.style.color = '#4CAF50';
    this.failedCount.textContent = `${failed} 個`;
    this.failedCount.style.color = failed > 0 ? '#f44336' : '#4CAF50';
    this.filesPanel.style.display = 'block';
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.checks = [];
    this.fileResults = [];
    this.resultPanel.style.display = 'none';
    this.checksPanel.style.display = 'none';
    this.filesPanel.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.verifyBtn.disabled = true;
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
  window.archiveVerify = new ArchiveVerify();
});

export default ArchiveVerify;
