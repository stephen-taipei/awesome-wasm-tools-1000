/**
 * IMG-156 圖片合併工具
 * Image Merger Tool
 */

class ImageMerger {
  constructor() {
    this.images = [];
    this.resultCanvas = null;

    this.settings = {
      direction: 'horizontal',
      sizeMode: 'fit',
      spacing: 0,
      bgColor: '#ffffff',
      format: 'png',
      quality: 90
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Images section
    this.imagesSection = document.getElementById('imagesSection');
    this.imagesGrid = document.getElementById('imagesGrid');
    this.imagesCount = document.getElementById('imagesCount');

    // Settings
    this.settingsSection = document.getElementById('settingsSection');
    this.directionSelect = document.getElementById('direction');
    this.sizeModeSelect = document.getElementById('sizeMode');
    this.spacingInput = document.getElementById('spacing');
    this.bgColorPicker = document.getElementById('bgColor');
    this.bgColorValue = document.getElementById('bgColorValue');
    this.outputFormat = document.getElementById('outputFormat');
    this.qualityInput = document.getElementById('quality');

    // Preview
    this.previewSection = document.getElementById('previewSection');
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    // Buttons
    this.buttonGroup = document.getElementById('buttonGroup');
    this.mergeBtn = document.getElementById('mergeBtn');
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
    this.directionSelect.addEventListener('change', (e) => {
      this.settings.direction = e.target.value;
    });

    this.sizeModeSelect.addEventListener('change', (e) => {
      this.settings.sizeMode = e.target.value;
    });

    this.spacingInput.addEventListener('change', (e) => {
      this.settings.spacing = parseInt(e.target.value) || 0;
    });

    this.bgColorPicker.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorValue.value = e.target.value;
    });

    this.bgColorValue.addEventListener('change', (e) => {
      this.settings.bgColor = e.target.value;
      this.bgColorPicker.value = e.target.value;
    });

    this.outputFormat.addEventListener('change', (e) => {
      this.settings.format = e.target.value;
    });

    this.qualityInput.addEventListener('change', (e) => {
      this.settings.quality = parseInt(e.target.value) || 90;
    });

    // Buttons
    this.mergeBtn.addEventListener('click', () => this.mergeImages());
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

    if (this.images.length > 0) {
      this.uploadZone.classList.add('has-files');
      this.imagesSection.classList.add('active');
      this.settingsSection.classList.add('active');
      this.buttonGroup.style.display = 'flex';

      this.renderImagesList();
      this.showStatus(`已載入 ${files.length} 張圖片`, 'success');
    }
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
            width: img.width,
            height: img.height,
            dataUrl: e.target.result
          });
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  renderImagesList() {
    this.imagesGrid.innerHTML = '';

    this.images.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'image-item';
      item.draggable = true;
      item.dataset.index = index;

      item.innerHTML = `
        <span class="image-item-order">${index + 1}</span>
        <button class="image-item-remove">&times;</button>
        <img src="${img.dataUrl}" alt="${img.name}">
        <div class="image-item-info">${img.width}×${img.height}</div>
      `;

      // Drag events
      item.addEventListener('dragstart', (e) => this.handleItemDragStart(e, index));
      item.addEventListener('dragend', (e) => this.handleItemDragEnd(e));
      item.addEventListener('dragover', (e) => this.handleItemDragOver(e));
      item.addEventListener('drop', (e) => this.handleItemDrop(e, index));

      // Remove button
      item.querySelector('.image-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });

      this.imagesGrid.appendChild(item);
    });

    this.imagesCount.textContent = `${this.images.length} 張`;
  }

  handleItemDragStart(e, index) {
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.setData('text/plain', index);
  }

  handleItemDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
  }

  handleItemDragOver(e) {
    e.preventDefault();
  }

  handleItemDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (sourceIndex !== targetIndex) {
      const [removed] = this.images.splice(sourceIndex, 1);
      this.images.splice(targetIndex, 0, removed);
      this.renderImagesList();
    }
  }

  removeImage(index) {
    this.images.splice(index, 1);

    if (this.images.length === 0) {
      this.reset();
    } else {
      this.renderImagesList();
    }
  }

  mergeImages() {
    if (this.images.length < 2) {
      this.showStatus('請至少選擇 2 張圖片', 'error');
      return;
    }

    const direction = this.settings.direction;
    const sizeMode = this.settings.sizeMode;
    const spacing = this.settings.spacing;

    // Calculate target dimensions
    let targetWidth, targetHeight;

    if (sizeMode === 'fit') {
      targetWidth = Math.max(...this.images.map(img => img.width));
      targetHeight = Math.max(...this.images.map(img => img.height));
    } else if (sizeMode === 'first') {
      targetWidth = this.images[0].width;
      targetHeight = this.images[0].height;
    }

    // Calculate canvas size
    let canvasWidth, canvasHeight;

    if (direction === 'horizontal') {
      if (sizeMode === 'original') {
        canvasWidth = this.images.reduce((sum, img) => sum + img.width, 0) + spacing * (this.images.length - 1);
        canvasHeight = Math.max(...this.images.map(img => img.height));
      } else {
        canvasWidth = targetWidth * this.images.length + spacing * (this.images.length - 1);
        canvasHeight = targetHeight;
      }
    } else {
      if (sizeMode === 'original') {
        canvasWidth = Math.max(...this.images.map(img => img.width));
        canvasHeight = this.images.reduce((sum, img) => sum + img.height, 0) + spacing * (this.images.length - 1);
      } else {
        canvasWidth = targetWidth;
        canvasHeight = targetHeight * this.images.length + spacing * (this.images.length - 1);
      }
    }

    // Create canvas
    this.previewCanvas.width = canvasWidth;
    this.previewCanvas.height = canvasHeight;

    // Fill background
    this.previewCtx.fillStyle = this.settings.bgColor;
    this.previewCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw images
    let x = 0, y = 0;

    this.images.forEach((imgData, index) => {
      let drawWidth, drawHeight, drawX, drawY;

      if (sizeMode === 'original') {
        drawWidth = imgData.width;
        drawHeight = imgData.height;

        if (direction === 'horizontal') {
          drawX = x;
          drawY = (canvasHeight - drawHeight) / 2;
          x += drawWidth + spacing;
        } else {
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = y;
          y += drawHeight + spacing;
        }
      } else {
        drawWidth = targetWidth;
        drawHeight = targetHeight;

        if (direction === 'horizontal') {
          drawX = x;
          drawY = 0;
          x += targetWidth + spacing;
        } else {
          drawX = 0;
          drawY = y;
          y += targetHeight + spacing;
        }

        // Scale image to fit
        const scale = Math.min(targetWidth / imgData.width, targetHeight / imgData.height);
        const scaledWidth = imgData.width * scale;
        const scaledHeight = imgData.height * scale;
        const offsetX = (targetWidth - scaledWidth) / 2;
        const offsetY = (targetHeight - scaledHeight) / 2;

        this.previewCtx.drawImage(
          imgData.image,
          drawX + offsetX,
          drawY + offsetY,
          scaledWidth,
          scaledHeight
        );
        return;
      }

      this.previewCtx.drawImage(imgData.image, drawX, drawY, drawWidth, drawHeight);
    });

    // Show preview
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;
    this.previewInfo.textContent = `${canvasWidth} × ${canvasHeight} px`;

    this.showStatus('合併完成！', 'success');
  }

  downloadImage() {
    if (this.previewCanvas.width === 0) {
      this.showStatus('請先合併圖片', 'error');
      return;
    }

    const mimeType = this.settings.format === 'jpeg' ? 'image/jpeg' :
                     this.settings.format === 'webp' ? 'image/webp' : 'image/png';
    const extension = this.settings.format === 'jpeg' ? 'jpg' : this.settings.format;
    const quality = this.settings.quality / 100;

    const link = document.createElement('a');
    link.download = `merged_${Date.now()}.${extension}`;
    link.href = this.previewCanvas.toDataURL(mimeType, quality);
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.images = [];
    this.resultCanvas = null;

    // Reset UI
    this.uploadZone.classList.remove('has-files');
    this.imagesSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.buttonGroup.style.display = 'none';
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.imagesGrid.innerHTML = '';

    // Reset settings
    this.settings = {
      direction: 'horizontal',
      sizeMode: 'fit',
      spacing: 0,
      bgColor: '#ffffff',
      format: 'png',
      quality: 90
    };

    this.directionSelect.value = 'horizontal';
    this.sizeModeSelect.value = 'fit';
    this.spacingInput.value = 0;
    this.bgColorPicker.value = '#ffffff';
    this.bgColorValue.value = '#ffffff';
    this.outputFormat.value = 'png';
    this.qualityInput.value = 90;

    // Clear canvas
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

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
  new ImageMerger();
});
