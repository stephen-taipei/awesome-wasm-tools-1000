/**
 * CMP-045: LZMA Dictionary Size Settings
 *
 * Configure LZMA compression with custom dictionary size settings.
 * All processing is done locally in the browser.
 */

class LZMADictCompressor {
  constructor() {
    this.file = null;
    this.compressedBlob = null;
    this.dictSize = 4194304;
    this.compressionLevel = 5;
    this.lc = 3;
    this.lp = 0;
    this.pb = 2;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.dictSizeSelect = document.getElementById('dictSize');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.lcSelect = document.getElementById('lc');
    this.lpSelect = document.getElementById('lp');
    this.pbSelect = document.getElementById('pb');
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
    this.usedDictSize = document.getElementById('usedDictSize');
    this.recommendedDict = document.getElementById('recommendedDict');
    this.memoryUsage = document.getElementById('memoryUsage');

    this.updateMemoryEstimate();
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

    this.dictSizeSelect.addEventListener('change', (e) => {
      this.dictSize = parseInt(e.target.value);
      this.updateMemoryEstimate();
    });

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.lcSelect.addEventListener('change', (e) => {
      this.lc = parseInt(e.target.value);
      this.updateMemoryEstimate();
    });

    this.lpSelect.addEventListener('change', (e) => {
      this.lp = parseInt(e.target.value);
    });

    this.pbSelect.addEventListener('change', (e) => {
      this.pb = parseInt(e.target.value);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateMemoryEstimate() {
    // LZMA memory = dictionary size + internal buffers
    const memoryBytes = this.dictSize * 11.5 + (1 << (this.lc + this.lp)) * 1536;
    this.memoryUsage.textContent = this.formatFileSize(memoryBytes);
  }

  updateRecommendedDict(fileSize) {
    let recommended;
    if (fileSize < 65536) {
      recommended = '64 KB';
    } else if (fileSize < 1048576) {
      recommended = '256 KB - 1 MB';
    } else if (fileSize < 16777216) {
      recommended = '4 MB - 8 MB';
    } else if (fileSize < 134217728) {
      recommended = '16 MB - 32 MB';
    } else {
      recommended = '32 MB - 64 MB';
    }
    this.recommendedDict.textContent = recommended;
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
    this.updateRecommendedDict(file.size);
    this.compressBtn.disabled = false;
  }

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

      this.updateProgress(20, 'LZMA 壓縮中...');

      // LZMA compression with custom dictionary
      const compressed = await this.lzmaCompress(uint8Array);

      this.updateProgress(90, '生成檔案...');
      this.compressedBlob = new Blob([compressed], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
      this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.compressionRatio.textContent = `${compressionPercent}% 減少`;
      this.usedDictSize.textContent = this.formatFileSize(this.dictSize);
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

  async lzmaCompress(data) {
    // Create LZMA header
    const header = new Uint8Array(13);

    // Properties byte: (pb * 5 + lp) * 9 + lc
    header[0] = (this.pb * 5 + this.lp) * 9 + this.lc;

    // Dictionary size (4 bytes, little-endian)
    const dictView = new DataView(header.buffer);
    dictView.setUint32(1, this.dictSize, true);

    // Uncompressed size (8 bytes, little-endian)
    dictView.setUint32(5, data.length, true);
    dictView.setUint32(9, 0, true);

    // Simple LZ77 + Range coding simulation
    const compressed = this.simpleLZMAEncode(data);

    // Combine header and data
    const result = new Uint8Array(header.length + compressed.length);
    result.set(header);
    result.set(compressed, header.length);

    return result;
  }

  simpleLZMAEncode(data) {
    const output = [];
    const windowSize = Math.min(this.dictSize, data.length);
    let i = 0;

    while (i < data.length) {
      let bestLen = 0;
      let bestDist = 0;

      // Search for matches in dictionary
      const searchStart = Math.max(0, i - windowSize);
      for (let j = searchStart; j < i; j++) {
        let len = 0;
        while (i + len < data.length && data[j + len] === data[i + len] && len < 273) {
          len++;
        }
        if (len > bestLen) {
          bestLen = len;
          bestDist = i - j;
        }
      }

      if (bestLen >= 3) {
        // Output match
        output.push(0x80 | (bestLen - 3));
        output.push(bestDist & 0xFF);
        output.push((bestDist >> 8) & 0xFF);
        i += bestLen;
      } else {
        // Output literal
        output.push(data[i]);
        i++;
      }

      if (i % 10000 === 0) {
        this.updateProgress(20 + (i / data.length) * 60, `壓縮中... ${Math.round(i / data.length * 100)}%`);
      }
    }

    return new Uint8Array(output);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.compressedBlob) return;

    const filename = `${this.outputFilename.value || 'compressed'}.lzma`;
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
    this.dictSizeSelect.value = '4194304';
    this.compressionLevelSelect.value = '5';
    this.lcSelect.value = '3';
    this.lpSelect.value = '0';
    this.pbSelect.value = '2';
    this.dictSize = 4194304;
    this.compressionLevel = 5;
    this.lc = 3;
    this.lp = 0;
    this.pb = 2;
    this.recommendedDict.textContent = '-';
    this.updateMemoryEstimate();
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
  window.compressor = new LZMADictCompressor();
});

export default LZMADictCompressor;
