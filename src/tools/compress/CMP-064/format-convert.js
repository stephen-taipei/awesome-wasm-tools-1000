/**
 * CMP-064: Archive Format Conversion
 *
 * Converts between compression formats.
 * All processing is done locally in the browser.
 */

class FormatConverter {
  constructor() {
    this.file = null;
    this.sourceFormat = null;
    this.convertedBlob = null;
    this.targetFormat = 'zip';
    this.compressionLevel = 6;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileFormat = document.getElementById('fileFormat');
    this.targetFormatSelect = document.getElementById('targetFormat');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.outputFilename = document.getElementById('outputFilename');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');

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
        this.setFile(e.dataTransfer.files[0]);
      }
    });

    this.targetFormatSelect.addEventListener('change', (e) => {
      this.targetFormat = e.target.value;
    });

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.setFile(event.target.files[0]);
    }
  }

  setFile(file) {
    this.file = file;

    // Detect format
    if (file.name.endsWith('.zip')) {
      this.sourceFormat = 'zip';
    } else if (file.name.endsWith('.gz') || file.name.endsWith('.gzip')) {
      this.sourceFormat = 'gzip';
    } else {
      this.sourceFormat = 'unknown';
    }

    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
    this.fileFormat.textContent = `格式: ${this.sourceFormat.toUpperCase()}`;

    // Set default output filename
    const baseName = file.name.replace(/\.(zip|gz|gzip|tar\.gz)$/i, '');
    this.outputFilename.value = baseName;

    this.fileInfo.style.display = 'block';
    this.convertBtn.disabled = false;
    this.resetBtn.style.display = 'inline-flex';
  }

  async convert() {
    if (!this.file) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '讀取檔案...');

    try {
      const arrayBuffer = await this.file.arrayBuffer();

      this.updateProgress(20, '解析原始格式...');

      // Extract content based on source format
      let files = [];

      if (this.sourceFormat === 'zip') {
        const zip = await JSZip.loadAsync(arrayBuffer);
        for (const path of Object.keys(zip.files)) {
          if (!path.endsWith('/')) {
            const content = await zip.files[path].async('uint8array');
            files.push({ path, content });
          }
        }
      } else if (this.sourceFormat === 'gzip') {
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
        const fileName = this.file.name.replace(/\.(gz|gzip)$/i, '') || 'file';
        files.push({ path: fileName, content: decompressed });
      }

      this.updateProgress(50, '轉換格式...');

      // Convert to target format
      if (this.targetFormat === 'zip') {
        this.convertedBlob = await this.toZip(files);
      } else if (this.targetFormat === 'gzip') {
        this.convertedBlob = await this.toGzip(files);
      } else if (this.targetFormat === 'tar.gz') {
        this.convertedBlob = await this.toTarGz(files);
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '轉換完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '格式轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗');
    }
  }

  async toZip(files) {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.path, file.content);
    });

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: this.compressionLevel }
    }, (metadata) => {
      this.updateProgress(50 + metadata.percent * 0.45, '壓縮中...');
    });
  }

  async toGzip(files) {
    // GZIP can only compress single file, combine if multiple
    let content;
    if (files.length === 1) {
      content = files[0].content;
    } else {
      // Create a simple tar-like structure for multiple files
      const totalSize = files.reduce((sum, f) => sum + f.content.length + f.path.length + 16, 0);
      content = new Uint8Array(totalSize);
      let offset = 0;
      files.forEach(file => {
        // Simple header: path length (4 bytes) + content length (4 bytes) + path + content
        const view = new DataView(content.buffer);
        view.setUint32(offset, file.path.length, true);
        view.setUint32(offset + 4, file.content.length, true);
        offset += 8;
        for (let i = 0; i < file.path.length; i++) {
          content[offset++] = file.path.charCodeAt(i);
        }
        content.set(file.content, offset);
        offset += file.content.length;
      });
      content = content.slice(0, offset);
    }

    const compressed = pako.gzip(content, { level: this.compressionLevel });
    return new Blob([compressed], { type: 'application/gzip' });
  }

  async toTarGz(files) {
    // Create TAR archive then GZIP it
    const tarData = this.createTar(files);
    const compressed = pako.gzip(tarData, { level: this.compressionLevel });
    return new Blob([compressed], { type: 'application/gzip' });
  }

  createTar(files) {
    const blocks = [];

    files.forEach(file => {
      // TAR header (512 bytes)
      const header = new Uint8Array(512);

      // File name (100 bytes)
      const nameBytes = new TextEncoder().encode(file.path.slice(0, 100));
      header.set(nameBytes, 0);

      // File mode (8 bytes) - octal
      header.set(new TextEncoder().encode('0000644 '), 100);

      // UID (8 bytes)
      header.set(new TextEncoder().encode('0000000 '), 108);

      // GID (8 bytes)
      header.set(new TextEncoder().encode('0000000 '), 116);

      // File size (12 bytes) - octal
      const size = file.content.length.toString(8).padStart(11, '0') + ' ';
      header.set(new TextEncoder().encode(size), 124);

      // Modification time (12 bytes) - octal
      const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
      header.set(new TextEncoder().encode(mtime), 136);

      // Checksum placeholder (8 bytes)
      header.fill(32, 148, 156); // spaces

      // Type flag
      header[156] = 48; // '0' for regular file

      // Calculate checksum
      let checksum = 0;
      for (let i = 0; i < 512; i++) {
        checksum += header[i];
      }
      const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
      header.set(new TextEncoder().encode(checksumStr), 148);

      blocks.push(header);

      // File content (padded to 512 bytes)
      const paddedSize = Math.ceil(file.content.length / 512) * 512;
      const content = new Uint8Array(paddedSize);
      content.set(file.content);
      blocks.push(content);
    });

    // End of archive (two 512-byte blocks of zeros)
    blocks.push(new Uint8Array(1024));

    // Combine all blocks
    const totalSize = blocks.reduce((sum, b) => sum + b.length, 0);
    const tar = new Uint8Array(totalSize);
    let offset = 0;
    blocks.forEach(block => {
      tar.set(block, offset);
      offset += block.length;
    });

    return tar;
  }

  download() {
    if (!this.convertedBlob) return;

    const extensions = { 'zip': '.zip', 'gzip': '.gz', 'tar.gz': '.tar.gz' };
    const filename = `${this.outputFilename.value || 'converted'}${extensions[this.targetFormat]}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
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
    this.file = null;
    this.sourceFormat = null;
    this.convertedBlob = null;
    this.fileInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = '';
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
  window.converter = new FormatConverter();
});

export default FormatConverter;
