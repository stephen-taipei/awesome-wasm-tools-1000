/**
 * CMP-039: Self-Extracting Archive Creator
 *
 * Creates self-extracting HTML files.
 * All processing is done locally in the browser.
 */

class SfxCreator {
  constructor() {
    this.files = [];
    this.sfxBlob = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.createBtn = document.getElementById('createBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.fileList = document.getElementById('fileList');
    this.fileListContent = document.getElementById('fileListContent');
    this.fileCount = document.getElementById('fileCount');
    this.totalSize = document.getElementById('totalSize');
    this.outputName = document.getElementById('outputName');
    this.archiveTitle = document.getElementById('archiveTitle');
    this.includePreview = document.getElementById('includePreview');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.outputFileName = document.getElementById('outputFileName');
    this.outputFileSize = document.getElementById('outputFileSize');
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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) this.processFiles(files);
    });

    this.createBtn.addEventListener('click', () => this.create());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processFiles(files);
  }

  processFiles(files) {
    this.files = files;
    this.createBtn.disabled = false;

    let html = '';
    let total = 0;
    for (const file of files) {
      html += `<div class="file-item">
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
      </div>`;
      total += file.size;
    }

    this.fileListContent.innerHTML = html;
    this.fileCount.textContent = `${files.length} 個`;
    this.totalSize.textContent = this.formatFileSize(total);
    this.fileList.style.display = 'block';

    this.showStatus('info', `已載入 ${files.length} 個檔案`);
  }

  async create() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.createBtn.disabled = true;

    try {
      this.updateProgress(10, '壓縮檔案中...');

      // Create ZIP with all files
      const zip = new JSZip();
      const fileInfos = [];

      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        this.updateProgress(10 + (i / this.files.length) * 40, `添加: ${file.name}`);

        const arrayBuffer = await file.arrayBuffer();
        zip.file(file.name, new Uint8Array(arrayBuffer));

        fileInfos.push({
          name: file.name,
          size: file.size
        });
      }

      this.updateProgress(55, '產生壓縮資料...');

      const compressedData = await zip.generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      this.updateProgress(75, '建立自解壓 HTML...');

      const title = this.archiveTitle.value || '自解壓壓縮檔';
      const showPreview = this.includePreview.checked;

      const html = this.generateSfxHtml(title, compressedData, fileInfos, showPreview);

      this.sfxBlob = new Blob([html], { type: 'text/html;charset=utf-8' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      const filename = (this.outputName.value || 'self_extract') + '.html';
      this.outputFileName.textContent = filename;
      this.outputFileSize.textContent = this.formatFileSize(this.sfxBlob.size);

      this.updateProgress(100, `完成！耗時 ${processingTime} 秒`);

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.resultPanel.style.display = 'block';
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.showStatus('success', '自解壓檔建立完成！');
        this.createBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('SFX creation error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '建立失敗，請重試');
      this.createBtn.disabled = false;
    }
  }

  generateSfxHtml(title, data, fileInfos, showPreview) {
    const fileListHtml = showPreview ? `
      <div class="file-list">
        <h3>包含的檔案</h3>
        <ul>
          ${fileInfos.map(f => `<li>${f.name} (${this.formatFileSize(f.size)})</li>`).join('')}
        </ul>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .file-list {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: left;
    }
    .file-list h3 { margin-bottom: 15px; color: #333; }
    .file-list ul { list-style: none; }
    .file-list li {
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
      color: #555;
    }
    .file-list li:last-child { border-bottom: none; }
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 40px;
      font-size: 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102,126,234,0.4);
    }
    .btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .progress {
      width: 100%;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      margin: 20px 0;
      overflow: hidden;
      display: none;
    }
    .progress.active { display: block; }
    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      width: 0%;
      transition: width 0.3s;
    }
    .status { margin-top: 20px; color: #666; }
    .results {
      margin-top: 20px;
      text-align: left;
      display: none;
    }
    .results.active { display: block; }
    .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .result-item button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 5px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    .footer { margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p class="subtitle">點擊下方按鈕解壓縮檔案</p>
    ${fileListHtml}
    <button id="extractBtn" class="btn">解壓縮全部檔案</button>
    <div id="progress" class="progress">
      <div id="progressFill" class="progress-fill"></div>
    </div>
    <p id="status" class="status"></p>
    <div id="results" class="results"></div>
    <p class="footer">由 Awesome WASM Tools 1000 建立</p>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
  <script>
    const DATA = '${data}';
    const extractBtn = document.getElementById('extractBtn');
    const progress = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const status = document.getElementById('status');
    const results = document.getElementById('results');

    function formatSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function downloadFile(name, blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    extractBtn.addEventListener('click', async () => {
      extractBtn.disabled = true;
      progress.classList.add('active');
      status.textContent = '解壓縮中...';

      try {
        const zip = await JSZip.loadAsync(DATA, {base64: true});
        const files = Object.entries(zip.files).filter(([_, e]) => !e.dir);
        let html = '';

        for (let i = 0; i < files.length; i++) {
          const [name, entry] = files[i];
          progressFill.style.width = ((i + 1) / files.length * 100) + '%';
          status.textContent = '解壓縮: ' + name;

          const content = await entry.async('blob');
          window['file_' + i] = { name, blob: content };

          html += '<div class="result-item">' +
            '<span>' + name + ' (' + formatSize(content.size) + ')</span>' +
            '<button onclick="downloadFile(window.file_' + i + '.name, window.file_' + i + '.blob)">下載</button>' +
            '</div>';
        }

        results.innerHTML = html;
        results.classList.add('active');
        status.textContent = '解壓縮完成！共 ' + files.length + ' 個檔案';

      } catch (e) {
        status.textContent = '解壓縮失敗: ' + e.message;
        extractBtn.disabled = false;
      }
    });
  <\/script>
</body>
</html>`;
  }

  download() {
    if (!this.sfxBlob) return;

    const filename = (this.outputName.value || 'self_extract') + '.html';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.sfxBlob);
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
    this.files = [];
    this.sfxBlob = null;
    this.fileList.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.createBtn.disabled = true;
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
  window.sfxCreator = new SfxCreator();
});

export default SfxCreator;
