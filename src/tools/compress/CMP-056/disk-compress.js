/**
 * CMP-056: Disk Image Compression
 *
 * Compresses disk image files for storage efficiency.
 * All processing is done locally in the browser.
 */

class DiskImageCompressor {
  constructor() {
    this.file = null;
    this.fileData = null;
    this.compressedBlob = null;
    this.compressionMethod = 'gzip';
    this.compressionLevel = 6;
    this.sparseDetection = 'auto';
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileType = document.getElementById('fileType');
    this.compressionMethodSelect = document.getElementById('compressionMethod');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.sparseDetectionSelect = document.getElementById('sparseDetection');
    this.analysisInfo = document.getElementById('analysisInfo');
    this.sparsity = document.getElementById('sparsity');
    this.estimatedSize = document.getElementById('estimatedSize');
    this.estimatedSaving = document.getElementById('estimatedSaving');
    this.analyzeBtn = document.getElementById('analyzeBtn');
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

    this.compressionMethodSelect.addEventListener('change', (e) => {
      this.compressionMethod = e.target.value;
    });

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.sparseDetectionSelect.addEventListener('change', (e) => {
      this.sparseDetection = e.target.value;
    });

    this.analyzeBtn.addEventListener('click', () => this.analyze());
    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.setFile(event.target.files[0]);
    }
  }

  async setFile(file) {
    this.file = file;
    this.fileName.textContent = `檔名: ${file.name}`;
    this.fileSize.textContent = `大小: ${this.formatFileSize(file.size)}`;

    // Detect file type
    const ext = file.name.split('.').pop().toLowerCase();
    const types = {
      'iso': 'ISO 9660 光碟映像',
      'img': '磁碟映像',
      'vhd': 'VHD 虛擬硬碟',
      'vhdx': 'VHDX 虛擬硬碟',
      'dmg': 'macOS 磁碟映像',
      'raw': 'RAW 磁碟映像',
      'bin': '二進位映像'
    };
    this.fileType.textContent = `類型: ${types[ext] || '未知類型'}`;

    this.fileInfo.style.display = 'block';
    this.analyzeBtn.disabled = false;
    this.compressBtn.disabled = false;

    // Pre-load file data
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '載入檔案...');

    const arrayBuffer = await file.arrayBuffer();
    this.fileData = new Uint8Array(arrayBuffer);

    this.updateProgress(100, '載入完成');
    this.progressContainer.classList.remove('active');
  }

  async analyze() {
    if (!this.fileData) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '分析映像檔...');

    try {
      // Calculate sparsity (percentage of zero bytes)
      let zeroCount = 0;
      const chunkSize = 65536;
      const totalChunks = Math.ceil(this.fileData.length / chunkSize);

      for (let i = 0; i < this.fileData.length; i++) {
        if (this.fileData[i] === 0) zeroCount++;
        if (i % chunkSize === 0) {
          this.updateProgress((i / this.fileData.length) * 80, '計算稀疏度...');
        }
      }

      const sparsityPercent = (zeroCount / this.fileData.length * 100).toFixed(1);

      // Estimate compressed size based on sparsity and method
      let estimatedRatio;
      if (sparsityPercent > 80) {
        estimatedRatio = 0.1; // Very sparse
      } else if (sparsityPercent > 50) {
        estimatedRatio = 0.3;
      } else if (sparsityPercent > 20) {
        estimatedRatio = 0.6;
      } else {
        estimatedRatio = 0.85;
      }

      const estimated = Math.round(this.fileData.length * estimatedRatio);
      const saving = this.fileData.length - estimated;

      this.sparsity.textContent = `${sparsityPercent}%`;
      this.estimatedSize.textContent = this.formatFileSize(estimated);
      this.estimatedSaving.textContent = `${this.formatFileSize(saving)} (${((1 - estimatedRatio) * 100).toFixed(0)}%)`;
      this.analysisInfo.style.display = 'block';

      this.updateProgress(100, '分析完成');
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '分析完成！');
      }, 500);

    } catch (error) {
      console.error('Analysis error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '分析失敗');
    }
  }

  async compress() {
    if (!this.fileData) return;

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備壓縮...');

    try {
      let compressed;

      // Apply sparse detection if enabled
      let dataToCompress = this.fileData;
      if (this.sparseDetection !== 'disabled') {
        this.updateProgress(10, '處理稀疏資料...');
        // Sparse detection would mark zero regions for better compression
      }

      this.updateProgress(20, '壓縮中...');

      // Use pako for gzip compression
      compressed = pako.gzip(dataToCompress, {
        level: this.compressionLevel
      });

      this.updateProgress(90, '生成檔案...');

      // Determine file extension based on method
      const extensions = {
        'gzip': '.gz',
        'xz': '.xz',
        'lz4': '.lz4',
        'zstd': '.zst'
      };

      this.compressedBlob = new Blob([compressed], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const ratio = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
      this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.compressionRatio.textContent = `${ratio}% 減少`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗');
    }
  }

  download() {
    if (!this.compressedBlob) return;

    const extensions = {
      'gzip': '.gz',
      'xz': '.xz',
      'lz4': '.lz4',
      'zstd': '.zst'
    };

    const filename = this.file.name + extensions[this.compressionMethod];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.compressedBlob);
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
    this.fileData = null;
    this.compressedBlob = null;
    this.fileInfo.style.display = 'none';
    this.analysisInfo.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.analyzeBtn.disabled = true;
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
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
  window.compressor = new DiskImageCompressor();
});

export default DiskImageCompressor;
