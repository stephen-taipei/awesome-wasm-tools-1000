/**
 * IMG-056 照片蒙太奇
 * 用多張小圖拼成一張大圖馬賽克效果
 */

class PhotoMosaicTool {
  constructor() {
    this.mainImage = null;
    this.tileImages = [];
    this.tileColors = [];
    this.resultBlob = null;

    this.init();
  }

  init() {
    this.mainUploadArea = document.getElementById('mainUploadArea');
    this.mainFileInput = document.getElementById('mainFileInput');
    this.tilesUploadArea = document.getElementById('tilesUploadArea');
    this.tilesFileInput = document.getElementById('tilesFileInput');

    this.optionsPanel = document.getElementById('optionsPanel');
    this.densitySlider = document.getElementById('densitySlider');
    this.densityValue = document.getElementById('densityValue');
    this.widthSlider = document.getElementById('widthSlider');
    this.widthValue = document.getElementById('widthValue');
    this.blendSlider = document.getElementById('blendSlider');
    this.blendValue = document.getElementById('blendValue');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    this.previewSection = document.getElementById('previewSection');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.generateBtn = document.getElementById('generateBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Main image upload
    this.mainUploadArea.addEventListener('click', () => this.mainFileInput.click());
    this.mainUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.mainUploadArea.classList.add('drag-over');
    });
    this.mainUploadArea.addEventListener('dragleave', () => {
      this.mainUploadArea.classList.remove('drag-over');
    });
    this.mainUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.mainUploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadMainImage(file);
    });
    this.mainFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadMainImage(file);
    });

    // Tiles upload
    this.tilesUploadArea.addEventListener('click', () => this.tilesFileInput.click());
    this.tilesUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.tilesUploadArea.classList.add('drag-over');
    });
    this.tilesUploadArea.addEventListener('dragleave', () => {
      this.tilesUploadArea.classList.remove('drag-over');
    });
    this.tilesUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.tilesUploadArea.classList.remove('drag-over');
      this.loadTileImages(e.dataTransfer.files);
    });
    this.tilesFileInput.addEventListener('change', (e) => {
      this.loadTileImages(e.target.files);
    });

    // Sliders
    this.densitySlider.addEventListener('input', () => {
      this.densityValue.textContent = `${this.densitySlider.value} 格`;
    });
    this.widthSlider.addEventListener('input', () => {
      this.widthValue.textContent = `${this.widthSlider.value}px`;
    });
    this.blendSlider.addEventListener('input', () => {
      this.blendValue.textContent = `${this.blendSlider.value}%`;
    });

    // Action buttons
    this.generateBtn.addEventListener('click', () => this.generate());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadMainImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.mainImage = { file, image: img, dataUrl: e.target.result };
        this.mainUploadArea.classList.add('has-image');
        this.mainUploadArea.innerHTML = `<img src="${e.target.result}" alt="主圖">`;
        this.updateUI();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadTileImages(fileList) {
    const loadPromises = [];

    for (const file of fileList) {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) continue;

      const promise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.tileImages.push({ file, image: img, dataUrl: e.target.result });
            resolve();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
      loadPromises.push(promise);
    }

    Promise.all(loadPromises).then(() => {
      this.updateTilesPreview();
      this.updateUI();
    });
  }

  updateTilesPreview() {
    const previewCount = Math.min(8, this.tileImages.length);
    const remaining = this.tileImages.length - previewCount;

    let html = '<div class="tiles-preview">';
    for (let i = 0; i < previewCount; i++) {
      html += `<img src="${this.tileImages[i].dataUrl}" alt="素材">`;
    }
    if (remaining > 0) {
      html += `<div class="tiles-count">+${remaining}</div>`;
    }
    html += '</div>';
    html += `<div class="upload-text" style="margin-top:10px">${this.tileImages.length} 張素材圖片</div>`;
    html += '<div class="upload-hint">點擊可繼續添加更多</div>';

    this.tilesUploadArea.classList.add('has-image');
    this.tilesUploadArea.innerHTML = html;
  }

  updateUI() {
    const canGenerate = this.mainImage && this.tileImages.length >= 10;
    this.generateBtn.disabled = !canGenerate;
    this.optionsPanel.style.display = (this.mainImage || this.tileImages.length > 0) ? 'block' : 'none';

    if (this.mainImage && this.tileImages.length > 0 && this.tileImages.length < 10) {
      this.showStatus('info', `素材圖片數量較少（${this.tileImages.length}/10），建議上傳更多以獲得更好效果`);
    } else {
      this.statusMessage.style.display = 'none';
    }
  }

  async generate() {
    if (!this.mainImage || this.tileImages.length < 10) {
      this.showStatus('error', '請上傳主圖和至少 10 張素材圖片');
      return;
    }

    this.generateBtn.disabled = true;
    this.progressContainer.style.display = 'block';
    this.updateProgress(0, '準備處理...');

    try {
      const cols = parseInt(this.densitySlider.value);
      const outputWidth = parseInt(this.widthSlider.value);
      const blendAmount = parseInt(this.blendSlider.value) / 100;

      // Calculate dimensions
      const aspectRatio = this.mainImage.image.height / this.mainImage.image.width;
      const rows = Math.round(cols * aspectRatio);
      const tileSize = Math.floor(outputWidth / cols);
      const outputHeight = rows * tileSize;

      this.updateProgress(10, '分析素材色彩...');

      // Calculate average color for each tile image
      await this.analyzeTileColors(tileSize);

      this.updateProgress(30, '分析主圖區塊...');

      // Get target colors from main image
      const targetColors = this.getTargetColors(cols, rows);

      this.updateProgress(50, '配對最佳素材...');

      // Create output canvas
      this.previewCanvas.width = outputWidth;
      this.previewCanvas.height = outputHeight;

      this.updateProgress(60, '生成蒙太奇...');

      // Draw mosaic
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const targetColor = targetColors[row * cols + col];
          const bestTile = this.findBestTile(targetColor);

          const x = col * tileSize;
          const y = row * tileSize;

          // Draw tile
          this.previewCtx.drawImage(bestTile.image, x, y, tileSize, tileSize);

          // Blend with target color
          if (blendAmount > 0) {
            this.previewCtx.fillStyle = `rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, ${blendAmount})`;
            this.previewCtx.fillRect(x, y, tileSize, tileSize);
          }
        }

        this.updateProgress(60 + Math.floor((row / rows) * 30), `生成中 ${row + 1}/${rows}...`);
      }

      this.updateProgress(95, '生成輸出...');

      // Generate blob
      this.resultBlob = await new Promise((resolve) => {
        this.previewCanvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      this.previewSection.style.display = 'block';
      this.previewInfo.textContent = `${outputWidth} × ${outputHeight} | ${cols}×${rows} 格 | ${this.formatSize(this.resultBlob.size)}`;

      this.progressContainer.style.display = 'none';
      this.downloadBtn.style.display = 'inline-flex';

      this.showStatus('success', `蒙太奇生成完成！共使用 ${cols * rows} 個小圖格`);

    } catch (error) {
      console.error('Generate error:', error);
      this.showStatus('error', `生成失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.generateBtn.disabled = false;
  }

  async analyzeTileColors(tileSize) {
    this.tileColors = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = tileSize;
    canvas.height = tileSize;

    for (const tile of this.tileImages) {
      ctx.drawImage(tile.image, 0, 0, tileSize, tileSize);
      const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
      const color = this.getAverageColor(imageData.data);
      this.tileColors.push({ tile, color });
    }
  }

  getTargetColors(cols, rows) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = cols;
    canvas.height = rows;

    ctx.drawImage(this.mainImage.image, 0, 0, cols, rows);
    const imageData = ctx.getImageData(0, 0, cols, rows);
    const data = imageData.data;

    const colors = [];
    for (let i = 0; i < data.length; i += 4) {
      colors.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2]
      });
    }
    return colors;
  }

  getAverageColor(data) {
    let r = 0, g = 0, b = 0;
    const pixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    return {
      r: Math.round(r / pixels),
      g: Math.round(g / pixels),
      b: Math.round(b / pixels)
    };
  }

  findBestTile(targetColor) {
    let bestMatch = this.tileColors[0];
    let bestDistance = Infinity;

    for (const item of this.tileColors) {
      const distance = this.colorDistance(targetColor, item.color);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = item;
      }
    }

    return bestMatch.tile;
  }

  colorDistance(c1, c2) {
    // Weighted Euclidean distance (human eye is more sensitive to green)
    const rDiff = c1.r - c2.r;
    const gDiff = c1.g - c2.g;
    const bDiff = c1.b - c2.b;
    return Math.sqrt(rDiff * rDiff * 0.3 + gDiff * gDiff * 0.59 + bDiff * bDiff * 0.11);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  download() {
    if (!this.resultBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `photo_mosaic_${Date.now()}.jpg`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.mainImage = null;
    this.tileImages = [];
    this.tileColors = [];
    this.resultBlob = null;

    this.mainFileInput.value = '';
    this.tilesFileInput.value = '';

    this.mainUploadArea.classList.remove('has-image');
    this.mainUploadArea.innerHTML = `
      <div class="upload-icon">🖼️</div>
      <div class="upload-text">點擊或拖放主圖到此處</div>
      <div class="upload-hint">這是最終蒙太奇效果呈現的主圖</div>
    `;

    this.tilesUploadArea.classList.remove('has-image');
    this.tilesUploadArea.innerHTML = `
      <div class="upload-icon">📦</div>
      <div class="upload-text">點擊或拖放多張素材圖片</div>
      <div class="upload-hint">建議上傳 50+ 張圖片以獲得最佳效果</div>
    `;

    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.progressContainer.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.generateBtn.disabled = true;

    this.densitySlider.value = 50;
    this.densityValue.textContent = '50 格';
    this.widthSlider.value = 2000;
    this.widthValue.textContent = '2000px';
    this.blendSlider.value = 20;
    this.blendValue.textContent = '20%';

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
  new PhotoMosaicTool();
});
