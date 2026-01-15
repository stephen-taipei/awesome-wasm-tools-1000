/**
 * CRY-040: File Checksum Calculator
 * Calculates multiple hash checksums for files.
 */

class ChecksumCalculator {
  constructor() { this.file = null; this.hashLib = null; this.init(); }

  async init() {
    try { this.hashLib = await import('https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.2/+esm'); } catch (e) { console.warn('Hash library load failed'); }
    this.fileInput = document.getElementById('fileInput');
    this.uploadArea = document.getElementById('uploadArea');
    this.selectBtn = document.getElementById('selectBtn');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileType = document.getElementById('fileType');
    this.calcMD5 = document.getElementById('calcMD5');
    this.calcSHA1 = document.getElementById('calcSHA1');
    this.calcSHA256 = document.getElementById('calcSHA256');
    this.calcSHA384 = document.getElementById('calcSHA384');
    this.calcSHA512 = document.getElementById('calcSHA512');
    this.calcCRC32 = document.getElementById('calcCRC32');
    this.calculateBtn = document.getElementById('calculateBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.checksumResults = document.getElementById('checksumResults');
    this.resultsList = document.getElementById('resultsList');
    this.copyAllBtn = document.getElementById('copyAllBtn');
    this.verifyHash = document.getElementById('verifyHash');
    this.verifyResult = document.getElementById('verifyResult');
    this.verifyIcon = document.getElementById('verifyIcon');
    this.verifyText = document.getElementById('verifyText');
    this.statusMessage = document.getElementById('statusMessage');
    this.results = {};
    this.bindEvents();
  }

  bindEvents() {
    this.selectBtn.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('click', (e) => { if (e.target !== this.selectBtn) this.fileInput.click(); });
    this.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));
    this.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadArea.classList.add('dragover'); });
    this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]);
    });
    this.calculateBtn.addEventListener('click', () => this.calculate());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyAllBtn.addEventListener('click', () => this.copyAllResults());
    this.verifyHash.addEventListener('input', () => this.verifyChecksum());
  }

  handleFile(file) {
    if (!file) return;
    this.file = file;
    this.fileName.textContent = file.name;
    this.fileSize.textContent = this.formatSize(file.size);
    this.fileType.textContent = file.type || '未知';
    this.fileInfo.style.display = 'block';
    this.calculateBtn.disabled = false;
    this.checksumResults.style.display = 'none';
    this.verifyResult.style.display = 'none';
    this.showStatus('info', '檔案已載入，點擊計算校驗和');
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  // CRC32 implementation
  crc32(data) {
    const table = this.getCRC32Table();
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  }

  getCRC32Table() {
    if (this._crc32Table) return this._crc32Table;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    this._crc32Table = table;
    return table;
  }

  async calculate() {
    if (!this.file) return;

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.progressText.textContent = '讀取檔案...';
    this.calculateBtn.disabled = true;
    this.results = {};

    try {
      const buffer = await this.file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const tasks = [];
      let progress = 0;

      if (this.calcMD5.checked && this.hashLib) {
        tasks.push({ name: 'MD5', fn: () => this.toHex(this.hashLib.md5(data)) });
      }
      if (this.calcSHA1.checked && this.hashLib) {
        tasks.push({ name: 'SHA-1', fn: () => this.toHex(this.hashLib.sha1(data)) });
      }
      if (this.calcSHA256.checked) {
        tasks.push({ name: 'SHA-256', fn: async () => {
          const hash = await crypto.subtle.digest('SHA-256', data);
          return this.toHex(new Uint8Array(hash));
        }});
      }
      if (this.calcSHA384.checked) {
        tasks.push({ name: 'SHA-384', fn: async () => {
          const hash = await crypto.subtle.digest('SHA-384', data);
          return this.toHex(new Uint8Array(hash));
        }});
      }
      if (this.calcSHA512.checked) {
        tasks.push({ name: 'SHA-512', fn: async () => {
          const hash = await crypto.subtle.digest('SHA-512', data);
          return this.toHex(new Uint8Array(hash));
        }});
      }
      if (this.calcCRC32.checked) {
        tasks.push({ name: 'CRC32', fn: () => this.crc32(data) });
      }

      if (tasks.length === 0) {
        this.showStatus('error', '請至少選擇一種校驗和');
        this.progressContainer.classList.remove('active');
        this.calculateBtn.disabled = false;
        return;
      }

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        this.progressText.textContent = `計算 ${task.name}...`;
        this.progressFill.style.width = `${((i + 0.5) / tasks.length) * 100}%`;

        await new Promise(r => setTimeout(r, 10));
        this.results[task.name] = await task.fn();

        this.progressFill.style.width = `${((i + 1) / tasks.length) * 100}%`;
      }

      this.displayResults();
      this.progressContainer.classList.remove('active');
      this.calculateBtn.disabled = false;
      this.showStatus('success', '校驗和計算完成！');
    } catch (e) {
      this.progressContainer.classList.remove('active');
      this.calculateBtn.disabled = false;
      this.showStatus('error', '計算失敗：' + e.message);
    }
  }

  displayResults() {
    this.resultsList.innerHTML = '';
    for (const [name, hash] of Object.entries(this.results)) {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `<label>${name}</label><input type="text" value="${hash}" readonly class="mono" style="flex: 1;"><button class="btn btn-small" onclick="navigator.clipboard.writeText('${hash}');this.textContent='已複製';setTimeout(()=>this.textContent='複製',1000)">複製</button>`;
      this.resultsList.appendChild(row);
    }
    this.checksumResults.style.display = 'block';

    // Auto-verify if hash is entered
    if (this.verifyHash.value) this.verifyChecksum();
  }

  verifyChecksum() {
    const input = this.verifyHash.value.trim().toLowerCase();
    if (!input || Object.keys(this.results).length === 0) {
      this.verifyResult.style.display = 'none';
      return;
    }

    let match = null;
    for (const [name, hash] of Object.entries(this.results)) {
      if (hash.toLowerCase() === input) {
        match = name;
        break;
      }
    }

    this.verifyResult.style.display = 'flex';
    if (match) {
      this.verifyResult.className = 'result-box success';
      this.verifyIcon.textContent = '✓';
      this.verifyText.textContent = `校驗成功！符合 ${match}`;
    } else {
      this.verifyResult.className = 'result-box error';
      this.verifyIcon.textContent = '✗';
      this.verifyText.textContent = '校驗失敗！沒有符合的雜湊值';
    }
  }

  copyAllResults() {
    const text = Object.entries(this.results)
      .map(([name, hash]) => `${name}: ${hash}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    this.showStatus('success', '已複製全部校驗和');
  }

  clear() {
    this.file = null;
    this.fileInput.value = '';
    this.fileInfo.style.display = 'none';
    this.checksumResults.style.display = 'none';
    this.verifyResult.style.display = 'none';
    this.verifyHash.value = '';
    this.calculateBtn.disabled = true;
    this.results = {};
    this.statusMessage.classList.remove('active');
  }

  toHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.checksumCalculator = new ChecksumCalculator(); });
export default ChecksumCalculator;
