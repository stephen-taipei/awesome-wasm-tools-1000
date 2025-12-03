/**
 * IMG-058 證件照製作
 * 製作標準證件照，支援多種尺寸與排版列印
 */

class IDPhotoTool {
  constructor() {
    this.sourceImage = null;
    this.cropRect = { x: 0, y: 0, width: 0, height: 0 };
    this.selectedSize = { width: 295, height: 413, name: '1吋' };
    this.bgColor = '#ffffff';
    this.layout = 'single';
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dpi = 300; // 300 DPI for printing

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');
    this.cropContainer = document.getElementById('cropContainer');
    this.sourceImg = document.getElementById('sourceImage');
    this.cropOverlay = document.getElementById('cropOverlay');

    this.outputCanvas = document.getElementById('outputCanvas');
    this.outputCtx = this.outputCanvas.getContext('2d');
    this.outputInfo = document.getElementById('outputInfo');

    this.printPreview = document.getElementById('printPreview');
    this.printCanvas = document.getElementById('printCanvas');
    this.printCtx = this.printCanvas.getContext('2d');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadPrintBtn = document.getElementById('downloadPrintBtn');
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

    // Size selection
    document.querySelectorAll('.size-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedSize = {
          width: parseInt(el.dataset.width),
          height: parseInt(el.dataset.height),
          name: el.dataset.name
        };
        this.updateCropOverlay();
        this.render();
      });
    });

    // Background color
    document.querySelectorAll('.bg-color').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.bg-color').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.bgColor = el.dataset.color;
        this.render();
      });
    });

    // Layout options
    document.querySelectorAll('.layout-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.layout-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.layout = el.dataset.layout;
        this.updateLayoutUI();
        this.render();
      });
    });

    // Crop overlay drag
    this.cropOverlay.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', () => this.endDrag());

    // Touch support
    this.cropOverlay.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        this.onDrag(e.touches[0]);
      }
    }, { passive: false });
    document.addEventListener('touchend', () => this.endDrag());

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.downloadPrintBtn.addEventListener('click', () => this.downloadPrint());
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
        this.sourceImg.src = e.target.result;
        this.sourceImg.onload = () => {
          this.uploadArea.style.display = 'none';
          this.editorSection.style.display = 'block';
          this.initCropOverlay();
          this.render();
          this.downloadBtn.disabled = false;
        };
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  initCropOverlay() {
    const containerRect = this.cropContainer.getBoundingClientRect();
    const imgRect = this.sourceImg.getBoundingClientRect();

    const aspectRatio = this.selectedSize.width / this.selectedSize.height;
    let cropWidth, cropHeight;

    // Fit crop area to image
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;

    if (imgDisplayWidth / imgDisplayHeight > aspectRatio) {
      cropHeight = imgDisplayHeight * 0.8;
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = imgDisplayWidth * 0.8;
      cropHeight = cropWidth / aspectRatio;
    }

    const offsetX = (imgRect.left - containerRect.left) + (imgDisplayWidth - cropWidth) / 2;
    const offsetY = (imgRect.top - containerRect.top) + (imgDisplayHeight - cropHeight) / 2;

    this.cropRect = {
      x: offsetX,
      y: offsetY,
      width: cropWidth,
      height: cropHeight
    };

    this.updateCropOverlay();
  }

  updateCropOverlay() {
    if (!this.sourceImage) return;

    const aspectRatio = this.selectedSize.width / this.selectedSize.height;
    const newHeight = this.cropRect.width / aspectRatio;

    this.cropRect.height = newHeight;

    this.cropOverlay.style.left = `${this.cropRect.x}px`;
    this.cropOverlay.style.top = `${this.cropRect.y}px`;
    this.cropOverlay.style.width = `${this.cropRect.width}px`;
    this.cropOverlay.style.height = `${this.cropRect.height}px`;
  }

  startDrag(e) {
    this.isDragging = true;
    this.dragStart = {
      x: e.clientX - this.cropRect.x,
      y: e.clientY - this.cropRect.y
    };
  }

  onDrag(e) {
    if (!this.isDragging) return;

    const containerRect = this.cropContainer.getBoundingClientRect();
    const imgRect = this.sourceImg.getBoundingClientRect();

    let newX = e.clientX - this.dragStart.x;
    let newY = e.clientY - this.dragStart.y;

    // Constrain to image bounds
    const minX = imgRect.left - containerRect.left;
    const minY = imgRect.top - containerRect.top;
    const maxX = minX + imgRect.width - this.cropRect.width;
    const maxY = minY + imgRect.height - this.cropRect.height;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    this.cropRect.x = newX;
    this.cropRect.y = newY;

    this.updateCropOverlay();
    this.render();
  }

  endDrag() {
    this.isDragging = false;
  }

  updateLayoutUI() {
    const showPrint = this.layout !== 'single';
    this.printPreview.style.display = showPrint ? 'block' : 'none';
    this.downloadPrintBtn.style.display = showPrint ? 'inline-flex' : 'none';
  }

  render() {
    if (!this.sourceImage) return;

    // Calculate crop coordinates in source image space
    const imgRect = this.sourceImg.getBoundingClientRect();
    const containerRect = this.cropContainer.getBoundingClientRect();

    const scaleX = this.sourceImage.width / imgRect.width;
    const scaleY = this.sourceImage.height / imgRect.height;

    const imgOffsetX = imgRect.left - containerRect.left;
    const imgOffsetY = imgRect.top - containerRect.top;

    const srcX = (this.cropRect.x - imgOffsetX) * scaleX;
    const srcY = (this.cropRect.y - imgOffsetY) * scaleY;
    const srcW = this.cropRect.width * scaleX;
    const srcH = this.cropRect.height * scaleY;

    // Render single photo
    const outputWidth = this.selectedSize.width;
    const outputHeight = this.selectedSize.height;

    this.outputCanvas.width = outputWidth;
    this.outputCanvas.height = outputHeight;

    // Background
    this.outputCtx.fillStyle = this.bgColor;
    this.outputCtx.fillRect(0, 0, outputWidth, outputHeight);

    // Draw cropped image
    this.outputCtx.drawImage(
      this.sourceImage,
      srcX, srcY, srcW, srcH,
      0, 0, outputWidth, outputHeight
    );

    this.outputInfo.textContent = `${this.selectedSize.name} | ${outputWidth}×${outputHeight}px`;

    // Render print layout if needed
    if (this.layout !== 'single') {
      this.renderPrintLayout(srcX, srcY, srcW, srcH);
    }
  }

  renderPrintLayout(srcX, srcY, srcW, srcH) {
    // 4x6 inch at 300 DPI
    const printWidth = 1800;  // 6 inch
    const printHeight = 1200; // 4 inch

    this.printCanvas.width = printWidth;
    this.printCanvas.height = printHeight;

    // White background
    this.printCtx.fillStyle = '#ffffff';
    this.printCtx.fillRect(0, 0, printWidth, printHeight);

    const photoWidth = this.selectedSize.width;
    const photoHeight = this.selectedSize.height;
    const margin = 30;

    let positions = [];

    if (this.layout === '4up') {
      // 2x2 layout
      const startX = (printWidth - (photoWidth * 2 + margin)) / 2;
      const startY = (printHeight - (photoHeight * 2 + margin)) / 2;

      positions = [
        { x: startX, y: startY },
        { x: startX + photoWidth + margin, y: startY },
        { x: startX, y: startY + photoHeight + margin },
        { x: startX + photoWidth + margin, y: startY + photoHeight + margin }
      ];
    } else if (this.layout === '8up') {
      // 4x2 layout
      const cols = 4;
      const rows = 2;
      const totalWidth = photoWidth * cols + margin * (cols - 1);
      const totalHeight = photoHeight * rows + margin * (rows - 1);
      const startX = (printWidth - totalWidth) / 2;
      const startY = (printHeight - totalHeight) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          positions.push({
            x: startX + col * (photoWidth + margin),
            y: startY + row * (photoHeight + margin)
          });
        }
      }
    }

    // Draw photos
    positions.forEach(pos => {
      // Background color
      this.printCtx.fillStyle = this.bgColor;
      this.printCtx.fillRect(pos.x, pos.y, photoWidth, photoHeight);

      // Photo
      this.printCtx.drawImage(
        this.sourceImage,
        srcX, srcY, srcW, srcH,
        pos.x, pos.y, photoWidth, photoHeight
      );

      // Border
      this.printCtx.strokeStyle = '#ddd';
      this.printCtx.lineWidth = 1;
      this.printCtx.strokeRect(pos.x, pos.y, photoWidth, photoHeight);
    });

    // Crop marks
    this.drawCropMarks(positions, photoWidth, photoHeight);
  }

  drawCropMarks(positions, photoWidth, photoHeight) {
    this.printCtx.strokeStyle = '#999';
    this.printCtx.lineWidth = 0.5;

    const markLength = 15;

    positions.forEach(pos => {
      // Top-left
      this.printCtx.beginPath();
      this.printCtx.moveTo(pos.x - markLength, pos.y);
      this.printCtx.lineTo(pos.x - 3, pos.y);
      this.printCtx.moveTo(pos.x, pos.y - markLength);
      this.printCtx.lineTo(pos.x, pos.y - 3);
      this.printCtx.stroke();

      // Top-right
      this.printCtx.beginPath();
      this.printCtx.moveTo(pos.x + photoWidth + 3, pos.y);
      this.printCtx.lineTo(pos.x + photoWidth + markLength, pos.y);
      this.printCtx.moveTo(pos.x + photoWidth, pos.y - markLength);
      this.printCtx.lineTo(pos.x + photoWidth, pos.y - 3);
      this.printCtx.stroke();

      // Bottom-left
      this.printCtx.beginPath();
      this.printCtx.moveTo(pos.x - markLength, pos.y + photoHeight);
      this.printCtx.lineTo(pos.x - 3, pos.y + photoHeight);
      this.printCtx.moveTo(pos.x, pos.y + photoHeight + 3);
      this.printCtx.lineTo(pos.x, pos.y + photoHeight + markLength);
      this.printCtx.stroke();

      // Bottom-right
      this.printCtx.beginPath();
      this.printCtx.moveTo(pos.x + photoWidth + 3, pos.y + photoHeight);
      this.printCtx.lineTo(pos.x + photoWidth + markLength, pos.y + photoHeight);
      this.printCtx.moveTo(pos.x + photoWidth, pos.y + photoHeight + 3);
      this.printCtx.lineTo(pos.x + photoWidth, pos.y + photoHeight + markLength);
      this.printCtx.stroke();
    });
  }

  download() {
    this.outputCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `id_photo_${this.selectedSize.name}_${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '證件照已下載');
    }, 'image/jpeg', 0.95);
  }

  downloadPrint() {
    this.printCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `id_photo_print_${this.layout}_${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '列印版已下載（4×6相紙）');
    }, 'image/jpeg', 0.95);
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.style.display = 'none';

    this.downloadBtn.disabled = true;
    this.downloadPrintBtn.style.display = 'none';
    this.printPreview.style.display = 'none';

    // Reset selections
    document.querySelectorAll('.size-option').forEach((el, i) => {
      el.classList.toggle('selected', i === 0);
    });
    this.selectedSize = { width: 295, height: 413, name: '1吋' };

    document.querySelectorAll('.bg-color').forEach((el, i) => {
      el.classList.toggle('selected', i === 0);
    });
    this.bgColor = '#ffffff';

    document.querySelectorAll('.layout-option').forEach((el, i) => {
      el.classList.toggle('selected', i === 0);
    });
    this.layout = 'single';

    this.outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.printCtx.clearRect(0, 0, this.printCanvas.width, this.printCanvas.height);
    this.outputInfo.textContent = '';

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
  new IDPhotoTool();
});
