/**
 * IMG-038 表格 OCR
 * 辨識圖片中的表格並轉為結構化資料
 */

class TableOCRTool {
  constructor() {
    this.originalFile = null;
    this.rawText = '';
    this.tableData = [];
    this.selectedLang = 'chi_tra';
    this.delimiter = 'auto';
    this.worker = null;
    this.isWorkerReady = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.resultPanel = document.getElementById('resultPanel');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadCsvBtn = document.getElementById('downloadCsvBtn');
    this.downloadJsonBtn = document.getElementById('downloadJsonBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.previewImage = document.getElementById('previewImage');
    this.resultTable = document.getElementById('resultTable');
    this.resultPlaceholder = document.getElementById('resultPlaceholder');
    this.rawTextEl = document.getElementById('rawText');
    this.statsRow = document.getElementById('statsRow');
    this.delimiterSelect = document.getElementById('delimiterSelect');

    this.rowCount = document.getElementById('rowCount');
    this.colCount = document.getElementById('colCount');
    this.processTime = document.getElementById('processTime');

    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingProgress = document.getElementById('loadingProgress');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Language selector
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn[data-lang]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedLang = btn.dataset.lang;
      });
    });

    // Delimiter selector
    this.delimiterSelect.addEventListener('change', () => {
      this.delimiter = this.delimiterSelect.value;
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.runOCR());
    this.downloadCsvBtn.addEventListener('click', () => this.downloadCSV());
    this.downloadJsonBtn.addEventListener('click', () => this.downloadJSON());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage.src = e.target.result;
      this.previewImage.style.display = 'block';

      this.settingsPanel.style.display = 'block';
      this.resultPanel.style.display = 'block';
      this.convertBtn.disabled = false;

      this.showStatus('success', '表格圖片載入成功，請選擇設定後開始辨識');
    };
    reader.readAsDataURL(file);
  }

  async initWorker(lang) {
    this.loadingOverlay.classList.remove('hidden');
    this.loadingText.textContent = '正在初始化 OCR 引擎...';
    this.loadingProgress.textContent = '';

    try {
      this.worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            this.loadingText.textContent = '正在載入 Tesseract 核心...';
          } else if (m.status === 'loading language traineddata') {
            this.loadingText.textContent = `正在下載 ${lang} 語言模型...`;
            if (m.progress) {
              this.loadingProgress.textContent = `${Math.round(m.progress * 100)}%`;
            }
          } else if (m.status === 'initializing api') {
            this.loadingText.textContent = '正在初始化 API...';
          }
        }
      });

      this.isWorkerReady = true;
      this.loadingOverlay.classList.add('hidden');
      return true;
    } catch (error) {
      console.error('Worker init error:', error);
      this.loadingOverlay.classList.add('hidden');
      this.showStatus('error', `OCR 引擎初始化失敗：${error.message}`);
      return false;
    }
  }

  async runOCR() {
    if (!this.originalFile) return;

    const startTime = Date.now();
    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;

    try {
      // Initialize worker if needed
      if (!this.isWorkerReady || this.worker?.lang !== this.selectedLang) {
        if (this.worker) {
          await this.worker.terminate();
          this.worker = null;
          this.isWorkerReady = false;
        }
        const success = await this.initWorker(this.selectedLang);
        if (!success) {
          this.progressContainer.style.display = 'none';
          this.convertBtn.disabled = false;
          return;
        }
      }

      this.updateProgress(10, '準備辨識表格...');

      // Configure for table recognition
      await this.worker.setParameters({
        preserve_interword_spaces: '1',
      });

      this.updateProgress(30, '正在辨識表格內容...');

      const result = await this.worker.recognize(this.originalFile, {}, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = 30 + Math.round(m.progress * 50);
            this.updateProgress(progress, `辨識中... ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      this.updateProgress(85, '解析表格結構...');

      this.rawText = result.data.text;
      this.rawTextEl.textContent = this.rawText;

      // Parse table structure
      this.tableData = this.parseTable(this.rawText);

      this.updateProgress(95, '生成結果...');

      if (this.tableData.length > 0) {
        this.renderTable();

        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        this.rowCount.textContent = this.tableData.length;
        this.colCount.textContent = this.tableData[0]?.length || 0;
        this.processTime.textContent = `${time}s`;
        this.statsRow.style.display = 'flex';

        this.downloadCsvBtn.style.display = 'inline-flex';
        this.downloadJsonBtn.style.display = 'inline-flex';
        this.showStatus('success', `表格辨識完成！${this.tableData.length} 列 × ${this.tableData[0]?.length || 0} 欄`);
      } else {
        this.resultPlaceholder.textContent = '未能辨識出表格結構，請嘗試更清晰的圖片';
        this.resultPlaceholder.style.display = 'block';
        this.resultTable.style.display = 'none';
        this.showStatus('warning', '未能辨識出表格結構');
      }

      this.updateProgress(100, '完成！');
      this.resetBtn.style.display = 'inline-flex';

    } catch (error) {
      console.error('OCR error:', error);
      this.showStatus('error', `辨識失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  parseTable(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detect delimiter
    let delimiter;
    if (this.delimiter === 'auto') {
      delimiter = this.detectDelimiter(lines);
    } else {
      delimiter = this.getDelimiterChar(this.delimiter);
    }

    // Parse lines
    const rows = [];
    let maxCols = 0;

    for (const line of lines) {
      let cells;
      if (delimiter) {
        cells = line.split(delimiter).map(c => c.trim());
      } else {
        // Use multiple spaces as delimiter
        cells = line.split(/\s{2,}/).map(c => c.trim());
      }
      cells = cells.filter(c => c.length > 0);

      if (cells.length > 0) {
        rows.push(cells);
        maxCols = Math.max(maxCols, cells.length);
      }
    }

    // Normalize column count
    return rows.map(row => {
      while (row.length < maxCols) {
        row.push('');
      }
      return row;
    });
  }

  detectDelimiter(lines) {
    const delimiters = ['\t', '|', ',', ';'];
    const scores = {};

    for (const d of delimiters) {
      const counts = lines.map(line => (line.match(new RegExp('\\' + d, 'g')) || []).length);
      const nonZero = counts.filter(c => c > 0);

      if (nonZero.length > lines.length * 0.5) {
        // Check consistency
        const avg = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
        const variance = nonZero.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nonZero.length;

        if (variance < 1) {
          scores[d] = nonZero.length * avg;
        }
      }
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  }

  getDelimiterChar(type) {
    switch (type) {
      case 'tab': return '\t';
      case 'pipe': return '|';
      case 'space': return null; // will use regex
      default: return null;
    }
  }

  renderTable() {
    if (this.tableData.length === 0) return;

    let html = '<thead><tr>';
    // First row as header
    for (const cell of this.tableData[0]) {
      html += `<th>${this.escapeHtml(cell)}</th>`;
    }
    html += '</tr></thead><tbody>';

    // Rest as data
    for (let i = 1; i < this.tableData.length; i++) {
      html += '<tr>';
      for (const cell of this.tableData[i]) {
        html += `<td>${this.escapeHtml(cell)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    this.resultTable.innerHTML = html;
    this.resultTable.style.display = 'table';
    this.resultPlaceholder.style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  downloadCSV() {
    if (this.tableData.length === 0) return;

    const csv = this.tableData.map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if needed
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Add BOM for Excel compatibility
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${originalName}_table.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'CSV 檔案已下載');
  }

  downloadJSON() {
    if (this.tableData.length === 0) return;

    // Convert to array of objects
    const headers = this.tableData[0];
    const data = this.tableData.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h || `col${i + 1}`] = row[i] || '';
      });
      return obj;
    });

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${originalName}_table.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'JSON 檔案已下載');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  async reset() {
    this.originalFile = null;
    this.rawText = '';
    this.tableData = [];

    this.fileInput.value = '';
    this.previewImage.style.display = 'none';
    this.settingsPanel.style.display = 'none';
    this.resultPanel.style.display = 'none';

    this.resultTable.innerHTML = '';
    this.resultTable.style.display = 'none';
    this.resultPlaceholder.textContent = '表格辨識結果將顯示在此處';
    this.resultPlaceholder.style.display = 'block';
    this.rawTextEl.textContent = '';
    this.statsRow.style.display = 'none';

    this.downloadCsvBtn.style.display = 'none';
    this.downloadJsonBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new TableOCRTool();
});
