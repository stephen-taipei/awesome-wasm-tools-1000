/**
 * IMG-164 圖片馬賽克工具
 * 為圖片添加馬賽克/像素化效果
 */

class MosaicTool {
  constructor() {
    this.image = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.selectionCanvas = document.getElementById('selectionCanvas');
    this.selectionCtx = this.selectionCanvas.getContext('2d');

    // History for undo
    this.history = [];
    this.maxHistory = 10;

    // Settings
    this.settings = {
      mode: 'full',
      blockSize: 10,
      blur: 0
    };

    // Selection
    this.selection = null;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Mode selector
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mode = btn.dataset.mode;
        this.updateModeUI();
      });
    });

    // Controls
    this.bindSlider('blockSize', 'px');
    this.bindSlider('blur', '');

    // Canvas selection events
    this.canvas.addEventListener('mousedown', (e) => this.startSelection(e));
    this.canvas.addEventListener('mousemove', (e) => this.updateSelection(e));
    this.canvas.addEventListener('mouseup', () => this.endSelection());
    this.canvas.addEventListener('mouseleave', () => this.endSelection());

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.startSelection({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.updateSelection({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener('touchend', () => this.endSelection());

    // Buttons
    document.getElementById('applyBtn').addEventListener('click', () => this.applyMosaic());
    document.getElementById('clearRegionBtn').addEventListener('click', () => this.clearSelection());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindSlider(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
    });
  }

  updateModeUI() {
    const regionInfo = document.getElementById('regionInfo');
    const clearBtn = document.getElementById('clearRegionBtn');

    if (this.settings.mode === 'region') {
      regionInfo.style.display = 'block';
      this.canvas.style.cursor = 'crosshair';
    } else {
      regionInfo.style.display = 'none';
      this.canvas.style.cursor = 'default';
      this.clearSelection();
    }
    clearBtn.style.display = this.selection ? 'block' : 'none';
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.history = [];
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
        this.saveHistory();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.image) return;

    this.canvas.width = this.image.width;
    this.canvas.height = this.image.height;
    this.selectionCanvas.width = this.image.width;
    this.selectionCanvas.height = this.image.height;

    this.ctx.drawImage(this.image, 0, 0);
    this.drawSelection();
  }

  startSelection(e) {
    if (this.settings.mode !== 'region') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.isSelecting = true;
    this.startX = (e.clientX - rect.left) * scaleX;
    this.startY = (e.clientY - rect.top) * scaleY;
    this.selection = null;
  }

  updateSelection(e) {
    if (!this.isSelecting) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    this.selection = {
      x: Math.min(this.startX, currentX),
      y: Math.min(this.startY, currentY),
      width: Math.abs(currentX - this.startX),
      height: Math.abs(currentY - this.startY)
    };

    this.drawSelection();
  }

  endSelection() {
    this.isSelecting = false;
    if (this.selection && (this.selection.width < 5 || this.selection.height < 5)) {
      this.selection = null;
      this.drawSelection();
    }
    document.getElementById('clearRegionBtn').style.display = this.selection ? 'block' : 'none';
  }

  drawSelection() {
    this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);

    if (!this.selection) return;

    const { x, y, width, height } = this.selection;

    // Semi-transparent overlay outside selection
    this.selectionCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.selectionCtx.fillRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);

    // Clear selection area
    this.selectionCtx.clearRect(x, y, width, height);

    // Selection border
    this.selectionCtx.strokeStyle = '#a855f7';
    this.selectionCtx.lineWidth = 2;
    this.selectionCtx.setLineDash([5, 5]);
    this.selectionCtx.strokeRect(x, y, width, height);
  }

  clearSelection() {
    this.selection = null;
    this.drawSelection();
    document.getElementById('clearRegionBtn').style.display = 'none';
  }

  applyMosaic() {
    if (!this.image) return;

    this.saveHistory();

    const { blockSize, blur, mode } = this.settings;

    if (mode === 'full') {
      this.pixelateRegion(0, 0, this.canvas.width, this.canvas.height, blockSize);
    } else if (this.selection) {
      const { x, y, width, height } = this.selection;
      this.pixelateRegion(
        Math.floor(x),
        Math.floor(y),
        Math.ceil(width),
        Math.ceil(height),
        blockSize
      );
      this.clearSelection();
    } else {
      this.showStatus('error', '請先選取要馬賽克的區域');
      return;
    }

    // Apply blur if needed
    if (blur > 0) {
      this.applyBlur(blur);
    }

    this.showStatus('success', '馬賽克效果已套用');
  }

  pixelateRegion(startX, startY, width, height, blockSize) {
    const imageData = this.ctx.getImageData(startX, startY, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        // Get average color of block
        let r = 0, g = 0, b = 0, count = 0;

        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Fill block with average color
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, startX, startY);
  }

  applyBlur(strength) {
    this.ctx.filter = `blur(${strength}px)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = 'none';
  }

  saveHistory() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(imageData);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.updateUndoBtn();
  }

  undo() {
    if (this.history.length <= 1) return;

    this.history.pop(); // Remove current state
    const prevState = this.history[this.history.length - 1];

    this.canvas.width = prevState.width;
    this.canvas.height = prevState.height;
    this.ctx.putImageData(prevState, 0, 0);

    this.updateUndoBtn();
    this.showStatus('success', '已復原');
  }

  updateUndoBtn() {
    document.getElementById('undoBtn').disabled = this.history.length <= 1;
  }

  reset() {
    this.image = null;
    this.history = [];
    this.selection = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('clearRegionBtn').style.display = 'none';

    // Reset settings
    this.settings = {
      mode: 'full',
      blockSize: 10,
      blur: 0
    };

    // Reset controls
    document.getElementById('blockSize').value = 10;
    document.getElementById('blockSizeValue').textContent = '10px';
    document.getElementById('blur').value = 0;
    document.getElementById('blurValue').textContent = '0';

    // Reset mode
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="full"]').classList.add('active');
    document.getElementById('regionInfo').style.display = 'none';

    this.updateUndoBtn();
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `mosaic_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MosaicTool();
});
