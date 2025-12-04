/**
 * IMG-104 圖片分割器
 * 將圖片切割成多個等分區塊
 */

class ImageSplitter {
  constructor() {
    this.file = null;
    this.imageData = null;
    this.splitImages = [];

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.settingsSection = document.getElementById('settingsSection');

    this.rowsInput = document.getElementById('rows');
    this.colsInput = document.getElementById('cols');
    this.outputFormat = document.getElementById('outputFormat');
    this.namingRule = document.getElementById('namingRule');

    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');
    this.previewWrapper = document.getElementById('previewWrapper');
    this.gridOverlay = document.getElementById('gridOverlay');
    this.splitInfo = document.getElementById('splitInfo');

    this.statusMessage = document.getElementById('statusMessage');
    this.resultSection = document.getElementById('resultSection');
    this.resultGrid = document.getElementById('resultGrid');

    this.splitBtn = document.getElementById('splitBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Settings events
    this.rowsInput.addEventListener('change', () => this.updatePreview());
    this.colsInput.addEventListener('change', () => this.updatePreview());

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.rowsInput.value = btn.dataset.rows;
        this.colsInput.value = btn.dataset.cols;
        this.updatePreview();

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Buttons
    this.splitBtn.addEventListener('click', () => this.split());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('error', '請選擇圖片檔案');
      return;
    }

    this.file = file;
    this.uploadZone.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.imageData = {
          img,
          width: img.width,
          height: img.height,
          dataUrl: e.target.result
        };

        this.fileInfo.innerHTML = `
          <strong>${file.name}</strong><br>
          尺寸: ${img.width} x ${img.height} px |
          大小: ${this.formatSize(file.size)}
        `;
        this.fileInfo.classList.add('active');
        this.settingsSection.classList.add('active');
        this.splitBtn.disabled = false;

        this.previewImage.src = e.target.result;
        this.previewImage.onload = () => {
          this.previewSection.classList.add('active');
          this.updatePreview();
        };

        this.showStatus('success', '圖片載入成功');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    if (!this.imageData) return;

    const rows = parseInt(this.rowsInput.value) || 1;
    const cols = parseInt(this.colsInput.value) || 1;

    // Get displayed image dimensions
    const displayWidth = this.previewImage.clientWidth;
    const displayHeight = this.previewImage.clientHeight;

    // Calculate cell dimensions
    const cellWidth = displayWidth / cols;
    const cellHeight = displayHeight / rows;
    const originalCellWidth = Math.floor(this.imageData.width / cols);
    const originalCellHeight = Math.floor(this.imageData.height / rows);

    // Clear existing grid
    this.gridOverlay.innerHTML = '';

    // Add horizontal lines
    for (let i = 1; i < rows; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-h';
      line.style.top = `${i * cellHeight}px`;
      this.gridOverlay.appendChild(line);
    }

    // Add vertical lines
    for (let i = 1; i < cols; i++) {
      const line = document.createElement('div');
      line.className = 'grid-line-v';
      line.style.left = `${i * cellWidth}px`;
      this.gridOverlay.appendChild(line);
    }

    // Add cell numbers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const number = document.createElement('div');
        number.className = 'grid-cell-number';
        number.style.top = `${r * cellHeight + 5}px`;
        number.style.left = `${c * cellWidth + 5}px`;
        number.textContent = this.namingRule.value === 'rowcol'
          ? `${r + 1}-${c + 1}`
          : `${(r * cols + c + 1).toString().padStart(2, '0')}`;
        this.gridOverlay.appendChild(number);
      }
    }

    // Update split info
    this.splitInfo.innerHTML = `
      <div class="info-item">
        <div class="info-label">分割數量</div>
        <div class="info-value">${rows} x ${cols} = ${rows * cols} 張</div>
      </div>
      <div class="info-item">
        <div class="info-label">每張尺寸</div>
        <div class="info-value">${originalCellWidth} x ${originalCellHeight} px</div>
      </div>
    `;
  }

  async split() {
    if (!this.imageData) return;

    this.showStatus('processing', '正在分割圖片...');
    this.splitImages = [];
    this.resultGrid.innerHTML = '';

    const rows = parseInt(this.rowsInput.value) || 1;
    const cols = parseInt(this.colsInput.value) || 1;
    const format = this.outputFormat.value;
    const naming = this.namingRule.value;

    const { img, width, height } = this.imageData;
    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);

    const mimeType = format === 'png' ? 'image/png' :
                     format === 'jpg' ? 'image/jpeg' : 'image/webp';

    try {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = cellWidth;
          canvas.height = cellHeight;
          const ctx = canvas.getContext('2d');

          // Fill white background for JPEG
          if (format === 'jpg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cellWidth, cellHeight);
          }

          // Draw the portion of the image
          ctx.drawImage(
            img,
            c * cellWidth, r * cellHeight,  // Source position
            cellWidth, cellHeight,           // Source dimensions
            0, 0,                            // Destination position
            cellWidth, cellHeight            // Destination dimensions
          );

          // Generate filename
          const fileName = naming === 'rowcol'
            ? `split_${r + 1}-${c + 1}.${format}`
            : `split_${(r * cols + c + 1).toString().padStart(2, '0')}.${format}`;

          // Convert to blob
          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, mimeType, 0.92);
          });

          const dataUrl = canvas.toDataURL(mimeType, 0.92);

          this.splitImages.push({
            fileName,
            blob,
            dataUrl,
            width: cellWidth,
            height: cellHeight,
            row: r + 1,
            col: c + 1
          });
        }
      }

      // Display results
      this.resultGrid.style.gridTemplateColumns = `repeat(${Math.min(cols, 4)}, 1fr)`;

      this.splitImages.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <img class="result-thumb" src="${item.dataUrl}" alt="${item.fileName}">
          <div class="result-info">
            <div class="result-name">${item.fileName}</div>
            <div class="result-size">${item.width} x ${item.height} px</div>
          </div>
        `;
        this.resultGrid.appendChild(div);
      });

      this.resultSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('success', `成功分割為 ${this.splitImages.length} 張圖片`);

    } catch (error) {
      this.showStatus('error', '分割失敗: ' + error.message);
    }
  }

  async downloadZip() {
    if (this.splitImages.length === 0) return;

    this.showStatus('processing', '正在打包 ZIP...');

    try {
      const zip = new JSZip();

      for (const item of this.splitImages) {
        zip.file(item.fileName, item.blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `split_images_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', 'ZIP 檔案已下載');
    } catch (error) {
      this.showStatus('error', '打包失敗: ' + error.message);
    }
  }

  reset() {
    this.file = null;
    this.imageData = null;
    this.splitImages = [];

    this.uploadZone.classList.remove('has-file');
    this.fileInfo.classList.remove('active');
    this.fileInfo.innerHTML = '';
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.previewImage.src = '';
    this.gridOverlay.innerHTML = '';
    this.splitInfo.innerHTML = '';
    this.resultGrid.innerHTML = '';

    this.fileInput.value = '';
    this.rowsInput.value = 2;
    this.colsInput.value = 2;
    this.outputFormat.value = 'png';
    this.namingRule.value = 'rowcol';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));

    this.splitBtn.disabled = true;
    this.downloadBtn.disabled = true;

    this.hideStatus();
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    if (type === 'success') {
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  hideStatus() {
    this.statusMessage.className = 'status-message';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageSplitter();
});
