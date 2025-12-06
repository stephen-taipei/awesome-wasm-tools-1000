/**
 * IMG-155 圖片分割工具
 * Image Splitter Tool
 */

class ImageSplitter {
  constructor() {
    this.originalImage = null;
    this.splitPieces = [];

    this.settings = {
      mode: 'grid',
      cols: 3,
      rows: 3,
      format: 'png'
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Settings
    this.settingsSection = document.getElementById('settingsSection');
    this.splitMode = document.getElementById('splitMode');
    this.colsInput = document.getElementById('cols');
    this.rowsInput = document.getElementById('rows');
    this.outputFormat = document.getElementById('outputFormat');
    this.presetButtons = document.querySelectorAll('.preset-btn');

    // Preview
    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');
    this.previewWrapper = document.getElementById('previewWrapper');
    this.gridOverlay = document.getElementById('gridOverlay');
    this.previewInfo = document.getElementById('previewInfo');

    // Result
    this.resultSection = document.getElementById('resultSection');
    this.resultGrid = document.getElementById('resultGrid');
    this.resultInfo = document.getElementById('resultInfo');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.splitBtn = document.getElementById('splitBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Settings
    this.splitMode.addEventListener('change', (e) => {
      this.settings.mode = e.target.value;
      this.updateModeUI();
      this.updateGridOverlay();
    });

    this.colsInput.addEventListener('change', (e) => {
      this.settings.cols = parseInt(e.target.value) || 1;
      this.updatePresetButtons();
      this.updateGridOverlay();
    });

    this.rowsInput.addEventListener('change', (e) => {
      this.settings.rows = parseInt(e.target.value) || 1;
      this.updatePresetButtons();
      this.updateGridOverlay();
    });

    this.outputFormat.addEventListener('change', (e) => {
      this.settings.format = e.target.value;
    });

    // Presets
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.cols = parseInt(btn.dataset.cols);
        this.settings.rows = parseInt(btn.dataset.rows);
        this.colsInput.value = this.settings.cols;
        this.rowsInput.value = this.settings.rows;
        this.updatePresetButtons();
        this.updateGridOverlay();
      });
    });

    // Buttons
    this.splitBtn.addEventListener('click', () => this.splitImage());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
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
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0]);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0]);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.previewImage.src = e.target.result;

        // Wait for image to render
        setTimeout(() => {
          this.updateGridOverlay();
        }, 100);

        // Show UI
        this.uploadZone.classList.add('has-file');
        this.settingsSection.classList.add('active');
        this.previewSection.classList.add('active');
        this.buttonGroup.style.display = 'flex';

        this.previewInfo.textContent = `${img.width} × ${img.height} px`;
        this.showStatus('圖片載入成功！', 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateModeUI() {
    const mode = this.settings.mode;
    this.colsInput.disabled = mode === 'rows';
    this.rowsInput.disabled = mode === 'cols';

    if (mode === 'rows') {
      this.colsInput.value = 1;
      this.settings.cols = 1;
    } else if (mode === 'cols') {
      this.rowsInput.value = 1;
      this.settings.rows = 1;
    }
  }

  updatePresetButtons() {
    this.presetButtons.forEach(btn => {
      const cols = parseInt(btn.dataset.cols);
      const rows = parseInt(btn.dataset.rows);
      btn.classList.toggle('active', cols === this.settings.cols && rows === this.settings.rows);
    });
  }

  updateGridOverlay() {
    if (!this.originalImage) return;

    this.gridOverlay.innerHTML = '';

    const cols = this.settings.cols;
    const rows = this.settings.rows;

    // Get displayed image dimensions
    const imgRect = this.previewImage.getBoundingClientRect();
    const wrapperRect = this.previewWrapper.getBoundingClientRect();
    const displayWidth = imgRect.width;
    const displayHeight = imgRect.height;

    // Horizontal lines
    for (let i = 1; i < rows; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-h';
      line.style.top = `${(i / rows) * 100}%`;
      this.gridOverlay.appendChild(line);
    }

    // Vertical lines
    for (let i = 1; i < cols; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-v';
      line.style.left = `${(i / cols) * 100}%`;
      this.gridOverlay.appendChild(line);
    }

    // Labels
    const pieceWidth = Math.floor(this.originalImage.width / cols);
    const pieceHeight = Math.floor(this.originalImage.height / rows);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const label = document.createElement('div');
        label.className = 'grid-label';
        label.style.left = `${(col / cols) * 100 + (0.5 / cols) * 100}%`;
        label.style.top = `${(row / rows) * 100 + (0.5 / rows) * 100}%`;
        label.style.transform = 'translate(-50%, -50%)';
        label.textContent = `${row * cols + col + 1}`;
        this.gridOverlay.appendChild(label);
      }
    }

    this.previewInfo.textContent = `${this.originalImage.width} × ${this.originalImage.height} → ${cols}×${rows} = ${cols * rows} 片 (每片 ${pieceWidth}×${pieceHeight})`;
  }

  splitImage() {
    if (!this.originalImage) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    this.splitPieces = [];

    const cols = this.settings.cols;
    const rows = this.settings.rows;
    const pieceWidth = Math.floor(this.originalImage.width / cols);
    const pieceHeight = Math.floor(this.originalImage.height / rows);

    // Create pieces
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = pieceWidth;
        canvas.height = pieceHeight;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
          this.originalImage,
          col * pieceWidth,
          row * pieceHeight,
          pieceWidth,
          pieceHeight,
          0,
          0,
          pieceWidth,
          pieceHeight
        );

        const mimeType = this.settings.format === 'jpeg' ? 'image/jpeg' :
                         this.settings.format === 'webp' ? 'image/webp' : 'image/png';
        const extension = this.settings.format === 'jpeg' ? 'jpg' : this.settings.format;

        this.splitPieces.push({
          canvas: canvas,
          dataUrl: canvas.toDataURL(mimeType, 0.9),
          name: `piece_${String(row + 1).padStart(2, '0')}_${String(col + 1).padStart(2, '0')}.${extension}`,
          row: row,
          col: col,
          width: pieceWidth,
          height: pieceHeight
        });
      }
    }

    // Show results
    this.renderResults();
    this.resultSection.classList.add('active');
    this.downloadBtn.disabled = false;
    this.resultInfo.textContent = `${this.splitPieces.length} 個區塊，每個 ${pieceWidth}×${pieceHeight} px`;

    this.showStatus(`分割完成！共 ${this.splitPieces.length} 個區塊`, 'success');
  }

  renderResults() {
    this.resultGrid.innerHTML = '';

    this.splitPieces.forEach((piece, index) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <img src="${piece.dataUrl}" alt="${piece.name}">
        <div class="result-item-info">
          <div class="result-item-name">${piece.name}</div>
          <div>${piece.width}×${piece.height}</div>
        </div>
      `;
      this.resultGrid.appendChild(item);
    });
  }

  async downloadZip() {
    if (this.splitPieces.length === 0) {
      this.showStatus('請先分割圖片', 'error');
      return;
    }

    try {
      this.downloadBtn.disabled = true;
      this.downloadBtn.innerHTML = '<span>⏳</span> 打包中...';

      const zip = new JSZip();

      for (const piece of this.splitPieces) {
        const response = await fetch(piece.dataUrl);
        const blob = await response.blob();
        zip.file(piece.name, blob);
      }

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `split_${this.settings.cols}x${this.settings.rows}_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('ZIP 檔案已下載！', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showStatus('下載過程中發生錯誤', 'error');
    } finally {
      this.downloadBtn.disabled = false;
      this.downloadBtn.innerHTML = '<span>💾</span> 下載 ZIP';
    }
  }

  reset() {
    this.originalImage = null;
    this.splitPieces = [];

    // Reset UI
    this.uploadZone.classList.remove('has-file');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.resultSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.gridOverlay.innerHTML = '';
    this.resultGrid.innerHTML = '';

    // Reset settings
    this.settings = {
      mode: 'grid',
      cols: 3,
      rows: 3,
      format: 'png'
    };

    this.splitMode.value = 'grid';
    this.colsInput.value = 3;
    this.rowsInput.value = 3;
    this.outputFormat.value = 'png';
    this.colsInput.disabled = false;
    this.rowsInput.disabled = false;

    this.updatePresetButtons();

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageSplitter();
});
