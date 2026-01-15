/**
 * CMP-008: TAR Archive Creator
 *
 * Creates TAR archives from multiple files.
 * TAR is a file archive format that combines files without compression.
 * All processing is done locally in the browser.
 */

class TarPacker {
  constructor() {
    this.files = [];
    this.tarBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.selectedFiles = document.getElementById('selectedFiles');
    this.totalSize = document.getElementById('totalSize');
    this.outputFilename = document.getElementById('outputFilename');
    this.packBtn = document.getElementById('packBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.fileCount = document.getElementById('fileCount');
    this.packedSize = document.getElementById('packedSize');

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
      this.addFiles(e.dataTransfer.files);
    });

    this.packBtn.addEventListener('click', () => this.pack());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addFiles(event.target.files);
  }

  addFiles(fileList) {
    for (const file of fileList) {
      this.files.push(file);
    }
    this.updateFileList();
    this.packBtn.disabled = this.files.length === 0;
  }

  updateFileList() {
    this.selectedFiles.innerHTML = '';
    let total = 0;

    this.files.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.selectedFiles.appendChild(li);
      total += file.size;
    });

    this.selectedFiles.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.files.splice(index, 1);
        this.updateFileList();
        this.packBtn.disabled = this.files.length === 0;
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileList.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  async pack() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.packBtn.disabled = true;

    try {
      const tarParts = [];
      const totalFiles = this.files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = this.files[i];
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create TAR header for this file
        const header = this.createTarHeader(file.name, file.size, file.lastModified);
        tarParts.push(header);
        tarParts.push(uint8Array);

        // Pad to 512-byte boundary
        const padding = 512 - (file.size % 512);
        if (padding < 512) {
          tarParts.push(new Uint8Array(padding));
        }

        this.updateProgress((i + 1) / totalFiles * 90, `打包中: ${file.name}`);
      }

      // Add end-of-archive marker (two 512-byte blocks of zeros)
      tarParts.push(new Uint8Array(1024));

      this.updateProgress(95, '完成中...');

      // Combine all parts
      const totalLength = tarParts.reduce((sum, part) => sum + part.length, 0);
      const tarArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of tarParts) {
        tarArray.set(part, offset);
        offset += part.length;
      }

      this.tarBlob = new Blob([tarArray], { type: 'application/x-tar' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.fileCount.textContent = `${this.files.length} 個檔案`;
      this.packedSize.textContent = this.formatFileSize(this.tarBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '打包完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '打包完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.packBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Packing error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '打包失敗，請重試');
      this.packBtn.disabled = false;
    }
  }

  createTarHeader(filename, fileSize, lastModified) {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();

    // Truncate filename to 100 characters max
    const name = filename.slice(0, 100);

    // File name (0-99)
    const nameBytes = encoder.encode(name);
    header.set(nameBytes.slice(0, 100), 0);

    // File mode (100-107) - default 644
    const mode = encoder.encode('0000644\0');
    header.set(mode, 100);

    // Owner UID (108-115)
    const uid = encoder.encode('0000000\0');
    header.set(uid, 108);

    // Owner GID (116-123)
    const gid = encoder.encode('0000000\0');
    header.set(gid, 116);

    // File size in octal (124-135)
    const sizeOctal = fileSize.toString(8).padStart(11, '0') + '\0';
    header.set(encoder.encode(sizeOctal), 124);

    // Last modification time in octal (136-147)
    const mtime = Math.floor(lastModified / 1000).toString(8).padStart(11, '0') + '\0';
    header.set(encoder.encode(mtime), 136);

    // Checksum placeholder (148-155) - spaces initially
    const checksumPlaceholder = encoder.encode('        ');
    header.set(checksumPlaceholder, 148);

    // Type flag (156) - '0' for regular file
    header[156] = 48; // ASCII '0'

    // Link name (157-256) - empty for regular files

    // USTAR magic (257-262)
    const ustar = encoder.encode('ustar\0');
    header.set(ustar, 257);

    // USTAR version (263-264)
    header.set(encoder.encode('00'), 263);

    // Owner user name (265-296)
    header.set(encoder.encode('user'), 265);

    // Owner group name (297-328)
    header.set(encoder.encode('group'), 297);

    // Calculate and set checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
    header.set(encoder.encode(checksumStr), 148);

    return header;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.tarBlob) return;

    const filename = `${this.outputFilename.value || 'archive'}.tar`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.tarBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.tarBlob = null;
    this.selectedFiles.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.packBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = 'archive';
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
  window.packer = new TarPacker();
});

export default TarPacker;
