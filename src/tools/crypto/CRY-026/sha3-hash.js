/**
 * CRY-026: SHA-3 Hash Tool
 * Uses noble-hashes library for SHA-3 (Keccak) hash computation.
 */

class SHA3Hash {
  constructor() { this.sha3 = null; this.init(); }

  async init() {
    try { this.sha3 = await import('https://cdn.jsdelivr.net/npm/@noble/hashes@1.3.2/+esm'); } catch (e) { console.warn('SHA3 library load failed'); }
    this.inputText = document.getElementById('inputText');
    this.fileInput = document.getElementById('fileInput');
    this.hashResult = document.getElementById('hashResult');
    this.inputType = document.getElementById('inputType');
    this.outputFormat = document.getElementById('outputFormat');
    this.variant = document.getElementById('variant');
    this.hashBtn = document.getElementById('hashBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.uploadArea = document.getElementById('uploadArea');
    this.textInputGroup = document.getElementById('textInputGroup');
    this.fileInputGroup = document.getElementById('fileInputGroup');
    this.fileName = document.getElementById('fileName');
    this.statusMessage = document.getElementById('statusMessage');
    this.hashInfo = document.getElementById('hashInfo');
    this.inputLength = document.getElementById('inputLength');
    this.processTime = document.getElementById('processTime');
    this.selectedFile = null;
    this.bindEvents();
  }

  bindEvents() {
    this.hashBtn.addEventListener('click', () => this.hash());
    this.clearBtn.addEventListener('click', () => this.clear());
    this.copyBtn.addEventListener('click', () => this.copyResult());
    this.inputType.addEventListener('change', (e) => {
      this.textInputGroup.style.display = e.target.value === 'text' ? 'block' : 'none';
      this.fileInputGroup.style.display = e.target.value === 'file' ? 'block' : 'none';
    });
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) { this.selectedFile = e.target.files[0]; this.fileName.textContent = `已選擇: ${this.selectedFile.name}`; }});
    this.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); this.uploadArea.classList.add('dragover'); });
    this.uploadArea.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
    this.uploadArea.addEventListener('drop', (e) => { e.preventDefault(); this.uploadArea.classList.remove('dragover'); if (e.dataTransfer.files[0]) { this.selectedFile = e.dataTransfer.files[0]; this.fileName.textContent = `已選擇: ${this.selectedFile.name}`; }});
  }

  async hash() {
    if (!this.sha3) { this.showStatus('error', 'SHA-3 函式庫載入失敗'); return; }
    let data, dataLength;
    if (this.inputType.value === 'text') {
      if (!this.inputText.value) { this.showStatus('error', '請輸入文字'); return; }
      data = new TextEncoder().encode(this.inputText.value);
      dataLength = this.inputText.value.length + ' 字元';
    } else {
      if (!this.selectedFile) { this.showStatus('error', '請選擇檔案'); return; }
      data = new Uint8Array(await this.selectedFile.arrayBuffer());
      dataLength = this.formatFileSize(data.length);
    }
    const startTime = performance.now();
    try {
      const variant = this.variant.value;
      let hash;
      if (variant === '256') hash = this.sha3.sha3_256(data);
      else if (variant === '384') hash = this.sha3.sha3_384(data);
      else hash = this.sha3.sha3_512(data);

      const fmt = this.outputFormat.value;
      this.hashResult.value = fmt === 'hex' ? this.toHex(hash) : fmt === 'HEX' ? this.toHex(hash).toUpperCase() : this.toBase64(hash);
      this.inputLength.textContent = dataLength;
      this.processTime.textContent = `${(performance.now() - startTime).toFixed(2)} ms`;
      this.hashInfo.style.display = 'block';
      this.showStatus('success', `SHA3-${variant} 雜湊計算完成！`);
    } catch (e) { this.showStatus('error', '雜湊計算失敗：' + e.message); }
  }

  copyResult() { if (this.hashResult.value) { navigator.clipboard.writeText(this.hashResult.value); this.showStatus('success', '已複製到剪貼簿'); }}
  clear() { this.inputText.value = ''; this.hashResult.value = ''; this.selectedFile = null; this.fileName.textContent = ''; this.fileInput.value = ''; this.hashInfo.style.display = 'none'; this.statusMessage.classList.remove('active'); }
  toHex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
  toBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
  formatFileSize(bytes) { if (bytes === 0) return '0 Bytes'; const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; }
  showStatus(type, message) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; if (type === 'success' || type === 'info') setTimeout(() => this.statusMessage.classList.remove('active'), 3000); }
}

document.addEventListener('DOMContentLoaded', () => { window.sha3Hash = new SHA3Hash(); });
export default SHA3Hash;
