/**
 * IMG-039 手寫文字 OCR
 * 辨識手寫文字（英文/中文）
 */

class HandwritingOCRTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.processedCanvas = null;
    this.resultText = '';
    this.confidence = 0;
    this.selectedLang = 'eng';
    this.worker = null;
    this.isWorkerReady = false;

    this.preprocessOptions = {
      grayscale: true,
      contrast: true,
      threshold: false,
      invert: false
    };

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

    this.originalImageEl = document.getElementById('originalImage');
    this.processedImageEl = document.getElementById('processedImage');
    this.resultTextEl = document.getElementById('resultText');
    this.resultPlaceholder = document.getElementById('resultPlaceholder');
    this.statsRow = document.getElementById('statsRow');
    this.confidenceBadge = document.getElementById('confidenceBadge');

    this.charCount = document.getElementById('charCount');
    this.confidenceScore = document.getElementById('confidenceScore');
    this.processTime = document.getElementById('processTime');

    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingProgress = document.getElementById('loadingProgress');

    // Preprocess checkboxes
    this.preprocessGrayscale = document.getElementById('preprocessGrayscale');
    this.preprocessContrast = document.getElementById('preprocessContrast');
    this.preprocessThreshold = document.getElementById('preprocessThreshold');
    this.preprocessInvert = document.getElementById('preprocessInvert');

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

    // Preprocess options
    this.preprocessGrayscale.addEventListener('change', () => {
      this.preprocessOptions.grayscale = this.preprocessGrayscale.checked;
      this.updatePreprocessedImage();
    });
    this.preprocessContrast.addEventListener('change', () => {
      this.preprocessOptions.contrast = this.preprocessContrast.checked;
      this.updatePreprocessedImage();
    });
    this.preprocessThreshold.addEventListener('change', () => {
      this.preprocessOptions.threshold = this.preprocessThreshold.checked;
      this.updatePreprocessedImage();
    });
    this.preprocessInvert.addEventListener('change', () => {
      this.preprocessOptions.invert = this.preprocessInvert.checked;
      this.updatePreprocessedImage();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.runOCR());
    this.copyBtn.addEventListener('click', () => this.copyText());
    this.downloadBtn.addEventListener('click', () => this.downloadText());
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
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;

        this.settingsPanel.style.display = 'block';
        this.resultPanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreprocessedImage();
        this.showStatus('success', '手寫圖片載入成功，請調整預處理選項後開始辨識');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updatePreprocessedImage() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.originalImage.naturalWidth;
    canvas.height = this.originalImage.naturalHeight;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(this.originalImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply preprocessing
    if (this.preprocessOptions.grayscale) {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
    }

    if (this.preprocessOptions.contrast) {
      const factor = 1.5;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
    }

    if (this.preprocessOptions.threshold) {
      const threshold = 128;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = avg > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    }

    if (this.preprocessOptions.invert) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.processedCanvas = canvas;
    this.processedImageEl.src = canvas.toDataURL();
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
    if (!this.processedCanvas) return;

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

      this.updateProgress(10, '準備辨識手寫...');

      // Set parameters optimized for handwriting
      await this.worker.setParameters({
        tessedit_pageseg_mode: '6', // Assume uniform text block
      });

      this.updateProgress(30, '正在辨識手寫文字...');

      // Convert canvas to blob for recognition
      const blob = await new Promise(resolve => {
        this.processedCanvas.toBlob(resolve, 'image/png');
      });

      const result = await this.worker.recognize(blob, {}, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = 30 + Math.round(m.progress * 60);
            this.updateProgress(progress, `辨識中... ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      this.updateProgress(95, '處理結果...');

      this.resultText = result.data.text.trim();
      this.confidence = result.data.confidence;

      // Display result
      if (this.resultText) {
        this.resultTextEl.textContent = this.resultText;
        this.resultTextEl.style.display = 'block';
        this.resultPlaceholder.style.display = 'none';

        // Stats
        const chars = this.resultText.replace(/\s/g, '').length;
        const time = ((Date.now() - startTime) / 1000).toFixed(1);

        this.charCount.textContent = chars;
        this.confidenceScore.textContent = `${Math.round(this.confidence)}%`;
        this.processTime.textContent = `${time}s`;
        this.statsRow.style.display = 'flex';

        // Confidence badge
        this.updateConfidenceBadge(this.confidence);

        this.copyBtn.style.display = 'inline-flex';
        this.downloadBtn.style.display = 'inline-flex';
        this.showStatus('success', `手寫辨識完成！信心度：${Math.round(this.confidence)}%`);
      } else {
        this.resultPlaceholder.textContent = '未能辨識出任何文字，請嘗試調整預處理選項';
        this.resultPlaceholder.style.display = 'block';
        this.resultTextEl.style.display = 'none';
        this.showStatus('warning', '未能辨識出文字，請調整預處理選項');
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

  updateConfidenceBadge(confidence) {
    this.confidenceBadge.textContent = `${Math.round(confidence)}% 信心度`;

    if (confidence >= 70) {
      this.confidenceBadge.className = 'confidence-badge confidence-high';
    } else if (confidence >= 40) {
      this.confidenceBadge.className = 'confidence-badge confidence-medium';
    } else {
      this.confidenceBadge.className = 'confidence-badge confidence-low';
    }
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
    link.download = `${originalName}_handwriting.txt`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'TXT 檔案已下載');
  }

  async reset() {
    this.originalFile = null;
    this.originalImage = null;
    this.processedCanvas = null;
    this.resultText = '';
    this.confidence = 0;

    this.fileInput.value = '';
    this.settingsPanel.style.display = 'none';
    this.resultPanel.style.display = 'none';

    this.resultTextEl.textContent = '';
    this.resultTextEl.style.display = 'none';
    this.resultPlaceholder.textContent = '辨識結果將顯示在此處';
    this.resultPlaceholder.style.display = 'block';
    this.statsRow.style.display = 'none';
    this.confidenceBadge.textContent = '';
    this.confidenceBadge.className = 'confidence-badge';

    this.copyBtn.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    // Reset preprocess options
    this.preprocessGrayscale.checked = true;
    this.preprocessContrast.checked = true;
    this.preprocessThreshold.checked = false;
    this.preprocessInvert.checked = false;
    this.preprocessOptions = {
      grayscale: true,
      contrast: true,
      threshold: false,
      invert: false
    };

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
  new HandwritingOCRTool();
});
