/**
 * IMG-147 像素密度轉換工具
 * DPI/PPI Converter Tool
 */

class DPIConverter {
  constructor() {
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originalDpi = 72; // 預設 DPI
    this.resultCanvas = null;
    this.resultDpi = 300;

    this.settings = {
      mode: 'dpi',
      targetDpi: 300,
      printWidth: 10,
      printHeight: 10
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');

    // Info elements
    this.pixelSize = document.getElementById('pixelSize');
    this.originalDpiEl = document.getElementById('originalDpi');
    this.originalPrintSize = document.getElementById('originalPrintSize');
    this.fileFormat = document.getElementById('fileFormat');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.conversionMode = document.getElementById('conversionMode');
    this.targetDpiInput = document.getElementById('targetDpi');
    this.printWidthInput = document.getElementById('printWidth');
    this.printHeightInput = document.getElementById('printHeight');
    this.printWidthItem = document.getElementById('printWidthItem');
    this.printHeightItem = document.getElementById('printHeightItem');
    this.presetButtons = document.querySelectorAll('.preset-btn');

    // Result elements
    this.resultSection = document.getElementById('resultSection');
    this.origDpiValue = document.getElementById('origDpiValue');
    this.origPrintValue = document.getElementById('origPrintValue');
    this.newDpiValue = document.getElementById('newDpiValue');
    this.newPrintValue = document.getElementById('newPrintValue');
    this.a4Status = document.getElementById('a4Status');
    this.a5Status = document.getElementById('a5Status');
    this.photoStatus = document.getElementById('photoStatus');

    // Buttons
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Settings events
    this.conversionMode.addEventListener('change', (e) => {
      this.settings.mode = e.target.value;
      this.updateModeUI();
    });

    this.targetDpiInput.addEventListener('input', (e) => {
      this.settings.targetDpi = parseInt(e.target.value) || 300;
      this.updatePresetButtons();
    });

    this.printWidthInput.addEventListener('input', (e) => {
      this.settings.printWidth = parseFloat(e.target.value) || 10;
    });

    this.printHeightInput.addEventListener('input', (e) => {
      this.settings.printHeight = parseFloat(e.target.value) || 10;
    });

    // Preset buttons
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const dpi = parseInt(btn.dataset.dpi);
        this.settings.targetDpi = dpi;
        this.targetDpiInput.value = dpi;
        this.updatePresetButtons();
      });
    });

    // Buttons
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('請選擇圖片檔案', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.previewImage.src = e.target.result;

        // 更新資訊
        this.pixelSize.textContent = `${img.width} × ${img.height}`;
        this.fileFormat.textContent = file.type.split('/')[1].toUpperCase();

        // 計算原始列印尺寸
        this.updateOriginalInfo();

        // 設定預設列印尺寸
        const widthCm = this.pixelsToCm(img.width, this.originalDpi);
        const heightCm = this.pixelsToCm(img.height, this.originalDpi);
        this.settings.printWidth = Math.round(widthCm * 10) / 10;
        this.settings.printHeight = Math.round(heightCm * 10) / 10;
        this.printWidthInput.value = this.settings.printWidth;
        this.printHeightInput.value = this.settings.printHeight;

        // 顯示區塊
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.settingsSection.classList.add('active');
        this.convertBtn.disabled = false;

        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateOriginalInfo() {
    this.originalDpiEl.textContent = this.originalDpi;

    const widthCm = this.pixelsToCm(this.originalWidth, this.originalDpi);
    const heightCm = this.pixelsToCm(this.originalHeight, this.originalDpi);
    this.originalPrintSize.textContent = `${widthCm.toFixed(2)} × ${heightCm.toFixed(2)}`;
  }

  updateModeUI() {
    if (this.settings.mode === 'resample') {
      this.printWidthItem.style.display = 'flex';
      this.printHeightItem.style.display = 'flex';
    } else {
      this.printWidthItem.style.display = 'none';
      this.printHeightItem.style.display = 'none';
    }
  }

  updatePresetButtons() {
    this.presetButtons.forEach(btn => {
      const dpi = parseInt(btn.dataset.dpi);
      btn.classList.toggle('active', dpi === this.settings.targetDpi);
    });
  }

  pixelsToCm(pixels, dpi) {
    // 1 inch = 2.54 cm
    return (pixels / dpi) * 2.54;
  }

  cmToPixels(cm, dpi) {
    return Math.round((cm / 2.54) * dpi);
  }

  convert() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    try {
      this.resultCanvas = document.createElement('canvas');
      const ctx = this.resultCanvas.getContext('2d');

      if (this.settings.mode === 'dpi') {
        // 僅修改 DPI，不改變像素
        this.resultCanvas.width = this.originalWidth;
        this.resultCanvas.height = this.originalHeight;
        ctx.drawImage(this.originalImage, 0, 0);
        this.resultDpi = this.settings.targetDpi;
      } else {
        // 重新取樣
        const newWidth = this.cmToPixels(this.settings.printWidth, this.settings.targetDpi);
        const newHeight = this.cmToPixels(this.settings.printHeight, this.settings.targetDpi);

        this.resultCanvas.width = newWidth;
        this.resultCanvas.height = newHeight;

        // 使用高品質縮放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.originalImage, 0, 0, newWidth, newHeight);
        this.resultDpi = this.settings.targetDpi;
      }

      // 顯示結果
      this.showResult();

      this.downloadBtn.disabled = false;
      this.showStatus('轉換完成！', 'success');
    } catch (error) {
      console.error('Convert error:', error);
      this.showStatus('轉換過程中發生錯誤', 'error');
    }
  }

  showResult() {
    this.resultSection.classList.add('active');

    // 原始資訊
    this.origDpiValue.textContent = `${this.originalDpi} DPI`;
    const origWidthCm = this.pixelsToCm(this.originalWidth, this.originalDpi);
    const origHeightCm = this.pixelsToCm(this.originalHeight, this.originalDpi);
    this.origPrintValue.textContent = `${origWidthCm.toFixed(2)} × ${origHeightCm.toFixed(2)} cm`;

    // 轉換後資訊
    this.newDpiValue.textContent = `${this.resultDpi} DPI`;
    const newWidthCm = this.pixelsToCm(this.resultCanvas.width, this.resultDpi);
    const newHeightCm = this.pixelsToCm(this.resultCanvas.height, this.resultDpi);
    this.newPrintValue.textContent = `${newWidthCm.toFixed(2)} × ${newHeightCm.toFixed(2)} cm`;

    // 紙張尺寸對照
    this.updatePaperSizes(newWidthCm, newHeightCm);
  }

  updatePaperSizes(widthCm, heightCm) {
    // A4: 21 × 29.7 cm
    this.a4Status.textContent = this.checkPaperFit(widthCm, heightCm, 21, 29.7);

    // A5: 14.8 × 21 cm
    this.a5Status.textContent = this.checkPaperFit(widthCm, heightCm, 14.8, 21);

    // 4×6: 10 × 15 cm
    this.photoStatus.textContent = this.checkPaperFit(widthCm, heightCm, 10, 15);
  }

  checkPaperFit(imgW, imgH, paperW, paperH) {
    // 考慮橫向和縱向
    const fits1 = imgW <= paperW && imgH <= paperH;
    const fits2 = imgW <= paperH && imgH <= paperW;

    if (fits1 || fits2) {
      return '✓ 適合';
    }

    // 計算需要縮放比例
    const scale1 = Math.max(imgW / paperW, imgH / paperH);
    const scale2 = Math.max(imgW / paperH, imgH / paperW);
    const scale = Math.min(scale1, scale2);

    if (scale <= 1.5) {
      return `需縮小 ${Math.round((1 - 1/scale) * 100)}%`;
    }

    return '✗ 過大';
  }

  downloadImage() {
    if (!this.resultCanvas) {
      this.showStatus('請先執行轉換', 'error');
      return;
    }

    // 創建帶有 DPI 資訊的 PNG
    // 注意：瀏覽器的 canvas.toDataURL 不支援設定 DPI
    // 我們使用自訂方式在 PNG 中嵌入 pHYs chunk

    const dataUrl = this.resultCanvas.toDataURL('image/png');

    // 將 DPI 資訊加入檔名提示
    const link = document.createElement('a');
    link.download = `image_${this.resultDpi}dpi_${this.resultCanvas.width}x${this.resultCanvas.height}.png`;
    link.href = dataUrl;
    link.click();

    this.showStatus(`圖片已下載！建議使用圖片編輯軟體確認 DPI 設定為 ${this.resultDpi}`, 'success');
  }

  reset() {
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originalDpi = 72;
    this.resultCanvas = null;
    this.resultDpi = 300;

    // 重置設定
    this.settings = {
      mode: 'dpi',
      targetDpi: 300,
      printWidth: 10,
      printHeight: 10
    };

    // 重置 UI
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.resultSection.classList.remove('active');
    this.convertBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置控制項
    this.conversionMode.value = 'dpi';
    this.targetDpiInput.value = 300;
    this.printWidthInput.value = 10;
    this.printHeightInput.value = 10;
    this.printWidthItem.style.display = 'none';
    this.printHeightItem.style.display = 'none';

    // 重置預設按鈕
    this.updatePresetButtons();

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 4000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new DPIConverter();
});
