/**
 * CMP-066: Compression Time Estimator
 *
 * Estimates compression time based on file characteristics and sample tests.
 * All processing is done locally in the browser.
 */

class CompressionTimeEstimator {
  constructor() {
    this.file = null;
    this.fileData = null;
    this.compressionFormat = 'gzip';
    this.compressionLevel = 6;
    this.sampleSize = 256 * 1024; // 256KB
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.fileSize = document.getElementById('fileSize');
    this.fileType = document.getElementById('fileType');
    this.compressionFormatSelect = document.getElementById('compressionFormat');
    this.compressionLevelSelect = document.getElementById('compressionLevel');
    this.sampleSizeSelect = document.getElementById('sampleSize');
    this.estimateBtn = document.getElementById('estimateBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.estimationResults = document.getElementById('estimationResults');
    this.estimatedTime = document.getElementById('estimatedTime');
    this.compressionSpeed = document.getElementById('compressionSpeed');
    this.estimatedRatio = document.getElementById('estimatedRatio');
    this.estimatedSize = document.getElementById('estimatedSize');
    this.benchmarkResults = document.getElementById('benchmarkResults');
    this.benchmarkTable = document.getElementById('benchmarkTable');

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

    this.compressionFormatSelect.addEventListener('change', (e) => {
      this.compressionFormat = e.target.value;
    });

    this.compressionLevelSelect.addEventListener('change', (e) => {
      this.compressionLevel = parseInt(e.target.value);
    });

    this.sampleSizeSelect.addEventListener('change', (e) => {
      this.sampleSize = parseInt(e.target.value) * 1024;
    });

    this.estimateBtn.addEventListener('click', () => this.estimate());
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
    this.fileType.textContent = `類型: ${file.type || '未知'}`;
    this.fileInfo.style.display = 'block';
    this.estimateBtn.disabled = false;
    this.resetBtn.style.display = 'inline-flex';
  }

  async estimate() {
    if (!this.file) return;

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '讀取檔案...');

    try {
      const arrayBuffer = await this.file.arrayBuffer();
      this.fileData = new Uint8Array(arrayBuffer);

      this.updateProgress(20, '準備樣本資料...');

      // Take sample from beginning, middle, and end
      const samples = this.getSamples();

      this.updateProgress(40, '執行效能測試...');

      // Test compression on samples
      const testResult = await this.runCompressionTest(samples);

      this.updateProgress(70, '計算估算值...');

      // Calculate estimates
      const estimation = this.calculateEstimation(testResult);

      // Display results
      this.estimatedTime.textContent = this.formatTime(estimation.estimatedTime);
      this.compressionSpeed.textContent = `${estimation.speed.toFixed(2)} MB/s`;
      this.estimatedRatio.textContent = `${estimation.ratio.toFixed(1)}%`;
      this.estimatedSize.textContent = this.formatFileSize(estimation.estimatedSize);
      this.estimationResults.style.display = 'block';

      this.updateProgress(90, '執行各等級效能比較...');

      // Run benchmark for all levels
      await this.runBenchmark(samples);

      this.updateProgress(100, '估算完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '估算完成！');
      }, 500);

    } catch (error) {
      console.error('Estimation error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '估算失敗');
    }
  }

  getSamples() {
    const actualSampleSize = Math.min(this.sampleSize, Math.floor(this.fileData.length / 3));
    const samples = [];

    if (this.fileData.length <= this.sampleSize) {
      samples.push(this.fileData);
    } else {
      // Beginning
      samples.push(this.fileData.slice(0, actualSampleSize));
      // Middle
      const midStart = Math.floor(this.fileData.length / 2 - actualSampleSize / 2);
      samples.push(this.fileData.slice(midStart, midStart + actualSampleSize));
      // End
      samples.push(this.fileData.slice(-actualSampleSize));
    }

    return samples;
  }

  async runCompressionTest(samples) {
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let totalTime = 0;

    for (const sample of samples) {
      const start = performance.now();
      let compressed;

      switch (this.compressionFormat) {
        case 'gzip':
          compressed = pako.gzip(sample, { level: this.compressionLevel });
          break;
        case 'deflate':
          compressed = pako.deflate(sample, { level: this.compressionLevel });
          break;
        case 'zip':
          compressed = pako.deflate(sample, { level: this.compressionLevel });
          break;
        default:
          compressed = pako.gzip(sample, { level: this.compressionLevel });
      }

      const time = performance.now() - start;
      totalTime += time;
      totalOriginalSize += sample.length;
      totalCompressedSize += compressed.length;
    }

    return {
      originalSize: totalOriginalSize,
      compressedSize: totalCompressedSize,
      time: totalTime,
      ratio: (1 - totalCompressedSize / totalOriginalSize) * 100,
      speed: (totalOriginalSize / 1024 / 1024) / (totalTime / 1000)
    };
  }

  calculateEstimation(testResult) {
    const fileSize = this.fileData.length;
    const bytesPerMs = testResult.originalSize / testResult.time;
    const estimatedTime = fileSize / bytesPerMs;
    const estimatedSize = fileSize * (1 - testResult.ratio / 100);

    return {
      estimatedTime: estimatedTime,
      speed: testResult.speed,
      ratio: testResult.ratio,
      estimatedSize: estimatedSize
    };
  }

  async runBenchmark(samples) {
    const levels = [1, 3, 5, 6, 7, 9];
    const results = [];

    for (const level of levels) {
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      let totalTime = 0;

      for (const sample of samples) {
        const start = performance.now();
        const compressed = pako.gzip(sample, { level });
        totalTime += performance.now() - start;
        totalOriginalSize += sample.length;
        totalCompressedSize += compressed.length;
      }

      const speed = (totalOriginalSize / 1024 / 1024) / (totalTime / 1000);
      const ratio = (1 - totalCompressedSize / totalOriginalSize) * 100;
      const estimatedTime = (this.fileData.length / totalOriginalSize) * totalTime;

      results.push({
        level,
        speed,
        ratio,
        estimatedTime
      });
    }

    this.displayBenchmark(results);
  }

  displayBenchmark(results) {
    let html = '<table class="compression-table">';
    html += '<tr><th>等級</th><th>速度</th><th>壓縮比</th><th>預估時間</th></tr>';

    results.forEach(r => {
      html += `<tr>
        <td>等級 ${r.level}</td>
        <td>${r.speed.toFixed(2)} MB/s</td>
        <td>${r.ratio.toFixed(1)}%</td>
        <td>${this.formatTime(r.estimatedTime)}</td>
      </tr>`;
    });

    html += '</table>';
    this.benchmarkTable.innerHTML = html;
    this.benchmarkResults.style.display = 'block';
  }

  formatTime(ms) {
    if (ms < 1000) {
      return `${ms.toFixed(0)} 毫秒`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)} 秒`;
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes} 分 ${seconds} 秒`;
    } else {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours} 小時 ${minutes} 分`;
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.file = null;
    this.fileData = null;
    this.fileInfo.style.display = 'none';
    this.estimationResults.style.display = 'none';
    this.benchmarkResults.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.estimateBtn.disabled = true;
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
  window.estimator = new CompressionTimeEstimator();
});

export default CompressionTimeEstimator;
