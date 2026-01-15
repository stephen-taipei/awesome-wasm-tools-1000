/**
 * CMP-049: Memory Usage Optimization
 *
 * Optimizes memory usage during compression for large files.
 * All processing is done locally in the browser.
 */

class MemoryOptimizer {
  constructor() {
    this.file = null;
    this.compressedBlob = null;
    this.memoryMode = 'auto';
    this.chunkSize = 1048576;
    this.gcInterval = 50;
    this.stats = {
      peakMemory: 0,
      currentMemory: 0,
      gcCount: 0,
      chunksProcessed: 0
    };
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.memoryWarning = document.getElementById('memoryWarning');
    this.memoryModeSelect = document.getElementById('memoryMode');
    this.chunkSizeSelect = document.getElementById('chunkSize');
    this.gcIntervalSelect = document.getElementById('gcInterval');
    this.outputFilename = document.getElementById('outputFilename');
    this.compressBtn = document.getElementById('compressBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Memory status elements
    this.availableMemory = document.getElementById('availableMemory');
    this.usedMemory = document.getElementById('usedMemory');
    this.memoryUsageFill = document.getElementById('memoryUsageFill');
    this.memoryUsage = document.getElementById('memoryUsage');

    // Memory monitor elements
    this.peakMemory = document.getElementById('peakMemory');
    this.currentMemory = document.getElementById('currentMemory');
    this.gcCount = document.getElementById('gcCount');
    this.chunksProcessed = document.getElementById('chunksProcessed');

    // Stats elements
    this.processTime = document.getElementById('processTime');
    this.originalSize = document.getElementById('originalSize');
    this.compressedSize = document.getElementById('compressedSize');
    this.compressionRatio = document.getElementById('compressionRatio');
    this.maxMemoryUsed = document.getElementById('maxMemoryUsed');

    this.bindEvents();
    this.updateMemoryStatus();
    this.startMemoryMonitor();
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

    this.memoryModeSelect.addEventListener('change', (e) => {
      this.memoryMode = e.target.value;
      this.applyMemoryMode();
    });

    this.chunkSizeSelect.addEventListener('change', (e) => {
      this.chunkSize = parseInt(e.target.value);
    });

    this.gcIntervalSelect.addEventListener('change', (e) => {
      this.gcInterval = parseInt(e.target.value);
    });

    this.compressBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateMemoryStatus() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.jsHeapSizeLimit;
      const usagePercent = (used / total * 100).toFixed(1);

      this.availableMemory.textContent = this.formatFileSize(total);
      this.usedMemory.textContent = this.formatFileSize(used);
      this.memoryUsageFill.style.width = `${usagePercent}%`;
      this.memoryUsage.textContent = `${usagePercent}%`;
    } else {
      this.availableMemory.textContent = '無法檢測';
    }
  }

  startMemoryMonitor() {
    setInterval(() => {
      this.updateMemoryStatus();
      this.updateMemoryMonitor();
    }, 1000);
  }

  updateMemoryMonitor() {
    if (performance.memory) {
      const current = performance.memory.usedJSHeapSize / (1024 * 1024);
      this.stats.currentMemory = current;
      if (current > this.stats.peakMemory) {
        this.stats.peakMemory = current;
      }

      this.peakMemory.textContent = `${this.stats.peakMemory.toFixed(2)} MB`;
      this.currentMemory.textContent = `${current.toFixed(2)} MB`;
    }
    this.gcCount.textContent = this.stats.gcCount;
    this.chunksProcessed.textContent = this.stats.chunksProcessed;
  }

  applyMemoryMode() {
    switch (this.memoryMode) {
      case 'low':
        this.chunkSizeSelect.value = '65536';
        this.chunkSize = 65536;
        this.gcIntervalSelect.value = '10';
        this.gcInterval = 10;
        break;
      case 'normal':
        this.chunkSizeSelect.value = '1048576';
        this.chunkSize = 1048576;
        this.gcIntervalSelect.value = '50';
        this.gcInterval = 50;
        break;
      case 'high':
        this.chunkSizeSelect.value = '16777216';
        this.chunkSize = 16777216;
        this.gcIntervalSelect.value = '0';
        this.gcInterval = 0;
        break;
      case 'auto':
        // Auto mode based on file size (will be applied when file is selected)
        break;
    }
  }

  autoSelectMode(fileSize) {
    if (this.memoryMode !== 'auto') return;

    const availableMemory = performance.memory?.jsHeapSizeLimit || 2147483648;

    if (fileSize > availableMemory * 0.5) {
      this.chunkSizeSelect.value = '65536';
      this.chunkSize = 65536;
      this.gcIntervalSelect.value = '10';
      this.gcInterval = 10;
    } else if (fileSize > availableMemory * 0.2) {
      this.chunkSizeSelect.value = '262144';
      this.chunkSize = 262144;
      this.gcIntervalSelect.value = '50';
      this.gcInterval = 50;
    } else {
      this.chunkSizeSelect.value = '1048576';
      this.chunkSize = 1048576;
      this.gcIntervalSelect.value = '100';
      this.gcInterval = 100;
    }
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

    // Show warning for large files
    const availableMemory = performance.memory?.jsHeapSizeLimit || 2147483648;
    if (file.size > availableMemory * 0.3) {
      this.memoryWarning.style.display = 'block';
    } else {
      this.memoryWarning.style.display = 'none';
    }

    this.autoSelectMode(file.size);
    this.compressBtn.disabled = false;
  }

  triggerGC() {
    // Attempt to trigger garbage collection
    if (window.gc) {
      window.gc();
    }
    this.stats.gcCount++;
    this.gcCount.textContent = this.stats.gcCount;
  }

  async compress() {
    if (!this.file) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.stats.peakMemory = 0;
    this.stats.gcCount = 0;
    this.stats.chunksProcessed = 0;

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compressBtn.disabled = true;

    try {
      this.updateProgress(5, '讀取檔案...');

      const chunks = [];
      const totalChunks = Math.ceil(this.file.size / this.chunkSize);
      let processedBytes = 0;

      // Process file in chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const blob = this.file.slice(start, end);
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Compress chunk
        const compressed = pako.deflate(uint8Array, { level: 6 });
        chunks.push(compressed);

        processedBytes += end - start;
        this.stats.chunksProcessed = i + 1;

        // Update progress
        const progress = (processedBytes / this.file.size) * 90;
        this.updateProgress(progress, `壓縮中... ${this.stats.chunksProcessed}/${totalChunks} 區塊`);
        this.updateMemoryMonitor();

        // Trigger GC if needed
        if (this.gcInterval > 0 && (i + 1) % this.gcInterval === 0) {
          this.triggerGC();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      this.updateProgress(95, '合併壓縮資料...');

      // Create final compressed file with header
      const totalCompressedSize = chunks.reduce((sum, c) => sum + c.length + 4, 0);
      const header = new Uint8Array(20);
      header[0] = 0x4D; // 'M'
      header[1] = 0x4F; // 'O'
      header[2] = 0x50; // 'P'
      header[3] = 0x54; // 'T'

      const headerView = new DataView(header.buffer);
      headerView.setUint32(4, this.file.size, true);
      headerView.setUint32(8, this.chunkSize, true);
      headerView.setUint32(12, totalChunks, true);
      headerView.setUint32(16, totalCompressedSize, true);

      const result = new Uint8Array(header.length + totalCompressedSize);
      result.set(header);

      let offset = header.length;
      for (const chunk of chunks) {
        const sizeView = new DataView(result.buffer);
        sizeView.setUint32(offset, chunk.length, true);
        result.set(chunk, offset + 4);
        offset += chunk.length + 4;
      }

      this.compressedBlob = new Blob([result], { type: 'application/octet-stream' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const compressionPercent = ((1 - this.compressedBlob.size / this.file.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSize.textContent = this.formatFileSize(this.file.size);
      this.compressedSize.textContent = this.formatFileSize(this.compressedBlob.size);
      this.compressionRatio.textContent = `${compressionPercent}% 減少`;
      this.maxMemoryUsed.textContent = `${this.stats.peakMemory.toFixed(2)} MB`;
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

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.compressedBlob) return;

    const filename = `${this.outputFilename.value || 'compressed'}.mopt`;
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
    this.memoryWarning.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.compressBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.outputFilename.value = '';
    this.memoryModeSelect.value = 'auto';
    this.chunkSizeSelect.value = '1048576';
    this.gcIntervalSelect.value = '50';
    this.memoryMode = 'auto';
    this.chunkSize = 1048576;
    this.gcInterval = 50;
    this.stats = { peakMemory: 0, currentMemory: 0, gcCount: 0, chunksProcessed: 0 };
    this.updateMemoryMonitor();
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
  window.optimizer = new MemoryOptimizer();
});

export default MemoryOptimizer;
