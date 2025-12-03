/**
 * IMG-037 OCR 文字辨識
 * 從圖片中提取文字內容，支援多語言
 */

class OCRTool {
  constructor() {
    this.originalFile = null;
    this.resultText = '';
    this.selectedLang = 'chi_tra';
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
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.previewImage = document.getElementById('previewImage');
    this.resultTextEl = document.getElementById('resultText');
    this.resultPlaceholder = document.getElementById('resultPlaceholder');
    this.statsRow = document.getElementById('statsRow');

    this.charCount = document.getElementById('charCount');
    this.lineCount = document.getElementById('lineCount');
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

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.runOCR());
    this.copyBtn.addEventListener('click', () => this.copyText());
    this.downloadBtn.addEventListener('click', () => this.downloadText());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG、WebP 或 BMP 格式的圖片');
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

      this.showStatus('success', '圖片載入成功，請選擇語言後開始辨識');
    };
    reader.readAsDataURL(file);
  }

  async initWorker(lang) {
    this.loadingOverlay.classList.remove('hidden');
    this.loadingText.textContent = '正在初始化 OCR 引擎...';
    this.loadingProgress.textContent = '';

    try {
      // Create worker with progress logging
      this.worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            this.loadingText.textContent = '正在載入 Tesseract 核心...';
          } else if (m.status === 'initializing tesseract') {
            this.loadingText.textContent = '正在初始化 Tesseract...';
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
      // Initialize worker if needed or language changed
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

      this.updateProgress(10, '準備辨識...');

      // Run OCR
      this.updateProgress(30, '正在辨識文字...');

      const result = await this.worker.recognize(this.originalFile, {}, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = 30 + Math.round(m.progress * 60);
            this.updateProgress(progress, `辨識中... ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      this.updateProgress(95, '處理結果...');

      this.resultText = result.data.text.trim();

      // Display result
      if (this.resultText) {
        this.resultTextEl.textContent = this.resultText;
        this.resultTextEl.style.display = 'block';
        this.resultPlaceholder.style.display = 'none';

        // Stats
        const chars = this.resultText.replace(/\s/g, '').length;
        const lines = this.resultText.split('\n').filter(l => l.trim()).length;
        const time = ((Date.now() - startTime) / 1000).toFixed(1);

        this.charCount.textContent = chars;
        this.lineCount.textContent = lines;
        this.processTime.textContent = `${time}s`;
        this.statsRow.style.display = 'flex';

        this.copyBtn.style.display = 'inline-flex';
        this.downloadBtn.style.display = 'inline-flex';
        this.showStatus('success', `辨識完成！共 ${chars} 字，${lines} 行`);
      } else {
        this.resultPlaceholder.textContent = '未能辨識出任何文字，請嘗試更清晰的圖片';
        this.resultPlaceholder.style.display = 'block';
        this.resultTextEl.style.display = 'none';
        this.showStatus('warning', '未能辨識出文字，請確認圖片清晰度');
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

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  async copyText() {
    if (!this.resultText) return;

    try {
      await navigator.clipboard.writeText(this.resultText);
      this.showStatus('success', '文字已複製到剪貼簿');
    } catch (error) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = this.resultText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showStatus('success', '文字已複製到剪貼簿');
    }
  }

  downloadText() {
    if (!this.resultText) return;

    const blob = new Blob([this.resultText], { type: 'text/plain;charset=utf-8' });
    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${originalName}_ocr.txt`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'TXT 檔案已下載');
  }

  async reset() {
    this.originalFile = null;
    this.resultText = '';

    this.fileInput.value = '';
    this.previewImage.style.display = 'none';
    this.settingsPanel.style.display = 'none';
    this.resultPanel.style.display = 'none';

    this.resultTextEl.textContent = '';
    this.resultTextEl.style.display = 'none';
    this.resultPlaceholder.textContent = '辨識結果將顯示在此處';
    this.resultPlaceholder.style.display = 'block';
    this.statsRow.style.display = 'none';

    this.copyBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
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
  new OCRTool();
});
