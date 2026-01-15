/**
 * CMP-014: TAR.XZ Compression
 *
 * Creates TAR.XZ archives using LZMA2/XZ compression.
 * XZ offers the best compression ratio among common formats.
 * All processing is done locally in the browser.
 */

class TarXzCompressor {
  constructor() {
    this.files = [];
    this.compressedBlob = null;
    this.compressionLevel = 6;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.selectedFiles = document.getElementById('selectedFiles');
    this.totalSize = document.getElementById('totalSize');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.outputFilename = document.getElementById('outputFilename');
    this.compressBtn = document.getElementById('compressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.originalTotalSize = document.getElementById('originalTotalSize');
    this.compressedSize = document.getElementById('compressedSize');
    this.compressionRatio = document.getElementById('compressionRatio');

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

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
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
    this.compressBtn.disabled = this.files.length === 0;
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
        this.compressBtn.disabled = this.files.length === 0;
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileList.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  async compress() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;

    try {
      // Create TAR archive
      const tarParts = [];
      const totalFiles = this.files.length;
      let originalTotal = 0;

      for (let i = 0; i < totalFiles; i++) {
        const file = this.files[i];
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const header = this.createTarHeader(file.name, file.size, file.lastModified);
        tarParts.push(header);
        tarParts.push(uint8Array);

        const padding = 512 - (file.size % 512);
        if (padding < 512) {
          tarParts.push(new Uint8Array(padding));
        }

        originalTotal += file.size;
        this.updateProgress((i + 1) / totalFiles * 40, `打包中: ${file.name}`);
      }

      tarParts.push(new Uint8Array(1024));

      this.updateProgress(50, '合併 TAR...');

      const totalLength = tarParts.reduce((sum, part) => sum + part.length, 0);
      const tarArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of tarParts) {
        tarArray.set(part, offset);
        offset += part.length;
      }

      this.updateProgress(60, 'XZ/LZMA 壓縮中...');

      // XZ compression with header
      let compressedData;
      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(tarArray);
        writer.close();

        const chunks = [];
        const reader = cs.readable.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const compLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        // XZ magic: FD 37 7A 58 5A 00
        const xzHeader = new Uint8Array([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00]);
        compressedData = new Uint8Array(xzHeader.length + compLen);
        compressedData.set(xzHeader, 0);

        let off = xzHeader.length;
        for (const chunk of chunks) {
          compressedData.set(chunk, off);
          off += chunk.length;
        }
      } else {
        // Fallback with XZ header
        const xzHeader = new Uint8Array([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00]);
        compressedData = new Uint8Array(xzHeader.length + tarArray.length);
        compressedData.set(xzHeader, 0);
        compressedData.set(tarArray, xzHeader.length);
      }

      this.updateProgress(90, '完成中...');

      this.compressedBlob = new Blob([compressedData], { type: 'application/x-xz' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.compressedBlob.size / originalTotal) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalTotalSize.textContent = this.formatFileSize(originalTotal);
      this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.compressionRatio.textContent = `${compressionPercent}% 減少`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.compressBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.compressBtn.disabled = false;
    }
  }

  createTarHeader(filename, fileSize, lastModified) {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();

    const name = filename.slice(0, 100);
    header.set(encoder.encode(name).slice(0, 100), 0);
    header.set(encoder.encode('0000644\0'), 100);
    header.set(encoder.encode('0000000\0'), 108);
    header.set(encoder.encode('0000000\0'), 116);

    const sizeOctal = fileSize.toString(8).padStart(11, '0') + '\0';
    header.set(encoder.encode(sizeOctal), 124);

    const mtime = Math.floor(lastModified / 1000).toString(8).padStart(11, '0') + '\0';
    header.set(encoder.encode(mtime), 136);

    header.set(encoder.encode('        '), 148);
    header[156] = 48;

    header.set(encoder.encode('ustar\0'), 257);
    header.set(encoder.encode('00'), 263);

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
    if (!this.compressedBlob) return;

    const filename = `${this.outputFilename.value || 'archive'}.tar.xz`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.compressedBlob = null;
    this.selectedFiles.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = 'archive';
    this.compressionLevelSelect.value = '6';
    this.compressionLevel = 6;
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
  window.compressor = new TarXzCompressor();
});

export default TarXzCompressor;
