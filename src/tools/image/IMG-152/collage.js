/**
 * IMG-152 圖片拼貼工具
 * Image Collage Tool
 */

class ImageCollage {
  constructor() {
    this.images = [];
    this.currentLayout = 'grid2x2';
    this.canvas = null;
    this.ctx = null;

    this.settings = {
      width: 1080,
      height: 1080,
      spacing: 10,
      borderRadius: 0,
      bgColor: '#ffffff'
    };

    this.layouts = {
      'grid2x2': { name: '2×2 網格', cols: 2, rows: 2 },
      'grid3x3': { name: '3×3 網格', cols: 3, rows: 3 },
      'horizontal': { name: '水平排列', cols: 'auto', rows: 1 },
      'vertical': { name: '垂直排列', cols: 1, rows: 'auto' },
      'featured': { name: '主圖+小圖', special: true },
      'mosaic': { name: '馬賽克', special: true }
    };

    this.initElements();
    this.bindEvents();
    this.initCanvas();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Image list
    this.imageList = document.getElementById('imageList');
    this.imageCount = document.getElementById('imageCount');

    // Settings
    this.canvasSizeSelect = document.getElementById('canvasSize');
    this.customSizeGroup = document.getElementById('customSizeGroup');
    this.customWidthInput = document.getElementById('customWidth');
    this.customHeightInput = document.getElementById('customHeight');
    this.spacingInput = document.getElementById('spacing');
    this.borderRadiusInput = document.getElementById('borderRadius');
    this.bgColorPicker = document.getElementById('bgColor');
    this.bgColorValue = document.getElementById('bgColorValue');

    // Layout buttons
    this.layoutButtons = document.querySelectorAll('.layout-btn');

    // Preview
    this.previewCanvas = document.getElementById('previewCanvas');
    this.ctx = this.previewCanvas.getContext('2d');

    // Info
    this.infoSize = document.getElementById('infoSize');
    this.infoCount = document.getElementById('infoCount');
    this.infoLayout = document.getElementById('infoLayout');

    // Buttons
    this.generateBtn = document.getElementById('generateBtn');
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
    this.canvasSizeSelect.addEventListener('change', (e) => this.handleSizeChange(e));
    this.customWidthInput.addEventListener('change', () => this.updateCustomSize());
    this.customHeightInput.addEventListener('change', () => this.updateCustomSize());
    this.spacingInput.addEventListener('change', (e) => {
      this.settings.spacing = parseInt(e.target.value) || 0;
    });
    this.borderRadiusInput.addEventListener('change', (e) => {
      this.settings.borderRadius = parseInt(e.target.value) || 0;
    });
    this.bgColorPicker.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorValue.value = e.target.value;
    });
    this.bgColorValue.addEventListener('change', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorPicker.value = e.target.value;
    });

    // Layout buttons
    this.layoutButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLayout(btn.dataset.layout);
      });
    });

    // Buttons
    this.generateBtn.addEventListener('click', () => this.generateCollage());
    this.downloadBtn.addEventListener('click', () => this.downloadCollage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  initCanvas() {
    this.previewCanvas.width = this.settings.width;
    this.previewCanvas.height = this.settings.height;
    this.clearCanvas();
    this.updateInfo();
  }

  clearCanvas() {
    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
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

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      this.loadImages(files);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      this.loadImages(files);
    }
  }

  async loadImages(files) {
    for (const file of files) {
      const imageData = await this.loadImage(file);
      if (imageData) {
        this.images.push(imageData);
      }
    }

    this.updateImageList();
    this.generateBtn.disabled = this.images.length === 0;
    this.showStatus(`已載入 ${files.length} 張圖片`, 'success');
  }

  loadImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            image: img,
            name: file.name,
            dataUrl: e.target.result
          });
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateImageList() {
    this.imageList.innerHTML = this.images.map((img, index) => `
      <div class="image-item" draggable="true" data-index="${index}">
        <img src="${img.dataUrl}" class="image-thumb" alt="${img.name}">
        <span class="image-name">${img.name}</span>
        <button class="image-remove" data-index="${index}">&times;</button>
      </div>
    `).join('');

    this.imageCount.textContent = this.images.length;
    this.infoCount.textContent = this.images.length;

    // Bind remove buttons
    this.imageList.querySelectorAll('.image-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(parseInt(btn.dataset.index));
      });
    });

    // Bind drag events for reordering
    this.initDragReorder();
  }

  initDragReorder() {
    const items = this.imageList.querySelectorAll('.image-item');
    let draggedItem = null;
    let draggedIndex = -1;

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        draggedIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        draggedIndex = -1;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(item.dataset.index);
        if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
          const [removed] = this.images.splice(draggedIndex, 1);
          this.images.splice(targetIndex, 0, removed);
          this.updateImageList();
        }
      });
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageList();
    this.generateBtn.disabled = this.images.length === 0;
    if (this.images.length === 0) {
      this.downloadBtn.disabled = true;
      this.clearCanvas();
    }
  }

  handleSizeChange(e) {
    const value = e.target.value;
    if (value === 'custom') {
      this.customSizeGroup.style.display = 'block';
      this.updateCustomSize();
    } else {
      this.customSizeGroup.style.display = 'none';
      const [width, height] = value.split('x').map(Number);
      this.settings.width = width;
      this.settings.height = height;
      this.initCanvas();
    }
  }

  updateCustomSize() {
    this.settings.width = parseInt(this.customWidthInput.value) || 1080;
    this.settings.height = parseInt(this.customHeightInput.value) || 1080;
    this.initCanvas();
  }

  setLayout(layout) {
    this.currentLayout = layout;

    this.layoutButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    this.infoLayout.textContent = this.layouts[layout].name;
  }

  updateInfo() {
    this.infoSize.textContent = `${this.settings.width} × ${this.settings.height}`;
  }

  generateCollage() {
    if (this.images.length === 0) {
      this.showStatus('請先上傳圖片', 'error');
      return;
    }

    // Update canvas size
    this.previewCanvas.width = this.settings.width;
    this.previewCanvas.height = this.settings.height;
    this.clearCanvas();

    const layout = this.layouts[this.currentLayout];
    const spacing = this.settings.spacing;
    const radius = this.settings.borderRadius;

    if (layout.special) {
      if (this.currentLayout === 'featured') {
        this.drawFeaturedLayout(spacing, radius);
      } else if (this.currentLayout === 'mosaic') {
        this.drawMosaicLayout(spacing, radius);
      }
    } else {
      this.drawGridLayout(layout, spacing, radius);
    }

    this.downloadBtn.disabled = false;
    this.showStatus('拼貼產生完成！', 'success');
  }

  drawGridLayout(layout, spacing, radius) {
    let cols = layout.cols;
    let rows = layout.rows;

    if (cols === 'auto') {
      cols = this.images.length;
      rows = 1;
    } else if (rows === 'auto') {
      rows = this.images.length;
      cols = 1;
    }

    const cellWidth = (this.settings.width - spacing * (cols + 1)) / cols;
    const cellHeight = (this.settings.height - spacing * (rows + 1)) / rows;

    this.images.forEach((imgData, index) => {
      if (index >= cols * rows) return;

      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = spacing + col * (cellWidth + spacing);
      const y = spacing + row * (cellHeight + spacing);

      this.drawImageInCell(imgData.image, x, y, cellWidth, cellHeight, radius);
    });
  }

  drawFeaturedLayout(spacing, radius) {
    if (this.images.length === 0) return;

    // Main image takes 2/3 width
    const mainWidth = (this.settings.width - spacing * 3) * 2 / 3;
    const mainHeight = this.settings.height - spacing * 2;

    // Draw main image
    this.drawImageInCell(this.images[0].image, spacing, spacing, mainWidth, mainHeight, radius);

    // Side images
    const sideX = spacing * 2 + mainWidth;
    const sideWidth = this.settings.width - sideX - spacing;
    const sideCount = Math.min(this.images.length - 1, 3);

    if (sideCount > 0) {
      const sideHeight = (mainHeight - spacing * (sideCount - 1)) / sideCount;

      for (let i = 0; i < sideCount; i++) {
        const y = spacing + i * (sideHeight + spacing);
        this.drawImageInCell(this.images[i + 1].image, sideX, y, sideWidth, sideHeight, radius);
      }
    }
  }

  drawMosaicLayout(spacing, radius) {
    const count = this.images.length;
    if (count === 0) return;

    // Create random-ish mosaic pattern
    const areas = this.generateMosaicAreas(count, spacing);

    areas.forEach((area, index) => {
      if (index < count) {
        this.drawImageInCell(this.images[index].image, area.x, area.y, area.w, area.h, radius);
      }
    });
  }

  generateMosaicAreas(count, spacing) {
    const areas = [];
    const w = this.settings.width;
    const h = this.settings.height;

    if (count === 1) {
      areas.push({ x: spacing, y: spacing, w: w - spacing * 2, h: h - spacing * 2 });
    } else if (count === 2) {
      const halfW = (w - spacing * 3) / 2;
      areas.push({ x: spacing, y: spacing, w: halfW, h: h - spacing * 2 });
      areas.push({ x: spacing * 2 + halfW, y: spacing, w: halfW, h: h - spacing * 2 });
    } else if (count === 3) {
      const halfW = (w - spacing * 3) / 2;
      const halfH = (h - spacing * 3) / 2;
      areas.push({ x: spacing, y: spacing, w: halfW, h: h - spacing * 2 });
      areas.push({ x: spacing * 2 + halfW, y: spacing, w: halfW, h: halfH });
      areas.push({ x: spacing * 2 + halfW, y: spacing * 2 + halfH, w: halfW, h: halfH });
    } else if (count === 4) {
      const halfW = (w - spacing * 3) / 2;
      const halfH = (h - spacing * 3) / 2;
      areas.push({ x: spacing, y: spacing, w: halfW, h: halfH });
      areas.push({ x: spacing * 2 + halfW, y: spacing, w: halfW, h: halfH });
      areas.push({ x: spacing, y: spacing * 2 + halfH, w: halfW, h: halfH });
      areas.push({ x: spacing * 2 + halfW, y: spacing * 2 + halfH, w: halfW, h: halfH });
    } else {
      // 5+ images: featured + grid
      const mainW = (w - spacing * 3) * 0.6;
      const mainH = (h - spacing * 3) * 0.6;
      areas.push({ x: spacing, y: spacing, w: mainW, h: mainH });

      const rightW = w - mainW - spacing * 3;
      const bottomH = h - mainH - spacing * 3;

      // Right column
      const rightCells = Math.min(count - 1, 2);
      const rightCellH = (mainH - spacing * (rightCells - 1)) / rightCells;
      for (let i = 0; i < rightCells; i++) {
        areas.push({
          x: spacing * 2 + mainW,
          y: spacing + i * (rightCellH + spacing),
          w: rightW,
          h: rightCellH
        });
      }

      // Bottom row
      const bottomCells = Math.min(count - 1 - rightCells, 3);
      const bottomCellW = (w - spacing * (bottomCells + 1)) / bottomCells;
      for (let i = 0; i < bottomCells; i++) {
        areas.push({
          x: spacing + i * (bottomCellW + spacing),
          y: spacing * 2 + mainH,
          w: bottomCellW,
          h: bottomH
        });
      }
    }

    return areas;
  }

  drawImageInCell(img, x, y, width, height, radius) {
    const scale = Math.max(width / img.width, height / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    this.ctx.save();

    // Create clipping path with rounded corners
    if (radius > 0) {
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, width, height, radius);
      this.ctx.clip();
    } else {
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
      this.ctx.clip();
    }

    // Draw image centered and covering the cell
    this.ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);

    this.ctx.restore();
  }

  downloadCollage() {
    const link = document.createElement('a');
    link.download = `collage_${Date.now()}.png`;
    link.href = this.previewCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('拼貼已下載！', 'success');
  }

  reset() {
    this.images = [];
    this.currentLayout = 'grid2x2';

    // Reset UI
    this.fileInput.value = '';
    this.updateImageList();
    this.generateBtn.disabled = true;
    this.downloadBtn.disabled = true;

    // Reset settings
    this.canvasSizeSelect.value = '1080x1080';
    this.customSizeGroup.style.display = 'none';
    this.settings.width = 1080;
    this.settings.height = 1080;
    this.settings.spacing = 10;
    this.settings.borderRadius = 0;
    this.settings.bgColor = '#ffffff';

    this.spacingInput.value = 10;
    this.borderRadiusInput.value = 0;
    this.bgColorPicker.value = '#ffffff';
    this.bgColorValue.value = '#ffffff';

    // Reset layout buttons
    this.layoutButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === 'grid2x2');
    });

    this.initCanvas();
    this.infoLayout.textContent = '2×2 網格';

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
  new ImageCollage();
});
