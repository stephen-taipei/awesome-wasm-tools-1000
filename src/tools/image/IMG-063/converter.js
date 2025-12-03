/**
 * IMG-063 馬賽克效果
 * 為圖片或選定區域添加馬賽克效果
 */

class MosaicTool {
  constructor() {
    this.sourceImage = null;
    this.blockSize = 10;
    this.mode = 'full'; // 'full' or 'selection'
    this.isSelecting = false;
    this.selection = null;
    this.startX = 0;
    this.startY = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.editorSection = document.getElementById('editorSection');

    this.mainCanvas = document.getElementById('mainCanvas');
    this.mainCtx = this.mainCanvas.getContext('2d');
    this.canvasContainer = document.getElementById('canvasContainer');
    this.selectionOverlay = document.getElementById('selectionOverlay');
    this.previewInfo = document.getElementById('previewInfo');

    this.blockSizeSlider = document.getElementById('blockSizeSlider');
    this.blockSizeValue = document.getElementById('blockSizeValue');

    this.applyBtn = document.getElementById('applyBtn');
    this.clearSelectionBtn = document.getElementById('clearSelectionBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

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
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Block size slider
    this.blockSizeSlider.addEventListener('input', () => {
      this.blockSize = parseInt(this.blockSizeSlider.value);
      this.blockSizeValue.textContent = `${this.blockSize} px`;
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.clearSelection();
        this.updateUI();
      });
    });

    // Canvas selection events
    this.mainCanvas.addEventListener('mousedown', (e) => this.startSelection(e));
    this.mainCanvas.addEventListener('mousemove', (e) => this.updateSelection(e));
    this.mainCanvas.addEventListener('mouseup', () => this.endSelection());
    this.mainCanvas.addEventListener('mouseleave', () => this.endSelection());

    // Touch events for mobile
    this.mainCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startSelection(e.touches[0]);
    });
    this.mainCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.updateSelection(e.touches[0]);
    });
    this.mainCanvas.addEventListener('touchend', () => this.endSelection());

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyMosaic());
    this.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.uploadArea.style.display = 'none';
        this.optionsPanel.style.display = 'block';
        this.editorSection.style.display = 'block';
        this.applyBtn.disabled = false;
        this.downloadBtn.disabled = false;

        // Draw image
        this.mainCanvas.width = img.width;
        this.mainCanvas.height = img.height;
        this.mainCtx.drawImage(img, 0, 0);

        this.previewInfo.textContent = `${img.width} × ${img.height} px`;
        this.updateUI();
        this.showStatus('info', '選擇模式後點擊「套用馬賽克」');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getCanvasCoords(e) {
    const rect = this.mainCanvas.getBoundingClientRect();
    const scaleX = this.mainCanvas.width / rect.width;
    const scaleY = this.mainCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  startSelection(e) {
    if (this.mode !== 'selection') return;

    const coords = this.getCanvasCoords(e);
    this.isSelecting = true;
    this.startX = coords.x;
    this.startY = coords.y;
    this.selection = null;
    this.selectionOverlay.style.display = 'none';
  }

  updateSelection(e) {
    if (!this.isSelecting || this.mode !== 'selection') return;

    const coords = this.getCanvasCoords(e);
    const rect = this.mainCanvas.getBoundingClientRect();
    const scaleX = rect.width / this.mainCanvas.width;
    const scaleY = rect.height / this.mainCanvas.height;

    const x = Math.min(this.startX, coords.x);
    const y = Math.min(this.startY, coords.y);
    const width = Math.abs(coords.x - this.startX);
    const height = Math.abs(coords.y - this.startY);

    this.selection = { x, y, width, height };

    // Update overlay position
    this.selectionOverlay.style.display = 'block';
    this.selectionOverlay.style.left = `${15 + x * scaleX}px`;
    this.selectionOverlay.style.top = `${15 + 30 + y * scaleY}px`; // 15 padding + h3 height
    this.selectionOverlay.style.width = `${width * scaleX}px`;
    this.selectionOverlay.style.height = `${height * scaleY}px`;
  }

  endSelection() {
    this.isSelecting = false;
    if (this.selection && this.selection.width > 5 && this.selection.height > 5) {
      this.clearSelectionBtn.disabled = false;
      this.showStatus('success', `已選取區域 ${Math.round(this.selection.width)} × ${Math.round(this.selection.height)} px`);
    }
  }

  clearSelection() {
    this.selection = null;
    this.selectionOverlay.style.display = 'none';
    this.clearSelectionBtn.disabled = true;
    if (this.sourceImage) {
      this.mainCtx.drawImage(this.sourceImage, 0, 0);
    }
  }

  updateUI() {
    if (this.mode === 'selection') {
      this.mainCanvas.style.cursor = 'crosshair';
      this.showStatus('info', '在圖片上拖曳選取要馬賽克的區域');
    } else {
      this.mainCanvas.style.cursor = 'default';
      this.showStatus('info', '點擊「套用馬賽克」為全圖添加效果');
    }
  }

  applyMosaic() {
    if (!this.sourceImage) return;

    const width = this.mainCanvas.width;
    const height = this.mainCanvas.height;

    // Redraw original image
    this.mainCtx.drawImage(this.sourceImage, 0, 0);

    let region;
    if (this.mode === 'selection' && this.selection) {
      region = {
        x: Math.max(0, Math.round(this.selection.x)),
        y: Math.max(0, Math.round(this.selection.y)),
        width: Math.min(Math.round(this.selection.width), width),
        height: Math.min(Math.round(this.selection.height), height)
      };
    } else {
      region = { x: 0, y: 0, width, height };
    }

    // Get pixel data for the region
    const imageData = this.mainCtx.getImageData(region.x, region.y, region.width, region.height);
    const data = imageData.data;

    // Apply mosaic effect
    const blockSize = this.blockSize;

    for (let y = 0; y < region.height; y += blockSize) {
      for (let x = 0; x < region.width; x += blockSize) {
        // Calculate average color for this block
        let r = 0, g = 0, b = 0, count = 0;

        const blockW = Math.min(blockSize, region.width - x);
        const blockH = Math.min(blockSize, region.height - y);

        for (let by = 0; by < blockH; by++) {
          for (let bx = 0; bx < blockW; bx++) {
            const idx = ((y + by) * region.width + (x + bx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Fill block with average color
        for (let by = 0; by < blockH; by++) {
          for (let bx = 0; bx < blockW; bx++) {
            const idx = ((y + by) * region.width + (x + bx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            // Alpha remains unchanged
          }
        }
      }
    }

    this.mainCtx.putImageData(imageData, region.x, region.y);

    // Update source image to current state
    const tempImage = new Image();
    tempImage.onload = () => {
      this.sourceImage = tempImage;
    };
    tempImage.src = this.mainCanvas.toDataURL();

    // Clear selection after apply
    this.selection = null;
    this.selectionOverlay.style.display = 'none';
    this.clearSelectionBtn.disabled = true;

    const modeText = this.mode === 'selection' ? '選取區域' : '全圖';
    this.showStatus('success', `馬賽克效果已套用（${modeText}，${blockSize}px 方塊）`);
  }

  download() {
    this.mainCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mosaic_${this.blockSize}px_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.selection = null;
    this.isSelecting = false;

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.editorSection.style.display = 'none';
    this.applyBtn.disabled = true;
    this.clearSelectionBtn.disabled = true;
    this.downloadBtn.disabled = true;

    this.blockSize = 10;
    this.blockSizeSlider.value = 10;
    this.blockSizeValue.textContent = '10 px';

    this.mode = 'full';
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'full');
    });

    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.selectionOverlay.style.display = 'none';
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
  new MosaicTool();
});
