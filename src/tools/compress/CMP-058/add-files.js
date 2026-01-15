/**
 * CMP-058: Add Files to Archive
 *
 * Adds files to existing ZIP archives.
 * All processing is done locally in the browser.
 */

class ArchiveFileAdder {
  constructor() {
    this.zipFile = null;
    this.zip = null;
    this.filesToAdd = [];
    this.modifiedBlob = null;
    this.duplicateHandling = 'replace';
    this.targetFolder = '';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.zipInput = document.getElementById('zipInput');
    this.zipInfo = document.getElementById('zipInfo');
    this.zipName = document.getElementById('zipName');
    this.zipSize = document.getElementById('zipSize');
    this.fileCount = document.getElementById('fileCount');
    this.existingFiles = document.getElementById('existingFiles');
    this.existingFileList = document.getElementById('existingFileList');
    this.addFilesArea = document.getElementById('addFilesArea');
    this.addFilesInput = document.getElementById('addFilesInput');
    this.newFilesList = document.getElementById('newFilesList');
    this.newFiles = document.getElementById('newFiles');
    this.newFilesSize = document.getElementById('newFilesSize');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.duplicateHandlingSelect = document.getElementById('duplicateHandling');
    this.targetFolderInput = document.getElementById('targetFolder');
    this.addBtn = document.getElementById('addBtn');
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

    this.addFilesArea.addEventListener('click', () => this.addFilesInput.click());
    this.addFilesInput.addEventListener('change', (e) => this.handleAddFiles(e));

    this.addFilesArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.addFilesArea.classList.add('dragover');
    });

    this.addFilesArea.addEventListener('dragleave', () => {
      this.addFilesArea.classList.remove('dragover');
    });

    this.addFilesArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.addFilesArea.classList.remove('dragover');
      this.addNewFiles(e.dataTransfer.files);
    });

    this.duplicateHandlingSelect.addEventListener('change', (e) => {
      this.duplicateHandling = e.target.value;
    });

    this.targetFolderInput.addEventListener('change', (e) => {
      this.targetFolder = e.target.value.trim();
      if (this.targetFolder && !this.targetFolder.endsWith('/')) {
        this.targetFolder += '/';
      }
    });

    this.addBtn.addEventListener('click', () => this.addFilesToArchive());
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

      this.displayZipInfo();

      this.updateProgress(100, '載入完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮檔載入完成！');
        this.addFilesArea.style.display = 'block';
        this.optionsPanel.style.display = 'block';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('ZIP loading error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '載入失敗，請確認檔案格式正確');
    }
  }

  displayZipInfo() {
    this.zipName.textContent = this.zipFile.name;
    this.zipSize.textContent = this.formatFileSize(this.zipFile.size);

    const files = Object.keys(this.zip.files).filter(f => !f.endsWith('/'));
    this.fileCount.textContent = `${files.length} 個`;
    this.zipInfo.style.display = 'block';

    // Display existing files
    this.existingFileList.innerHTML = '';
    files.forEach(filename => {
      const file = this.zip.files[filename];
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="file-icon">📄</span>
        <span class="file-name">${filename}</span>
        <span class="file-size">${this.formatFileSize(file._data ? file._data.uncompressedSize : 0)}</span>
      `;
      this.existingFileList.appendChild(item);
    });
    this.existingFiles.style.display = 'block';
  }

  handleAddFiles(event) {
    this.addNewFiles(event.target.files);
  }

  addNewFiles(fileList) {
    for (const file of fileList) {
      // Check for duplicates in the list
      if (!this.filesToAdd.find(f => f.name === file.name)) {
        this.filesToAdd.push(file);
      }
    }
    this.updateNewFilesList();
  }

  updateNewFilesList() {
    this.newFiles.innerHTML = '';
    let total = 0;

    this.filesToAdd.forEach((file, index) => {
      const li = document.createElement('li');

      // Check if file already exists in archive
      const existingPath = this.targetFolder + file.name;
      const exists = this.zip.files[existingPath] !== undefined;

      li.innerHTML = `
        <span class="file-name">${file.name} ${exists ? '(已存在)' : ''}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.newFiles.appendChild(li);
      total += file.size;
    });

    this.newFiles.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.filesToAdd.splice(index, 1);
        this.updateNewFilesList();
      });
    });

    this.newFilesSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.newFilesList.style.display = this.filesToAdd.length > 0 ? 'block' : 'none';
    this.addBtn.style.display = this.filesToAdd.length > 0 ? 'inline-flex' : 'none';
  }

  async addFilesToArchive() {
    if (this.filesToAdd.length === 0) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備加入檔案...');

    try {
      let added = 0;
      let skipped = 0;

      for (let i = 0; i < this.filesToAdd.length; i++) {
        const file = this.filesToAdd[i];
        let targetPath = this.targetFolder + file.name;

        // Check for duplicate
        if (this.zip.files[targetPath]) {
          if (this.duplicateHandling === 'skip') {
            skipped++;
            continue;
          } else if (this.duplicateHandling === 'rename') {
            // Find unique name
            let counter = 1;
            const nameParts = file.name.split('.');
            const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
            const baseName = nameParts.join('.');

            while (this.zip.files[targetPath]) {
              targetPath = `${this.targetFolder}${baseName}_${counter}${ext}`;
              counter++;
            }
          }
        }

        const arrayBuffer = await file.arrayBuffer();
        this.zip.file(targetPath, arrayBuffer);
        added++;

        this.updateProgress((i / this.filesToAdd.length) * 80, `加入: ${file.name}`);
      }

      this.updateProgress(85, '生成壓縮檔...');

      this.modifiedBlob = await this.zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        this.updateProgress(85 + metadata.percent * 0.15, '壓縮中...');
      });

      // Refresh display
      this.displayZipInfo();
      this.filesToAdd = [];
      this.updateNewFilesList();

      this.updateProgress(100, '完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `已加入 ${added} 個檔案${skipped > 0 ? `，跳過 ${skipped} 個` : ''}`);
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Add files error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '加入檔案失敗');
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
    this.addFilesInput.value = '';
    this.zipFile = null;
    this.zip = null;
    this.filesToAdd = [];
    this.modifiedBlob = null;
    this.targetFolder = '';
    this.zipInfo.style.display = 'none';
    this.existingFiles.style.display = 'none';
    this.addFilesArea.style.display = 'none';
    this.newFilesList.style.display = 'none';
    this.optionsPanel.style.display = 'none';
    this.addBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.targetFolderInput.value = '';
    this.duplicateHandlingSelect.value = 'replace';
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
  window.adder = new ArchiveFileAdder();
});

export default ArchiveFileAdder;
