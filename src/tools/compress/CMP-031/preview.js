/**
 * CMP-031: Archive Preview
 *
 * Previews archive contents without extracting.
 * All processing is done locally in the browser.
 */

class ArchivePreview {
  constructor() {
    this.file = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.previewBtn = document.getElementById('previewBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewPanel = document.getElementById('previewPanel');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.fileTree = document.getElementById('fileTree');
    this.statsPanel = document.getElementById('statsPanel');
    this.totalFiles = document.getElementById('totalFiles');
    this.totalFolders = document.getElementById('totalFolders');
    this.compressedTotal = document.getElementById('compressedTotal');
    this.uncompressedTotal = document.getElementById('uncompressedTotal');
    this.compressionRatio = document.getElementById('compressionRatio');
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

    this.previewBtn.addEventListener('click', () => this.preview());
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
    this.previewBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  async preview() {
    if (!this.file) {
      this.showStatus('error', '請先選擇壓縮檔');
      return;
    }

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Build file list
      const files = [];
      const folders = new Set();
      let totalUncompressed = 0;

      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) {
          folders.add(path);
        } else {
          const parts = path.split('/');
          for (let i = 1; i < parts.length; i++) {
            folders.add(parts.slice(0, i).join('/') + '/');
          }

          files.push({
            path: path,
            name: parts[parts.length - 1],
            size: entry._data ? entry._data.uncompressedSize : 0,
            compressedSize: entry._data ? entry._data.compressedSize : 0,
            date: entry.date
          });

          totalUncompressed += entry._data ? entry._data.uncompressedSize : 0;
        }
      }

      // Display archive info
      this.archiveInfo.innerHTML = `
        <div class="info-row">
          <strong>檔案名稱:</strong> ${this.file.name}
        </div>
        <div class="info-row">
          <strong>壓縮格式:</strong> ZIP
        </div>
      `;

      // Build tree view
      this.fileTree.innerHTML = this.buildTreeView(files);

      // Stats
      this.totalFiles.textContent = `${files.length} 個`;
      this.totalFolders.textContent = `${folders.size} 個`;
      this.compressedTotal.textContent = this.formatFileSize(this.file.size);
      this.uncompressedTotal.textContent = this.formatFileSize(totalUncompressed);

      const ratio = totalUncompressed > 0
        ? ((1 - this.file.size / totalUncompressed) * 100).toFixed(1)
        : 0;
      this.compressionRatio.textContent = `${ratio}%`;

      this.previewPanel.style.display = 'block';
      this.statsPanel.style.display = 'block';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', '預覽完成');

    } catch (error) {
      console.error('Preview error:', error);
      this.showStatus('error', '預覽失敗，請確認檔案格式正確');
    }
  }

  buildTreeView(files) {
    // Sort files by path
    files.sort((a, b) => a.path.localeCompare(b.path));

    let html = '<ul class="tree-list">';

    for (const file of files) {
      const icon = this.getFileIcon(file.name);
      html += `
        <li class="tree-item">
          <span class="tree-icon">${icon}</span>
          <span class="tree-name">${file.path}</span>
          <span class="tree-size">${this.formatFileSize(file.size)}</span>
        </li>
      `;
    }

    html += '</ul>';
    return html;
  }

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      'txt': '📄',
      'pdf': '📕',
      'doc': '📘', 'docx': '📘',
      'xls': '📗', 'xlsx': '📗',
      'ppt': '📙', 'pptx': '📙',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
      'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬',
      'zip': '📦', 'rar': '📦', '7z': '📦',
      'js': '📜', 'ts': '📜', 'py': '📜', 'java': '📜',
      'html': '🌐', 'css': '🎨',
      'json': '📋', 'xml': '📋'
    };
    return icons[ext] || '📄';
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.previewPanel.style.display = 'none';
    this.statsPanel.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.previewBtn.disabled = true;
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
  window.preview = new ArchivePreview();
});

export default ArchivePreview;
