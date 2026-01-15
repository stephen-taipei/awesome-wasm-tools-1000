/**
 * CMP-060: Update Files in Archive
 *
 * Updates/replaces files in ZIP archives.
 * All processing is done locally in the browser.
 */

class ArchiveFileUpdater {
  constructor() {
    this.zipFile = null;
    this.zip = null;
    this.updates = new Map(); // path -> new file data
    this.selectedFile = null;
    this.modifiedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.zipInput = document.getElementById('zipInput');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.archiveName = document.getElementById('archiveName');
    this.fileCount = document.getElementById('fileCount');
    this.fileList = document.getElementById('fileList');
    this.fileTree = document.getElementById('fileTree');
    this.updateArea = document.getElementById('updateArea');
    this.updateTarget = document.getElementById('updateTarget');
    this.updateInput = document.getElementById('updateInput');
    this.updateQueue = document.getElementById('updateQueue');
    this.updateList = document.getElementById('updateList');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.zipInput.click());
    this.zipInput.addEventListener('change', (e) => this.handleZipSelect(e));

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
      if (e.dataTransfer.files.length > 0) {
        this.loadZip(e.dataTransfer.files[0]);
      }
    });

    this.updateArea.addEventListener('click', () => this.updateInput.click());
    this.updateInput.addEventListener('change', (e) => this.handleUpdateFile(e));

    this.applyBtn.addEventListener('click', () => this.applyUpdates());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleZipSelect(event) {
    if (event.target.files.length > 0) {
      this.loadZip(event.target.files[0]);
    }
  }

  async loadZip(file) {
    this.zipFile = file;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取壓縮檔...');

    try {
      const arrayBuffer = await file.arrayBuffer();

      this.updateProgress(50, '解析 ZIP 結構...');
      this.zip = await JSZip.loadAsync(arrayBuffer);

      this.displayArchiveInfo();
      this.displayFileList();

      this.updateProgress(100, '載入完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮檔載入完成！請選擇要更新的檔案');
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('ZIP loading error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '載入失敗，請確認檔案格式正確');
    }
  }

  displayArchiveInfo() {
    this.archiveName.textContent = this.zipFile.name;

    const files = Object.keys(this.zip.files).filter(f => !f.endsWith('/'));
    this.fileCount.textContent = `${files.length} 個`;
    this.archiveInfo.style.display = 'block';
  }

  displayFileList() {
    this.fileTree.innerHTML = '';

    const files = Object.keys(this.zip.files).filter(f => !f.endsWith('/'));

    files.forEach(filename => {
      const file = this.zip.files[filename];
      const isUpdated = this.updates.has(filename);

      const item = document.createElement('div');
      item.className = `file-item clickable ${isUpdated ? 'updated' : ''}`;
      item.dataset.filename = filename;
      item.innerHTML = `
        <span class="file-icon">${isUpdated ? '🔄' : '📄'}</span>
        <span class="file-name">${filename}</span>
        <span class="file-size">${this.formatFileSize(file._data ? file._data.uncompressedSize : 0)}</span>
        <button class="update-btn">選擇更新</button>
      `;
      this.fileTree.appendChild(item);
    });

    // Bind click events
    this.fileTree.querySelectorAll('.update-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = e.target.closest('.file-item').dataset.filename;
        this.selectFileForUpdate(filename);
      });
    });

    this.fileList.style.display = 'block';
  }

  selectFileForUpdate(filename) {
    this.selectedFile = filename;
    this.updateTarget.textContent = `更新: ${filename}`;
    this.updateArea.style.display = 'block';
    this.updateInput.value = '';

    // Scroll to update area
    this.updateArea.scrollIntoView({ behavior: 'smooth' });
  }

  async handleUpdateFile(event) {
    if (!this.selectedFile || event.target.files.length === 0) return;

    const newFile = event.target.files[0];

    try {
      const arrayBuffer = await newFile.arrayBuffer();
      this.updates.set(this.selectedFile, {
        data: arrayBuffer,
        name: newFile.name,
        size: newFile.size
      });

      this.showStatus('success', `已排程更新: ${this.selectedFile}`);
      this.displayFileList();
      this.displayUpdateQueue();

      this.applyBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('File read error:', error);
      this.showStatus('error', '讀取檔案失敗');
    }
  }

  displayUpdateQueue() {
    this.updateList.innerHTML = '';

    if (this.updates.size === 0) {
      this.updateQueue.style.display = 'none';
      return;
    }

    this.updates.forEach((update, path) => {
      const item = document.createElement('div');
      item.className = 'update-item';
      item.innerHTML = `
        <span class="file-icon">🔄</span>
        <span class="file-name">${path}</span>
        <span class="file-size">→ ${this.formatFileSize(update.size)}</span>
        <button class="remove-btn" data-path="${path}">✕</button>
      `;
      this.updateList.appendChild(item);
    });

    // Bind remove buttons
    this.updateList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.target.dataset.path;
        this.updates.delete(path);
        this.displayFileList();
        this.displayUpdateQueue();
        if (this.updates.size === 0) {
          this.applyBtn.style.display = 'none';
        }
      });
    });

    this.updateQueue.style.display = 'block';
  }

  async applyUpdates() {
    if (this.updates.size === 0) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '套用更新...');

    try {
      let updated = 0;

      for (const [path, update] of this.updates) {
        this.zip.file(path, update.data);
        updated++;
        this.updateProgress((updated / this.updates.size) * 60, `更新: ${path}`);
      }

      this.updateProgress(70, '重建壓縮檔...');

      this.modifiedBlob = await this.zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        this.updateProgress(70 + metadata.percent * 0.25, '壓縮中...');
      });

      // Clear updates and refresh
      this.updates.clear();
      this.displayFileList();
      this.displayUpdateQueue();

      this.updateProgress(100, '更新完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `已更新 ${updated} 個檔案`);
        this.downloadBtn.style.display = 'inline-flex';
        this.applyBtn.style.display = 'none';
      }, 500);

    } catch (error) {
      console.error('Update error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '更新失敗');
    }
  }

  download() {
    if (!this.modifiedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.modifiedBlob);
    link.download = this.zipFile.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.zipInput.value = '';
    this.updateInput.value = '';
    this.zipFile = null;
    this.zip = null;
    this.updates.clear();
    this.selectedFile = null;
    this.modifiedBlob = null;
    this.archiveInfo.style.display = 'none';
    this.fileList.style.display = 'none';
    this.updateArea.style.display = 'none';
    this.updateQueue.style.display = 'none';
    this.applyBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
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
  window.updater = new ArchiveFileUpdater();
});

export default ArchiveFileUpdater;
