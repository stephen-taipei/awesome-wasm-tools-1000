/**
 * CMP-059: Delete Files from Archive
 *
 * Removes files from ZIP archives.
 * All processing is done locally in the browser.
 */

class ArchiveFileDeleter {
  constructor() {
    this.file = null;
    this.zip = null;
    this.selectedFiles = new Set();
    this.modifiedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.archiveName = document.getElementById('archiveName');
    this.archiveSize = document.getElementById('archiveSize');
    this.totalFiles = document.getElementById('totalFiles');
    this.selectedCount = document.getElementById('selectedCount');
    this.fileList = document.getElementById('fileList');
    this.fileTree = document.getElementById('fileTree');
    this.selectAllBtn = document.getElementById('selectAllBtn');
    this.deselectAllBtn = document.getElementById('deselectAllBtn');
    this.deleteBtn = document.getElementById('deleteBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
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
      if (e.dataTransfer.files.length > 0) {
        this.loadArchive(e.dataTransfer.files[0]);
      }
    });

    this.selectAllBtn.addEventListener('click', () => this.selectAll());
    this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
    this.deleteBtn.addEventListener('click', () => this.deleteSelected());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadArchive(event.target.files[0]);
    }
  }

  async loadArchive(file) {
    this.file = file;
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
        this.showStatus('success', '壓縮檔載入完成！');
        this.deleteBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Archive loading error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '載入失敗，請確認檔案格式正確');
    }
  }

  displayArchiveInfo() {
    this.archiveName.textContent = this.file.name;
    this.archiveSize.textContent = this.formatFileSize(this.file.size);

    const files = Object.keys(this.zip.files).filter(f => !f.endsWith('/'));
    this.totalFiles.textContent = `${files.length} 個`;
    this.archiveInfo.style.display = 'block';
  }

  displayFileList() {
    this.fileTree.innerHTML = '';
    this.selectedFiles.clear();

    const files = Object.keys(this.zip.files).filter(f => !f.endsWith('/'));

    files.forEach(filename => {
      const file = this.zip.files[filename];
      const item = document.createElement('div');
      item.className = 'file-item selectable';
      item.innerHTML = `
        <input type="checkbox" class="file-checkbox" data-filename="${filename}">
        <span class="file-icon">📄</span>
        <span class="file-name">${filename}</span>
        <span class="file-size">${this.formatFileSize(file._data ? file._data.uncompressedSize : 0)}</span>
      `;
      this.fileTree.appendChild(item);
    });

    // Bind checkbox events
    this.fileTree.querySelectorAll('.file-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const filename = e.target.dataset.filename;
        if (e.target.checked) {
          this.selectedFiles.add(filename);
        } else {
          this.selectedFiles.delete(filename);
        }
        this.updateSelectedCount();
      });
    });

    this.fileList.style.display = 'block';
  }

  updateSelectedCount() {
    this.selectedCount.textContent = `${this.selectedFiles.size} 個`;
  }

  selectAll() {
    this.fileTree.querySelectorAll('.file-checkbox').forEach(checkbox => {
      checkbox.checked = true;
      this.selectedFiles.add(checkbox.dataset.filename);
    });
    this.updateSelectedCount();
  }

  deselectAll() {
    this.fileTree.querySelectorAll('.file-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    this.selectedFiles.clear();
    this.updateSelectedCount();
  }

  async deleteSelected() {
    if (this.selectedFiles.size === 0) {
      this.showStatus('error', '請先選擇要刪除的檔案');
      return;
    }

    // Confirm deletion
    const totalFiles = Object.keys(this.zip.files).filter(f => !f.endsWith('/')).length;
    if (this.selectedFiles.size === totalFiles) {
      this.showStatus('error', '無法刪除所有檔案');
      return;
    }

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備刪除...');

    try {
      let deleted = 0;

      for (const filename of this.selectedFiles) {
        this.zip.remove(filename);
        deleted++;
        this.updateProgress((deleted / this.selectedFiles.size) * 60, `刪除: ${filename}`);
      }

      this.updateProgress(70, '重建壓縮檔...');

      this.modifiedBlob = await this.zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        this.updateProgress(70 + metadata.percent * 0.25, '壓縮中...');
      });

      // Refresh display
      this.selectedFiles.clear();
      this.displayArchiveInfo();
      this.displayFileList();

      this.updateProgress(100, '刪除完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `已刪除 ${deleted} 個檔案`);
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Delete error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '刪除失敗');
    }
  }

  download() {
    if (!this.modifiedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.modifiedBlob);
    link.download = this.file.name;
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
    this.zip = null;
    this.selectedFiles.clear();
    this.modifiedBlob = null;
    this.archiveInfo.style.display = 'none';
    this.fileList.style.display = 'none';
    this.deleteBtn.style.display = 'none';
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
  window.deleter = new ArchiveFileDeleter();
});

export default ArchiveFileDeleter;
