/**
 * CMP-063: Archive Merge
 *
 * Merges multiple ZIP archives into one.
 * All processing is done locally in the browser.
 */

class ArchiveMerger {
  constructor() {
    this.archives = [];
    this.mergedBlob = null;
    this.duplicateHandling = 'keep-first';
    this.createFolders = 'no';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.archiveList = document.getElementById('archiveList');
    this.archiveItems = document.getElementById('archiveItems');
    this.totalInfo = document.getElementById('totalInfo');
    this.duplicateHandlingSelect = document.getElementById('duplicateHandling');
    this.createFoldersSelect = document.getElementById('createFolders');
    this.outputFilename = document.getElementById('outputFilename');
    this.mergeBtn = document.getElementById('mergeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.mergedFiles = document.getElementById('mergedFiles');
    this.finalSize = document.getElementById('finalSize');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFiles(e));

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
      this.addFiles(e.dataTransfer.files);
    });

    this.duplicateHandlingSelect.addEventListener('change', (e) => {
      this.duplicateHandling = e.target.value;
    });

    this.createFoldersSelect.addEventListener('change', (e) => {
      this.createFolders = e.target.value;
    });

    this.mergeBtn.addEventListener('click', () => this.merge());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFiles(event) {
    this.addFiles(event.target.files);
  }

  async addFiles(fileList) {
    for (const file of fileList) {
      if (file.name.endsWith('.zip')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const fileCount = Object.keys(zip.files).filter(f => !f.endsWith('/')).length;

          this.archives.push({
            name: file.name,
            size: file.size,
            zip: zip,
            fileCount: fileCount
          });
        } catch (error) {
          console.error('Error loading:', file.name, error);
        }
      }
    }

    this.updateArchiveList();
    this.mergeBtn.disabled = this.archives.length < 2;
    this.resetBtn.style.display = this.archives.length > 0 ? 'inline-flex' : 'none';
  }

  updateArchiveList() {
    this.archiveItems.innerHTML = '';
    let totalSize = 0;
    let totalFiles = 0;

    this.archives.forEach((archive, index) => {
      const item = document.createElement('div');
      item.className = 'archive-item';
      item.innerHTML = `
        <span class="archive-order">${index + 1}</span>
        <span class="archive-name">📦 ${archive.name}</span>
        <span class="archive-info">${archive.fileCount} 檔案 / ${this.formatFileSize(archive.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.archiveItems.appendChild(item);
      totalSize += archive.size;
      totalFiles += archive.fileCount;
    });

    this.archiveItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.archives.splice(index, 1);
        this.updateArchiveList();
        this.mergeBtn.disabled = this.archives.length < 2;
      });
    });

    this.totalInfo.textContent = `共 ${this.archives.length} 個壓縮檔，${totalFiles} 個檔案，${this.formatFileSize(totalSize)}`;
    this.archiveList.style.display = this.archives.length > 0 ? 'block' : 'none';
  }

  async merge() {
    if (this.archives.length < 2) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備合併...');

    try {
      const mergedZip = new JSZip();
      const existingPaths = new Set();
      let totalFilesAdded = 0;

      for (let i = 0; i < this.archives.length; i++) {
        const archive = this.archives[i];
        const files = Object.keys(archive.zip.files).filter(f => !f.endsWith('/'));
        const baseName = archive.name.replace('.zip', '');

        for (let j = 0; j < files.length; j++) {
          const originalPath = files[j];
          let targetPath = this.createFolders === 'yes'
            ? `${baseName}/${originalPath}`
            : originalPath;

          // Handle duplicates
          if (existingPaths.has(targetPath)) {
            if (this.duplicateHandling === 'keep-first') {
              continue;
            } else if (this.duplicateHandling === 'rename') {
              let counter = 1;
              const parts = targetPath.split('.');
              const ext = parts.length > 1 ? '.' + parts.pop() : '';
              const base = parts.join('.');
              while (existingPaths.has(targetPath)) {
                targetPath = `${base}_${counter}${ext}`;
                counter++;
              }
            }
            // keep-last: will overwrite
          }

          const content = await archive.zip.files[originalPath].async('uint8array');
          mergedZip.file(targetPath, content);
          existingPaths.add(targetPath);
          totalFilesAdded++;
        }

        this.updateProgress(((i + 1) / this.archives.length) * 70,
          `合併: ${archive.name}`);
      }

      this.updateProgress(75, '生成壓縮檔...');

      this.mergedBlob = await mergedZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        this.updateProgress(75 + metadata.percent * 0.2, '壓縮中...');
      });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.mergedFiles.textContent = `${totalFilesAdded} 個`;
      this.finalSize.textContent = this.formatFileSize(this.mergedBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '合併完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '合併完成！');
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Merge error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '合併失敗');
    }
  }

  download() {
    if (!this.mergedBlob) return;

    const filename = `${this.outputFilename.value || 'merged'}.zip`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.mergedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.archives = [];
    this.mergedBlob = null;
    this.archiveList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.mergeBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = 'merged';
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
  window.merger = new ArchiveMerger();
});

export default ArchiveMerger;
