/**
 * CMP-036: Compression Level Comparison
 *
 * Compares different compression levels.
 * All processing is done locally in the browser.
 */

class CompressionCompare {
  constructor() {
    this.file = null;
    this.originalData = null;
    this.results = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.compareBtn = document.getElementById('compareBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.originalSize = document.getElementById('originalSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.comparisonChart = document.getElementById('comparisonChart');
    this.resultBody = document.getElementById('resultBody');
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

    this.compareBtn.addEventListener('click', () => this.compare());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  async processFile(file) {
    this.file = file;
    this.originalData = new Uint8Array(await file.arrayBuffer());

    this.fileName.textContent = file.name;
    this.originalSize.textContent = this.formatFileSize(file.size);
    this.fileInfo.style.display = 'block';

    this.compareBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  async compare() {
    if (!this.file || !this.originalData) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.compareBtn.disabled = true;
    this.results = [];

    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const levelNames = [
      '等級 1 (最快)',
      '等級 2',
      '等級 3',
      '等級 4',
      '等級 5',
      '等級 6 (預設)',
      '等級 7',
      '等級 8',
      '等級 9 (最佳)'
    ];

    try {
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        this.updateProgress((i / levels.length) * 100, `測試壓縮等級 ${level}...`);

        const levelStart = performance.now();
        const compressed = pako.deflate(this.originalData, { level: level });
        const levelEnd = performance.now();

        const ratio = ((1 - compressed.length / this.originalData.length) * 100).toFixed(1);
        const time = ((levelEnd - levelStart)).toFixed(1);

        this.results.push({
          level: level,
          name: levelNames[i],
          originalSize: this.originalData.length,
          compressedSize: compressed.length,
          ratio: ratio,
          time: time,
          blob: new Blob([compressed], { type: 'application/octet-stream' })
        });
      }

      const endTime = performance.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `比較完成！耗時 ${totalTime} 秒`);
      this.displayResults();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '壓縮等級比較完成！');
        this.resetBtn.style.display = 'inline-flex';
        this.compareBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Comparison error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '比較失敗，請重試');
      this.compareBtn.disabled = false;
    }
  }

  displayResults() {
    // Display chart
    const maxRatio = Math.max(...this.results.map(r => parseFloat(r.ratio)));
    let chartHtml = '<div class="chart-bars">';

    for (const result of this.results) {
      const height = (parseFloat(result.ratio) / maxRatio) * 100;
      chartHtml += `
        <div class="chart-bar-container">
          <div class="chart-bar" style="height: ${height}%">
            <span class="chart-value">${result.ratio}%</span>
          </div>
          <span class="chart-label">L${result.level}</span>
        </div>
      `;
    }

    chartHtml += '</div>';
    this.comparisonChart.innerHTML = chartHtml;

    // Display table
    let tableHtml = '';
    for (let i = 0; i < this.results.length; i++) {
      const result = this.results[i];
      const isDefault = result.level === 6;
      const isBest = parseFloat(result.ratio) === Math.max(...this.results.map(r => parseFloat(r.ratio)));
      const isFastest = parseFloat(result.time) === Math.min(...this.results.map(r => parseFloat(r.time)));

      let badges = '';
      if (isDefault) badges += '<span class="badge default">預設</span>';
      if (isBest) badges += '<span class="badge best">最佳壓縮</span>';
      if (isFastest) badges += '<span class="badge fastest">最快速度</span>';

      tableHtml += `
        <tr>
          <td>${result.name} ${badges}</td>
          <td>${this.formatFileSize(result.compressedSize)}</td>
          <td>${result.ratio}%</td>
          <td>${result.time} ms</td>
          <td>
            <button class="btn btn-small" onclick="window.compressionCompare.download(${i})">
              下載
            </button>
          </td>
        </tr>
      `;
    }

    this.resultBody.innerHTML = tableHtml;
    this.resultPanel.style.display = 'block';

    // Add styles for chart
    this.addChartStyles();
  }

  addChartStyles() {
    if (document.getElementById('chart-styles')) return;

    const style = document.createElement('style');
    style.id = 'chart-styles';
    style.textContent = `
      .comparison-chart {
        margin-bottom: 20px;
        padding: 20px;
        background: #f5f5f5;
        border-radius: 8px;
      }
      .chart-bars {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        height: 200px;
        gap: 10px;
      }
      .chart-bar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
      }
      .chart-bar {
        width: 100%;
        max-width: 40px;
        background: linear-gradient(to top, #4CAF50, #8BC34A);
        border-radius: 4px 4px 0 0;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        min-height: 20px;
      }
      .chart-value {
        font-size: 10px;
        color: white;
        padding: 4px;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
      }
      .chart-label {
        margin-top: 8px;
        font-size: 12px;
        color: #666;
      }
      .result-table {
        width: 100%;
        border-collapse: collapse;
      }
      .result-table th, .result-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .result-table th {
        background: #f5f5f5;
        font-weight: 600;
      }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin-left: 6px;
      }
      .badge.default { background: #2196F3; color: white; }
      .badge.best { background: #4CAF50; color: white; }
      .badge.fastest { background: #FF9800; color: white; }
    `;
    document.head.appendChild(style);
  }

  download(index) {
    const result = this.results[index];
    if (!result) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(result.blob);
    link.download = `${this.file.name}.level${result.level}.deflate`;
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
    this.originalData = null;
    this.results = [];
    this.fileInfo.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.compareBtn.disabled = true;
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
  window.compressionCompare = new CompressionCompare();
});

export default CompressionCompare;
