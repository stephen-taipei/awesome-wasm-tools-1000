/**
 * CMP-062: Archive Compare
 *
 * Compares contents of two ZIP archives.
 * All processing is done locally in the browser.
 */

class ArchiveComparer {
  constructor() {
    this.zip1 = null;
    this.zip2 = null;
    this.file1 = null;
    this.file2 = null;
    this.results = { onlyA: [], onlyB: [], same: [], diff: [] };
    this.init();
  }

  init() {
    this.uploadArea1 = document.getElementById('uploadArea1');
    this.uploadArea2 = document.getElementById('uploadArea2');
    this.fileInput1 = document.getElementById('fileInput1');
    this.fileInput2 = document.getElementById('fileInput2');
    this.file1Name = document.getElementById('file1Name');
    this.file2Name = document.getElementById('file2Name');
    this.compareResults = document.getElementById('compareResults');
    this.onlyInA = document.getElementById('onlyInA');
    this.onlyInB = document.getElementById('onlyInB');
    this.identical = document.getElementById('identical');
    this.different = document.getElementById('different');
    this.detailResults = document.getElementById('detailResults');
    this.tabContent = document.getElementById('tabContent');
    this.compareBtn = document.getElementById('compareBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    this.setupUploadArea(this.uploadArea1, this.fileInput1, 1);
    this.setupUploadArea(this.uploadArea2, this.fileInput2, 2);

    this.compareBtn.addEventListener('click', () => this.compare());
    this.resetBtn.addEventListener('click', () => this.reset());

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.showTab(e.target.dataset.tab);
      });
    });
  }

  setupUploadArea(area, input, num) {
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => this.handleFile(e, num));

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.loadFile(e.dataTransfer.files[0], num);
      }
    });
  }

  handleFile(event, num) {
    if (event.target.files.length > 0) {
      this.loadFile(event.target.files[0], num);
    }
  }

  async loadFile(file, num) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      if (num === 1) {
        this.zip1 = zip;
        this.file1 = file;
        this.file1Name.textContent = file.name;
      } else {
        this.zip2 = zip;
        this.file2 = file;
        this.file2Name.textContent = file.name;
      }

      this.compareBtn.disabled = !(this.zip1 && this.zip2);
      this.showStatus('success', `${file.name} 載入完成`);

    } catch (error) {
      console.error('File loading error:', error);
      this.showStatus('error', '載入失敗');
    }
  }

  async compare() {
    if (!this.zip1 || !this.zip2) return;

    this.showStatus('info', '比較中...');

    try {
      const files1 = new Map();
      const files2 = new Map();

      // Get file info from archive 1
      for (const path of Object.keys(this.zip1.files)) {
        if (!path.endsWith('/')) {
          const content = await this.zip1.files[path].async('uint8array');
          files1.set(path, this.hashArray(content));
        }
      }

      // Get file info from archive 2
      for (const path of Object.keys(this.zip2.files)) {
        if (!path.endsWith('/')) {
          const content = await this.zip2.files[path].async('uint8array');
          files2.set(path, this.hashArray(content));
        }
      }

      // Compare
      this.results = { onlyA: [], onlyB: [], same: [], diff: [] };

      for (const [path, hash] of files1) {
        if (!files2.has(path)) {
          this.results.onlyA.push(path);
        } else if (files2.get(path) === hash) {
          this.results.same.push(path);
        } else {
          this.results.diff.push(path);
        }
      }

      for (const path of files2.keys()) {
        if (!files1.has(path)) {
          this.results.onlyB.push(path);
        }
      }

      this.displayResults();
      this.showStatus('success', '比較完成！');
      this.resetBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('Compare error:', error);
      this.showStatus('error', '比較失敗');
    }
  }

  hashArray(array) {
    // Simple hash function for comparison
    let hash = 0;
    for (let i = 0; i < array.length; i++) {
      hash = ((hash << 5) - hash) + array[i];
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  displayResults() {
    this.onlyInA.textContent = this.results.onlyA.length;
    this.onlyInB.textContent = this.results.onlyB.length;
    this.identical.textContent = this.results.same.length;
    this.different.textContent = this.results.diff.length;

    this.compareResults.style.display = 'block';
    this.detailResults.style.display = 'block';

    this.showTab('onlyA');
  }

  showTab(tab) {
    const data = this.results[tab === 'onlyA' ? 'onlyA' :
                              tab === 'onlyB' ? 'onlyB' :
                              tab === 'same' ? 'same' : 'diff'];

    if (data.length === 0) {
      this.tabContent.innerHTML = '<p class="no-results">沒有檔案</p>';
      return;
    }

    let html = '<ul class="file-list">';
    data.forEach(path => {
      let icon = '📄';
      if (tab === 'onlyA') icon = '🔴';
      else if (tab === 'onlyB') icon = '🔵';
      else if (tab === 'same') icon = '✅';
      else if (tab === 'diff') icon = '⚠️';

      html += `<li><span class="icon">${icon}</span> ${path}</li>`;
    });
    html += '</ul>';

    this.tabContent.innerHTML = html;
  }

  reset() {
    this.fileInput1.value = '';
    this.fileInput2.value = '';
    this.zip1 = null;
    this.zip2 = null;
    this.file1 = null;
    this.file2 = null;
    this.file1Name.textContent = '';
    this.file2Name.textContent = '';
    this.results = { onlyA: [], onlyB: [], same: [], diff: [] };
    this.compareResults.style.display = 'none';
    this.detailResults.style.display = 'none';
    this.compareBtn.disabled = true;
    this.resetBtn.style.display = 'none';
    this.statusMessage.classList.remove('active');
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.comparer = new ArchiveComparer();
});

export default ArchiveComparer;
