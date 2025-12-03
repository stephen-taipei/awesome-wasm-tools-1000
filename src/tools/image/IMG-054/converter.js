/**
 * IMG-054 自訂網格拼圖
 * 自訂行列數的網格圖片拼接
 */

class CustomGridTool {
  constructor() {
    this.rows = 3;
    this.cols = 3;
    this.cells = [];
    this.resultBlob = null;

    this.init();
  }

  init() {
    this.rowsInput = document.getElementById('rowsInput');
    this.colsInput = document.getElementById('colsInput');
    this.applyGridBtn = document.getElementById('applyGridBtn');

    this.gridContainer = document.getElementById('gridContainer');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.gapSlider = document.getElementById('gapSlider');
    this.gapValue = document.getElementById('gapValue');
    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.widthSlider = document.getElementById('widthSlider');
    this.widthValue = document.getElementById('widthValue');
    this.bgColor = document.getElementById('bgColor');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.generateBtn = document.getElementById('generateBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.createGrid();
    this.bindEvents();
  }

  createGrid() {
    const totalCells = this.rows * this.cols;
    this.cells = new Array(totalCells).fill(null);

    this.gridContainer.innerHTML = '';
    this.gridContainer.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
    this.gridContainer.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.index = i;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.style.display = 'none';

      const placeholder = document.createElement('div');
      placeholder.className = 'cell-placeholder';
      placeholder.innerHTML = `<span class="cell-number">${i + 1}</span>`;

      cell.appendChild(input);
      cell.appendChild(placeholder);

      // Click to upload
      cell.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
          input.click();
        }
      });

      // File input change
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.loadImage(i, file);
      });

      // Drag and drop
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.style.borderColor = '#667eea';
        cell.style.background = 'rgba(102, 126, 234, 0.2)';
      });

      cell.addEventListener('dragleave', () => {
        cell.style.borderColor = this.cells[i] ? '#667eea' : 'rgba(102, 126, 234, 0.3)';
        cell.style.background = this.cells[i] ? '' : 'rgba(255, 255, 255, 0.05)';
      });

      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.style.borderColor = 'rgba(102, 126, 234, 0.3)';
        cell.style.background = 'rgba(255, 255, 255, 0.05)';

        const file = e.dataTransfer.files[0];
        if (file && file.type.match(/^image\/(png|jpeg|webp)$/)) {
          this.loadImage(i, file);
        }
      });

      this.gridContainer.appendChild(cell);
    }
  }

  loadImage(index, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.cells[index] = {
          file,
          image: img,
          dataUrl: e.target.result
        };
        this.updateCell(index);
        this.updateUI();
        this.updatePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateCell(index) {
    const cell = this.gridContainer.children[index];
    const data = this.cells[index];

    if (data) {
      cell.classList.add('has-image');
      cell.innerHTML = `
        <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
        <img src="${data.dataUrl}" alt="Image ${index + 1}">
        <span class="cell-number">${index + 1}</span>
        <button class="remove-btn">×</button>
      `;

      // Re-bind events
      const input = cell.querySelector('input');
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.loadImage(index, file);
      });

      cell.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });
    } else {
      cell.classList.remove('has-image');
      cell.innerHTML = `
        <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
        <div class="cell-placeholder"><span class="cell-number">${index + 1}</span></div>
      `;

      const input = cell.querySelector('input');
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.loadImage(index, file);
      });
    }
  }

  removeImage(index) {
    this.cells[index] = null;
    this.updateCell(index);
    this.updateUI();
    this.updatePreview();
  }

  bindEvents() {
    // Apply grid
    this.applyGridBtn.addEventListener('click', () => {
      this.rows = Math.min(10, Math.max(1, parseInt(this.rowsInput.value) || 3));
      this.cols = Math.min(10, Math.max(1, parseInt(this.colsInput.value) || 3));
      this.rowsInput.value = this.rows;
      this.colsInput.value = this.cols;
      this.createGrid();
      this.updateUI();
      this.previewSection.style.display = 'none';
      this.downloadBtn.style.display = 'none';
      this.showStatus('info', `已套用 ${this.rows}×${this.cols} 網格（共 ${this.rows * this.cols} 格）`);
    });

    // Slider events
    this.gapSlider.addEventListener('input', () => {
      this.gapValue.textContent = `${this.gapSlider.value}px`;
      this.updatePreview();
    });

    this.radiusSlider.addEventListener('input', () => {
      this.radiusValue.textContent = `${this.radiusSlider.value}px`;
      this.updatePreview();
    });

    this.widthSlider.addEventListener('input', () => {
      this.widthValue.textContent = `${this.widthSlider.value}px`;
      this.updatePreview();
    });

    this.bgColor.addEventListener('input', () => {
      this.updatePreview();
    });

    // Action buttons
    this.generateBtn.addEventListener('click', () => this.generate());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateUI() {
    const imageCount = this.cells.filter(c => c !== null).length;
    this.generateBtn.disabled = imageCount === 0;
    this.previewSection.style.display = imageCount > 0 ? 'block' : 'none';

    if (imageCount > 0 && imageCount < this.cells.length) {
      this.showStatus('info', `已上傳 ${imageCount}/${this.cells.length} 張圖片，空白格子將使用背景色填充`);
    } else if (imageCount === 0) {
      this.statusMessage.style.display = 'none';
    }
  }

  updatePreview() {
    const imageCount = this.cells.filter(c => c !== null).length;
    if (imageCount === 0) return;

    const gap = parseInt(this.gapSlider.value);
    const radius = parseInt(this.radiusSlider.value);
    const totalWidth = parseInt(this.widthSlider.value);
    const bgColor = this.bgColor.value;

    const cellWidth = (totalWidth - gap * (this.cols + 1)) / this.cols;
    const cellHeight = cellWidth; // Square cells
    const totalHeight = cellHeight * this.rows + gap * (this.rows + 1);

    this.previewCanvas.width = totalWidth;
    this.previewCanvas.height = totalHeight;

    // Fill background
    this.previewCtx.fillStyle = bgColor;
    this.previewCtx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw each cell
    for (let i = 0; i < this.cells.length; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;
      const x = gap + col * (cellWidth + gap);
      const y = gap + row * (cellHeight + gap);

      if (this.cells[i]) {
        this.drawRoundedImage(this.cells[i].image, x, y, cellWidth, cellHeight, radius);
      }
    }

    this.previewInfo.textContent = `${totalWidth} × ${Math.round(totalHeight)}`;
  }

  drawRoundedImage(img, x, y, width, height, radius) {
    this.previewCtx.save();

    // Create rounded rect path
    this.previewCtx.beginPath();
    this.previewCtx.moveTo(x + radius, y);
    this.previewCtx.lineTo(x + width - radius, y);
    this.previewCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.previewCtx.lineTo(x + width, y + height - radius);
    this.previewCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.previewCtx.lineTo(x + radius, y + height);
    this.previewCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.previewCtx.lineTo(x, y + radius);
    this.previewCtx.quadraticCurveTo(x, y, x + radius, y);
    this.previewCtx.closePath();
    this.previewCtx.clip();

    // Draw image (cover fit)
    const imgRatio = img.width / img.height;
    const cellRatio = width / height;

    let sx, sy, sw, sh;
    if (imgRatio > cellRatio) {
      sh = img.height;
      sw = img.height * cellRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / cellRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }

    this.previewCtx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
    this.previewCtx.restore();
  }

  async generate() {
    const imageCount = this.cells.filter(c => c !== null).length;
    if (imageCount === 0) {
      this.showStatus('error', '請至少上傳 1 張圖片');
      return;
    }

    this.generateBtn.disabled = true;

    try {
      const format = document.querySelector('input[name="format"]:checked').value;
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = format === 'png' ? 1 : 0.92;

      this.resultBlob = await new Promise((resolve) => {
        this.previewCanvas.toBlob(resolve, mimeType, quality);
      });

      this.previewInfo.textContent = `${this.previewCanvas.width} × ${this.previewCanvas.height} | ${this.formatSize(this.resultBlob.size)}`;

      this.downloadBtn.style.display = 'inline-flex';
      this.showStatus('success', `${this.rows}×${this.cols} 網格已生成！（${imageCount}/${this.cells.length} 張圖片）`);

    } catch (error) {
      console.error('Generate error:', error);
      this.showStatus('error', `生成失敗：${error.message}`);
    }

    this.generateBtn.disabled = false;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  download() {
    if (!this.resultBlob) return;

    const format = document.querySelector('input[name="format"]:checked').value;
    const ext = format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpg';

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `grid_${this.rows}x${this.cols}_${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.rows = 3;
    this.cols = 3;
    this.rowsInput.value = 3;
    this.colsInput.value = 3;
    this.resultBlob = null;

    this.createGrid();
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.generateBtn.disabled = true;

    this.gapSlider.value = 5;
    this.gapValue.textContent = '5px';
    this.radiusSlider.value = 0;
    this.radiusValue.textContent = '0px';
    this.widthSlider.value = 1200;
    this.widthValue.textContent = '1200px';
    this.bgColor.value = '#ffffff';

    document.getElementById('formatPng').checked = true;

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewInfo.textContent = '';

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
  new CustomGridTool();
});
