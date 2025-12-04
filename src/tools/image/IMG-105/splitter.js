/**
 * IMG-105 Instagram 九宮格切圖
 * 將圖片切成 3x3 九宮格供 Instagram 發佈
 */

class InstagramGridSplitter {
  constructor() {
    this.file = null;
    this.imageData = null;
    this.splitImages = [];

    // Crop area state
    this.cropState = {
      x: 0,
      y: 0,
      size: 0,
      isDragging: false,
      isResizing: false,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      startCropX: 0,
      startCropY: 0,
      startCropSize: 0
    };

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.editorSection = document.getElementById('editorSection');

    this.cropContainer = document.getElementById('cropContainer');
    this.cropWrapper = document.getElementById('cropWrapper');
    this.cropImage = document.getElementById('cropImage');
    this.cropArea = document.getElementById('cropArea');
    this.gridPreview = document.getElementById('gridPreview');

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

    // Crop area dragging
    this.cropArea.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', () => this.endDrag());

    // Resize handles
    document.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => this.startResize(e, handle.dataset.handle));
    });

    // Touch support
    this.cropArea.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    document.addEventListener('touchmove', (e) => {
      if (this.cropState.isDragging || this.cropState.isResizing) {
        e.preventDefault();
        this.onDrag(e.touches[0]);
      }
    }, { passive: false });
    document.addEventListener('touchend', () => this.endDrag());

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
        this.splitBtn.disabled = false;

        this.cropImage.src = e.target.result;
        this.cropImage.onload = () => {
          this.editorSection.classList.add('active');
          this.initCropArea();
        };

        this.showStatus('success', '圖片載入成功');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initCropArea() {
    const imgWidth = this.cropImage.clientWidth;
    const imgHeight = this.cropImage.clientHeight;

    // Calculate the largest square that fits
    const size = Math.min(imgWidth, imgHeight);
    const x = (imgWidth - size) / 2;
    const y = (imgHeight - size) / 2;

    this.cropState.x = x;
    this.cropState.y = y;
    this.cropState.size = size;

    this.updateCropArea();
    this.updateGridPreview();
  }

  updateCropArea() {
    const { x, y, size } = this.cropState;
    this.cropArea.style.left = `${x}px`;
    this.cropArea.style.top = `${y}px`;
    this.cropArea.style.width = `${size}px`;
    this.cropArea.style.height = `${size}px`;
  }

  startDrag(e) {
    if (e.target.classList.contains('resize-handle')) return;

    this.cropState.isDragging = true;
    this.cropState.startX = e.clientX;
    this.cropState.startY = e.clientY;
    this.cropState.startCropX = this.cropState.x;
    this.cropState.startCropY = this.cropState.y;
  }

  startResize(e, handle) {
    e.stopPropagation();
    this.cropState.isResizing = true;
    this.cropState.resizeHandle = handle;
    this.cropState.startX = e.clientX;
    this.cropState.startY = e.clientY;
    this.cropState.startCropX = this.cropState.x;
    this.cropState.startCropY = this.cropState.y;
    this.cropState.startCropSize = this.cropState.size;
  }

  onDrag(e) {
    const imgWidth = this.cropImage.clientWidth;
    const imgHeight = this.cropImage.clientHeight;

    if (this.cropState.isDragging) {
      const dx = e.clientX - this.cropState.startX;
      const dy = e.clientY - this.cropState.startY;

      let newX = this.cropState.startCropX + dx;
      let newY = this.cropState.startCropY + dy;

      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, imgWidth - this.cropState.size));
      newY = Math.max(0, Math.min(newY, imgHeight - this.cropState.size));

      this.cropState.x = newX;
      this.cropState.y = newY;

      this.updateCropArea();
      this.updateGridPreview();
    }

    if (this.cropState.isResizing) {
      const dx = e.clientX - this.cropState.startX;
      const dy = e.clientY - this.cropState.startY;
      const handle = this.cropState.resizeHandle;

      let newSize, newX, newY;

      // Calculate new size based on which handle is being dragged
      if (handle === 'br') {
        // Bottom-right: expand towards bottom-right
        const delta = Math.max(dx, dy);
        newSize = this.cropState.startCropSize + delta;
        newX = this.cropState.startCropX;
        newY = this.cropState.startCropY;
      } else if (handle === 'tl') {
        // Top-left: expand towards top-left
        const delta = Math.min(dx, dy);
        newSize = this.cropState.startCropSize - delta;
        newX = this.cropState.startCropX + delta;
        newY = this.cropState.startCropY + delta;
      } else if (handle === 'tr') {
        // Top-right: expand towards top-right
        const delta = Math.max(dx, -dy);
        newSize = this.cropState.startCropSize + delta;
        newX = this.cropState.startCropX;
        newY = this.cropState.startCropY - delta;
      } else if (handle === 'bl') {
        // Bottom-left: expand towards bottom-left
        const delta = Math.max(-dx, dy);
        newSize = this.cropState.startCropSize + delta;
        newX = this.cropState.startCropX - delta;
        newY = this.cropState.startCropY;
      }

      // Minimum size
      const minSize = 90;

      // Constrain to image bounds
      newSize = Math.max(minSize, newSize);
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      // Ensure the crop area stays within bounds
      if (newX + newSize > imgWidth) {
        newSize = imgWidth - newX;
      }
      if (newY + newSize > imgHeight) {
        newSize = imgHeight - newY;
      }

      this.cropState.x = newX;
      this.cropState.y = newY;
      this.cropState.size = newSize;

      this.updateCropArea();
      this.updateGridPreview();
    }
  }

  endDrag() {
    this.cropState.isDragging = false;
    this.cropState.isResizing = false;
    this.cropState.resizeHandle = null;
  }

  updateGridPreview() {
    if (!this.imageData) return;

    const { x, y, size } = this.cropState;
    const imgWidth = this.cropImage.clientWidth;
    const imgHeight = this.cropImage.clientHeight;

    // Calculate the scale between displayed and original image
    const scaleX = this.imageData.width / imgWidth;
    const scaleY = this.imageData.height / imgHeight;

    // Original image crop coordinates
    const origX = x * scaleX;
    const origY = y * scaleY;
    const origSize = size * scaleX;
    const cellSize = origSize / 3;

    // Create temporary canvas for preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cellSize;
    tempCanvas.height = cellSize;
    const ctx = tempCanvas.getContext('2d');

    const cells = this.gridPreview.children;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const cell = cells[index];

        ctx.clearRect(0, 0, cellSize, cellSize);
        ctx.drawImage(
          this.imageData.img,
          origX + col * cellSize,
          origY + row * cellSize,
          cellSize,
          cellSize,
          0, 0,
          cellSize, cellSize
        );

        // Update or create image in cell
        let img = cell.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          cell.appendChild(img);
        }
        img.src = tempCanvas.toDataURL('image/jpeg', 0.8);
      }
    }
  }

  async split() {
    if (!this.imageData) return;

    this.showStatus('processing', '正在切割圖片...');
    this.splitImages = [];
    this.resultGrid.innerHTML = '';

    const { x, y, size } = this.cropState;
    const imgWidth = this.cropImage.clientWidth;
    const imgHeight = this.cropImage.clientHeight;

    // Calculate the scale
    const scaleX = this.imageData.width / imgWidth;
    const scaleY = this.imageData.height / imgHeight;

    const origX = x * scaleX;
    const origY = y * scaleY;
    const origSize = size * scaleX;
    const cellSize = Math.floor(origSize / 3);

    try {
      // Split into 9 cells
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const index = row * 3 + col + 1;

          const canvas = document.createElement('canvas');
          canvas.width = cellSize;
          canvas.height = cellSize;
          const ctx = canvas.getContext('2d');

          ctx.drawImage(
            this.imageData.img,
            origX + col * cellSize,
            origY + row * cellSize,
            cellSize,
            cellSize,
            0, 0,
            cellSize, cellSize
          );

          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
          });

          this.splitImages.push({
            index,
            row: row + 1,
            col: col + 1,
            fileName: `ig_grid_${index.toString().padStart(2, '0')}.jpg`,
            blob,
            dataUrl: canvas.toDataURL('image/jpeg', 0.95),
            size: cellSize
          });
        }
      }

      // Display in Instagram upload order (7,8,9,4,5,6,1,2,3)
      const uploadOrder = [7, 8, 9, 4, 5, 6, 1, 2, 3];

      uploadOrder.forEach((index, uploadIndex) => {
        const item = this.splitImages.find(i => i.index === index);
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <img class="result-thumb" src="${item.dataUrl}" alt="${item.fileName}">
          <div class="result-name">${uploadIndex + 1}. ${item.fileName}</div>
        `;
        this.resultGrid.appendChild(div);
      });

      this.resultSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('success', '九宮格切割完成');

    } catch (error) {
      this.showStatus('error', '切割失敗: ' + error.message);
    }
  }

  async downloadZip() {
    if (this.splitImages.length === 0) return;

    this.showStatus('processing', '正在打包 ZIP...');

    try {
      const zip = new JSZip();

      // Add images in upload order
      const uploadOrder = [7, 8, 9, 4, 5, 6, 1, 2, 3];
      uploadOrder.forEach((index, uploadIndex) => {
        const item = this.splitImages.find(i => i.index === index);
        // Rename with upload order prefix
        const fileName = `${(uploadIndex + 1).toString().padStart(2, '0')}_ig_grid_${item.index}.jpg`;
        zip.file(fileName, item.blob);
      });

      // Add a readme file
      const readme = `Instagram 九宮格上傳順序說明
==============================

請按照檔案編號順序（01-09）依序上傳至 Instagram。

上傳順序對應位置：
01 → 位置 7（左下）
02 → 位置 8（中下）
03 → 位置 9（右下）
04 → 位置 4（左中）
05 → 位置 5（中中）
06 → 位置 6（右中）
07 → 位置 1（左上）
08 → 位置 2（中上）
09 → 位置 3（右上）

每張尺寸：${this.splitImages[0].size} x ${this.splitImages[0].size} px

由 WASM Tools 生成`;

      zip.file('README.txt', readme);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `instagram_grid_${Date.now()}.zip`;
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
    this.editorSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.cropImage.src = '';
    this.resultGrid.innerHTML = '';

    // Reset grid preview
    const cells = this.gridPreview.children;
    for (let i = 0; i < cells.length; i++) {
      const img = cells[i].querySelector('img');
      if (img) img.remove();
    }

    this.fileInput.value = '';

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
  new InstagramGridSplitter();
});
