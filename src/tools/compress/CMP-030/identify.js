/**
 * CMP-030: Archive Format Identifier
 *
 * Identifies compression format by analyzing file magic bytes.
 * All processing is done locally in the browser.
 */

class ArchiveIdentifier {
  constructor() {
    this.file = null;
    this.formats = [
      {
        name: 'ZIP',
        magic: [0x50, 0x4B, 0x03, 0x04],
        mime: 'application/zip',
        desc: 'ZIP 壓縮檔案，最常見的壓縮格式'
      },
      {
        name: 'ZIP (Empty)',
        magic: [0x50, 0x4B, 0x05, 0x06],
        mime: 'application/zip',
        desc: '空的 ZIP 壓縮檔案'
      },
      {
        name: '7z',
        magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C],
        mime: 'application/x-7z-compressed',
        desc: '7-Zip 壓縮格式，高壓縮比'
      },
      {
        name: 'RAR v5',
        magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00],
        mime: 'application/vnd.rar',
        desc: 'RAR v5 壓縮格式'
      },
      {
        name: 'RAR v4',
        magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00],
        mime: 'application/vnd.rar',
        desc: 'RAR v4 壓縮格式'
      },
      {
        name: 'GZIP',
        magic: [0x1F, 0x8B],
        mime: 'application/gzip',
        desc: 'GNU Zip 壓縮格式'
      },
      {
        name: 'BZIP2',
        magic: [0x42, 0x5A, 0x68],
        mime: 'application/x-bzip2',
        desc: 'BZIP2 壓縮格式，高壓縮比但較慢'
      },
      {
        name: 'XZ',
        magic: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00],
        mime: 'application/x-xz',
        desc: 'XZ 壓縮格式 (LZMA2)，最佳壓縮比'
      },
      {
        name: 'LZMA',
        magic: [0x5D, 0x00, 0x00],
        mime: 'application/x-lzma',
        desc: 'LZMA 壓縮格式'
      },
      {
        name: 'Zstandard',
        magic: [0x28, 0xB5, 0x2F, 0xFD],
        mime: 'application/zstd',
        desc: 'Zstandard 壓縮格式，速度和壓縮比平衡'
      },
      {
        name: 'LZ4',
        magic: [0x04, 0x22, 0x4D, 0x18],
        mime: 'application/x-lz4',
        desc: 'LZ4 壓縮格式，極速壓縮'
      },
      {
        name: 'Snappy (Framed)',
        magic: [0xFF, 0x06, 0x00, 0x00, 0x73, 0x4E, 0x61, 0x50],
        mime: 'application/x-snappy-framed',
        desc: 'Snappy Framed 格式，高速壓縮'
      },
      {
        name: 'TAR (USTAR)',
        magic: null, // TAR has magic at offset 257
        offset: 257,
        magicAtOffset: [0x75, 0x73, 0x74, 0x61, 0x72],
        mime: 'application/x-tar',
        desc: 'TAR 檔案格式（USTAR 格式）'
      }
    ];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.identifyBtn = document.getElementById('identifyBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.resultPanel = document.getElementById('resultPanel');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.formatType = document.getElementById('formatType');
    this.mimeType = document.getElementById('mimeType');
    this.magicBytes = document.getElementById('magicBytes');
    this.formatDesc = document.getElementById('formatDesc');
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

    this.identifyBtn.addEventListener('click', () => this.identify());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    this.file = file;
    this.identifyBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  async identify() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Get first 300 bytes for analysis
      const header = uint8Array.slice(0, 300);

      let identifiedFormat = null;

      // Check each format
      for (const format of this.formats) {
        if (format.offset !== undefined) {
          // Check magic at specific offset
          if (this.checkMagicAtOffset(header, format.magicAtOffset, format.offset)) {
            identifiedFormat = format;
            break;
          }
        } else if (format.magic) {
          // Check magic at start
          if (this.checkMagic(header, format.magic)) {
            identifiedFormat = format;
            break;
          }
        }
      }

      // Display results
      this.fileName.textContent = this.file.name;
      this.fileSize.textContent = this.formatFileSize(this.file.size);

      if (identifiedFormat) {
        this.formatType.textContent = identifiedFormat.name;
        this.formatType.style.backgroundColor = '#4CAF50';
        this.formatType.style.color = 'white';
        this.formatType.style.padding = '4px 12px';
        this.formatType.style.borderRadius = '4px';
        this.mimeType.textContent = identifiedFormat.mime;
        this.formatDesc.textContent = identifiedFormat.desc;

        // Show magic bytes
        const magic = identifiedFormat.magic || identifiedFormat.magicAtOffset;
        if (magic) {
          this.magicBytes.textContent = magic.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        }

        this.showStatus('success', `識別成功: ${identifiedFormat.name}`);
      } else {
        this.formatType.textContent = '未知格式';
        this.formatType.style.backgroundColor = '#FF5722';
        this.formatType.style.color = 'white';
        this.formatType.style.padding = '4px 12px';
        this.formatType.style.borderRadius = '4px';
        this.mimeType.textContent = 'unknown';
        this.formatDesc.textContent = '無法識別此檔案的壓縮格式';

        // Show first bytes
        const firstBytes = Array.from(header.slice(0, 8));
        this.magicBytes.textContent = firstBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

        this.showStatus('warning', '無法識別壓縮格式');
      }

      this.resultPanel.style.display = 'block';
      this.resetBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('Identification error:', error);
      this.showStatus('error', '識別失敗，請重試');
    }
  }

  checkMagic(data, magic) {
    for (let i = 0; i < magic.length; i++) {
      if (data[i] !== magic[i]) {
        return false;
      }
    }
    return true;
  }

  checkMagicAtOffset(data, magic, offset) {
    if (data.length < offset + magic.length) {
      return false;
    }
    for (let i = 0; i < magic.length; i++) {
      if (data[offset + i] !== magic[i]) {
        return false;
      }
    }
    return true;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.resultPanel.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.identifyBtn.disabled = true;
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
  window.identifier = new ArchiveIdentifier();
});

export default ArchiveIdentifier;
