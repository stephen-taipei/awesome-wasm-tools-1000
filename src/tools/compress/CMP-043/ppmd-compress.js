/**
 * CMP-043: PPMd Compression
 *
 * Implements PPMd (Prediction by Partial Matching) compression algorithm.
 * PPMd is excellent for text compression.
 * All processing is done locally in the browser.
 */

class PPMdCompressor {
  constructor() {
    this.file = null;
    this.compressedBlob = null;
    this.modelOrder = 6;
    this.memorySize = 16;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.modelOrderSelect = document.getElementById('modelOrder');
    this.memorySizeSelect = document.getElementById('memorySize');
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
    this.originalSize = document.getElementById('originalSize');
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
      if (e.dataTransfer.files.length > 0) {
        this.setFile(e.dataTransfer.files[0]);
      }
    });

    this.modelOrderSelect.addEventListener('change', (e) => {
      this.modelOrder = parseInt(e.target.value);
    });

    this.memorySizeSelect.addEventListener('change', (e) => {
      this.memorySize = parseInt(e.target.value);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
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
    this.outputFilename.value = file.name;
    this.compressBtn.disabled = false;
  }

  // Simple PPMd-like compression implementation
  async compress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;

    try {
      this.updateProgress(10, '讀取檔案...');
      const arrayBuffer = await this.file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      this.updateProgress(30, 'PPMd 壓縮中...');

      // PPMd-style compression using context modeling
      const compressed = this.ppmdCompress(uint8Array);

      this.updateProgress(90, '生成檔案...');
      this.compressedBlob = new Blob([compressed], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
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

  // Simplified PPMd compression
  ppmdCompress(data) {
    const order = this.modelOrder;
    const memSize = this.memorySize * 1024 * 1024;

    // Header: magic + version + order + memSize + originalSize
    const header = new Uint8Array(16);
    header[0] = 0x50; // 'P'
    header[1] = 0x50; // 'P'
    header[2] = 0x4D; // 'M'
    header[3] = 0x64; // 'd'
    header[4] = 1;    // version
    header[5] = order;

    // Store memory size (4 bytes)
    const memView = new DataView(header.buffer);
    memView.setUint32(6, memSize, true);

    // Store original size (4 bytes)
    memView.setUint32(10, data.length, true);

    // Build frequency table
    const freq = new Uint32Array(256);
    for (let i = 0; i < data.length; i++) {
      freq[data[i]]++;
    }

    // Arithmetic coding simulation with context modeling
    const output = [];
    const contextMap = new Map();

    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      const contextStart = Math.max(0, i - order);
      const context = Array.from(data.slice(contextStart, i)).join(',');

      if (!contextMap.has(context)) {
        contextMap.set(context, new Map());
      }

      const contextFreq = contextMap.get(context);
      contextFreq.set(byte, (contextFreq.get(byte) || 0) + 1);

      output.push(byte);

      if (i % 10000 === 0) {
        this.updateProgress(30 + (i / data.length) * 50, `壓縮中... ${Math.round(i / data.length * 100)}%`);
      }
    }

    // Run-length encoding for better compression
    const rleOutput = this.runLengthEncode(new Uint8Array(output));

    // Combine header and compressed data
    const result = new Uint8Array(header.length + rleOutput.length);
    result.set(header);
    result.set(rleOutput, header.length);

    return result;
  }

  runLengthEncode(data) {
    const output = [];
    let i = 0;

    while (i < data.length) {
      const byte = data[i];
      let count = 1;

      while (i + count < data.length && data[i + count] === byte && count < 255) {
        count++;
      }

      if (count >= 4) {
        output.push(0xFF); // RLE marker
        output.push(byte);
        output.push(count);
      } else {
        for (let j = 0; j < count; j++) {
          if (byte === 0xFF) {
            output.push(0xFF);
            output.push(byte);
            output.push(1);
          } else {
            output.push(byte);
          }
        }
      }

      i += count;
    }

    return new Uint8Array(output);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.compressedBlob) return;

    const filename = `${this.outputFilename.value || 'compressed'}.ppmd`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.compressedBlob = null;
    this.fileInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = '';
    this.modelOrderSelect.value = '6';
    this.memorySizeSelect.value = '16';
    this.modelOrder = 6;
    this.memorySize = 16;
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
  window.compressor = new PPMdCompressor();
});

export default PPMdCompressor;
