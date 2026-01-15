/**
 * CMP-061: Archive Search
 *
 * Searches files within ZIP archives.
 * All processing is done locally in the browser.
 */

class ArchiveSearcher {
  constructor() {
    this.file = null;
    this.zip = null;
    this.files = [];
    this.searchResults = [];
    this.selectedFiles = new Set();
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.searchPanel = document.getElementById('searchPanel');
    this.searchQuery = document.getElementById('searchQuery');
    this.searchScope = document.getElementById('searchScope');
    this.searchMode = document.getElementById('searchMode');
    this.caseSensitive = document.getElementById('caseSensitive');
    this.searchBtn = document.getElementById('searchBtn');
    this.archiveInfo = document.getElementById('archiveInfo');
    this.totalFiles = document.getElementById('totalFiles');
    this.matchCount = document.getElementById('matchCount');
    this.searchResultsPanel = document.getElementById('searchResults');
    this.resultsList = document.getElementById('resultsList');
    this.extractSelectedBtn = document.getElementById('extractSelectedBtn');
    this.resetBtn = document.getElementById('resetBtn');
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

    this.searchBtn.addEventListener('click', () => this.search());
    this.searchQuery.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });

    this.extractSelectedBtn.addEventListener('click', () => this.extractSelected());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadArchive(event.target.files[0]);
    }
  }

  async loadArchive(file) {
    this.file = file;

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.zip = await JSZip.loadAsync(arrayBuffer);

      // Get file list
      this.files = Object.keys(this.zip.files)
        .filter(f => !f.endsWith('/'))
        .map(path => {
          const parts = path.split('/');
          return {
            path: path,
            filename: parts[parts.length - 1],
            extension: path.includes('.') ? path.split('.').pop().toLowerCase() : '',
            size: this.zip.files[path]._data ? this.zip.files[path]._data.uncompressedSize : 0
          };
        });

      this.totalFiles.textContent = `${this.files.length} 個`;
      this.matchCount.textContent = '-';

      this.searchPanel.style.display = 'block';
      this.archiveInfo.style.display = 'block';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', '壓縮檔載入完成！');

    } catch (error) {
      console.error('Archive loading error:', error);
      this.showStatus('error', '載入失敗，請確認檔案格式正確');
    }
  }

  search() {
    const query = this.searchQuery.value;
    if (!query) {
      this.showStatus('error', '請輸入搜尋關鍵字');
      return;
    }

    const scope = this.searchScope.value;
    const mode = this.searchMode.value;
    const caseSensitive = this.caseSensitive.checked;

    this.searchResults = this.files.filter(file => {
      let target;
      switch (scope) {
        case 'filename':
          target = file.filename;
          break;
        case 'path':
          target = file.path;
          break;
        case 'extension':
          target = file.extension;
          break;
        default:
          target = file.filename;
      }

      return this.matchQuery(target, query, mode, caseSensitive);
    });

    this.displayResults();
    this.matchCount.textContent = `${this.searchResults.length} 個符合`;
  }

  matchQuery(target, query, mode, caseSensitive) {
    if (!caseSensitive) {
      target = target.toLowerCase();
      query = query.toLowerCase();
    }

    switch (mode) {
      case 'contains':
        return target.includes(query);
      case 'startsWith':
        return target.startsWith(query);
      case 'endsWith':
        return target.endsWith(query);
      case 'exact':
        return target === query;
      case 'regex':
        try {
          const flags = caseSensitive ? '' : 'i';
          const regex = new RegExp(query, flags);
          return regex.test(target);
        } catch {
          return false;
        }
      default:
        return target.includes(query);
    }
  }

  displayResults() {
    this.resultsList.innerHTML = '';
    this.selectedFiles.clear();

    if (this.searchResults.length === 0) {
      this.resultsList.innerHTML = '<p class="no-results">沒有找到符合的檔案</p>';
      this.searchResultsPanel.style.display = 'block';
      this.extractSelectedBtn.style.display = 'none';
      return;
    }

    this.searchResults.forEach(file => {
      const item = document.createElement('div');
      item.className = 'file-item selectable';
      item.innerHTML = `
        <input type="checkbox" class="file-checkbox" data-path="${file.path}">
        <span class="file-icon">📄</span>
        <span class="file-name" title="${file.path}">${file.filename}</span>
        <span class="file-path">${file.path}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
      `;
      this.resultsList.appendChild(item);
    });

    // Bind checkbox events
    this.resultsList.querySelectorAll('.file-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedFiles.add(e.target.dataset.path);
        } else {
          this.selectedFiles.delete(e.target.dataset.path);
        }
        this.updateExtractButton();
      });
    });

    this.searchResultsPanel.style.display = 'block';
  }

  updateExtractButton() {
    this.extractSelectedBtn.style.display = this.selectedFiles.size > 0 ? 'inline-flex' : 'none';
  }

  async extractSelected() {
    if (this.selectedFiles.size === 0) return;

    try {
      const newZip = new JSZip();

      for (const path of this.selectedFiles) {
        const content = await this.zip.files[path].async('uint8array');
        newZip.file(path, content);
      }

      const blob = await newZip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `search_results_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', `已提取 ${this.selectedFiles.size} 個檔案`);

    } catch (error) {
      console.error('Extract error:', error);
      this.showStatus('error', '提取失敗');
    }
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.zip = null;
    this.files = [];
    this.searchResults = [];
    this.selectedFiles.clear();
    this.searchPanel.style.display = 'none';
    this.archiveInfo.style.display = 'none';
    this.searchResultsPanel.style.display = 'none';
    this.extractSelectedBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.statusMessage.classList.remove('active');
    this.searchQuery.value = '';
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
  window.searcher = new ArchiveSearcher();
});

export default ArchiveSearcher;
