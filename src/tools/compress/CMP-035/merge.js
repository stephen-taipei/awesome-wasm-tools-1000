/**
 * CMP-035: Merge Split Archives
 *
 * Merges split archive volumes and decompresses.
 * All processing is done locally in the browser.
 */

class MergeArchive {
  constructor() {
    this.volumes = [];
    this.extractedFiles = [];
    this.mergedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.mergeBtn = document.getElementById('mergeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.volumeList = document.getElementById('volumeList');
    this.volumeListContent = document.getElementById('volumeListContent');
    this.volumeStatus = document.getElementById('volumeStatus');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.resultList = document.getElementById('resultList');
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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) this.processFiles(files);
    });

    this.mergeBtn.addEventListener('click', () => this.merge());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processFiles(files);
  }

  processFiles(files) {
    // Sort by volume number
    this.volumes = files.map(file => {
      const match = file.name.match(/\.(\d{3})$/);
      const number = match ? parseInt(match[1], 10) : 0;
      return { file, number };
    }).sort((a, b) => a.number - b.number);

    // Display volume list
    let html = '';
    for (const vol of this.volumes) {
      const status = vol.number > 0 ? '✓' : '?';
      html += `<div class="file-item">
        <span class="file-status">${status}</span>
        <span class="file-name">${vol.file.name}</span>
        <span class="file-size">${this.formatFileSize(vol.file.size)}</span>
      </div>`;
    }
    this.volumeListContent.innerHTML = html;

    // Check if all volumes are present
    const volumeNumbers = this.volumes.map(v => v.number).filter(n => n > 0);
    const expectedCount = volumeNumbers.length > 0 ? Math.max(...volumeNumbers) : 0;
    const missing = [];

    for (let i = 1; i <= expectedCount; i++) {
      if (!volumeNumbers.includes(i)) {
        missing.push(i);
      }
    }

    if (missing.length > 0) {
      this.volumeStatus.textContent = `缺少分卷: ${missing.join(', ')}`;
      this.volumeStatus.style.color = '#f44336';
      this.mergeBtn.disabled = true;
    } else if (volumeNumbers.length > 0) {
      this.volumeStatus.textContent = `完整 (${volumeNumbers.length} 個分卷)`;
      this.volumeStatus.style.color = '#4CAF50';
      this.mergeBtn.disabled = false;
    } else {
      this.volumeStatus.textContent = '無法識別分卷編號';
      this.volumeStatus.style.color = '#ff9800';
      this.mergeBtn.disabled = false; // Allow trying anyway
    }

    this.volumeList.style.display = 'block';
    this.showStatus('info', `已載入 ${this.volumes.length} 個分卷`);
  }

  async merge() {
    if (this.volumes.length === 0) {
      this.showStatus('error', '請先選擇分卷檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.mergeBtn.disabled = true;
    this.extractedFiles = [];

    try {
      this.updateProgress(10, '讀取分卷...');

      // Read all volumes
      const chunks = [];
      const total = this.volumes.length;

      for (let i = 0; i < total; i++) {
        const vol = this.volumes[i];
        this.updateProgress(10 + (i / total) * 40, `讀取分卷 ${i + 1}/${total}...`);

        const arrayBuffer = await vol.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Check for SPLIT header and skip it
        if (uint8Array[0] === 0x53 && uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4C && uint8Array[3] === 0x49 &&
            uint8Array[4] === 0x54 && uint8Array[5] === 0x00) {
          // Skip 22-byte header
          chunks.push(uint8Array.slice(22));
        } else {
          chunks.push(uint8Array);
        }
      }

      this.updateProgress(55, '合併分卷...');

      // Merge all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      this.updateProgress(70, '解壓縮中...');

      // Try to decompress as ZIP
      try {
        const zip = await JSZip.loadAsync(merged);

        for (const [path, entry] of Object.entries(zip.files)) {
          if (!entry.dir) {
            const content = await entry.async('uint8array');
            const blob = new Blob([content], { type: 'application/octet-stream' });

            this.extractedFiles.push({
              name: path,
              size: blob.size,
              blob: blob
            });
          }
        }

        this.displayResults();
      } catch (e) {
        // Not a ZIP, just save as merged file
        this.mergedBlob = new Blob([merged], { type: 'application/octet-stream' });
        this.downloadBtn.style.display = 'inline-flex';
        this.showStatus('success', '合併完成！（非 ZIP 格式，可直接下載）');
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `完成！耗時 ${processingTime} 秒`);

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        if (this.extractedFiles.length > 0) {
          this.showStatus('success', `解壓縮完成！共 ${this.extractedFiles.length} 個檔案`);
        }
        this.resetBtn.style.display = 'inline-flex';
        this.mergeBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Merge error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '合併失敗，請確認分卷完整且順序正確');
      this.mergeBtn.disabled = false;
    }
  }

  displayResults() {
    let html = '';

    for (let i = 0; i < this.extractedFiles.length; i++) {
      const file = this.extractedFiles[i];
      html += `<div class="result-item">
        <div class="result-info">
          <span class="result-name">${file.name}</span>
          <span class="result-details">${this.formatFileSize(file.size)}</span>
        </div>
        <button class="btn btn-small" onclick="window.mergeArchive.downloadFile(${i})">
          下載
        </button>
      </div>`;
    }

    this.resultList.innerHTML = html;
    this.resultPanel.style.display = 'block';
  }

  downloadFile(index) {
    const file = this.extractedFiles[index];
    if (!file) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file.blob);
    link.download = file.name.split('/').pop();
    link.click();
    URL.revokeObjectURL(link.href);
  }

  download() {
    if (!this.mergedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.mergedBlob);
    link.download = 'merged_archive';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.volumes = [];
    this.extractedFiles = [];
    this.mergedBlob = null;
    this.volumeList.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.mergeBtn.disabled = true;
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
  window.mergeArchive = new MergeArchive();
});

export default MergeArchive;
