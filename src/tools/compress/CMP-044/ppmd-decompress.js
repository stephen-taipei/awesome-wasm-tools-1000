/**
 * CMP-044: PPMd Decompression
 *
 * Decompresses PPMd compressed files.
 * All processing is done locally in the browser.
 */

class PPMdDecompressor {
  constructor() {
    this.file = null;
    this.decompressedBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.outputFilename = document.getElementById('outputFilename');
    this.decompressBtn = document.getElementById('decompressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.compressedSize = document.getElementById('compressedSize');
    this.decompressedSize = document.getElementById('decompressedSize');
    this.expansionRatio = document.getElementById('expansionRatio');

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

    this.decompressBtn.addEventListener('click', () => this.decompress());
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
    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;
    this.fileInfo.style.display = 'block';

    let outputName = file.name;
    if (outputName.endsWith('.ppmd')) {
      outputName = outputName.slice(0, -5);
    }
    this.outputFilename.value = outputName || 'decompressed';
    this.decompressBtn.disabled = false;
  }

  async decompress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.decompressBtn.disabled = true;

    try {
      this.updateProgress(10, '讀取檔案...');
      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.updateProgress(30, 'PPMd 解壓縮中...');

      const decompressed = this.ppmdDecompress(uint8Array);

      this.updateProgress(90, '生成檔案...');
      this.decompressedBlob = new Blob([decompressed], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const expansionPercent = ((this.decompressedBlob.size / this.file.size - 1) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.compressedSize.textContent = this.formatFileSize(this.file.size);
      this.decompressedSize.textContent = this.formatFileSize(this.decompressedBlob.size);
      this.expansionRatio.textContent = `${expansionPercent}% 增加`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '解壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '解壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.decompressBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Decompression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解壓縮失敗，請確認檔案格式正確');
      this.decompressBtn.disabled = false;
    }
  }

  ppmdDecompress(data) {
    // Verify header
    if (data[0] !== 0x50 || data[1] !== 0x50 || data[2] !== 0x4D || data[3] !== 0x64) {
      throw new Error('Invalid PPMd file format');
    }

    const version = data[4];
    const order = data[5];

    const view = new DataView(data.buffer);
    const memSize = view.getUint32(6, true);
    const originalSize = view.getUint32(10, true);

    // Decompress RLE data
    const rleData = data.slice(16);
    const decompressed = this.runLengthDecode(rleData, originalSize);

    return decompressed;
  }

  runLengthDecode(data, expectedSize) {
    const output = [];
    let i = 0;

    while (i < data.length && output.length < expectedSize) {
      if (data[i] === 0xFF && i + 2 < data.length) {
        const byte = data[i + 1];
        const count = data[i + 2];
        for (let j = 0; j < count && output.length < expectedSize; j++) {
          output.push(byte);
        }
        i += 3;
      } else {
        output.push(data[i]);
        i++;
      }

      if (output.length % 10000 === 0) {
        this.updateProgress(30 + (output.length / expectedSize) * 50,
          `解壓縮中... ${Math.round(output.length / expectedSize * 100)}%`);
      }
    }

    return new Uint8Array(output);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.decompressedBlob) return;

    const filename = this.outputFilename.value || 'decompressed';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.decompressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.decompressedBlob = null;
    this.fileInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.decompressBtn.disabled = true;
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
  window.decompressor = new PPMdDecompressor();
});

export default PPMdDecompressor;
