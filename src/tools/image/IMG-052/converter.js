/**
 * IMG-052 多圖垂直拼接
 * 將多張圖片垂直縱向拼接成一張
 */

class VerticalMergeTool {
  constructor() {
    this.images = [];
    this.resultBlob = null;
    this.draggedItem = null;
    this.align = 'center';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.imageList = document.getElementById('imageList');
    this.sortableList = document.getElementById('sortableList');
    this.imageCount = document.getElementById('imageCount');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.gapSlider = document.getElementById('gapSlider');
    this.gapValue = document.getElementById('gapValue');
    this.bgColor = document.getElementById('bgColor');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.mergeBtn = document.getElementById('mergeBtn');
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
      this.addFiles(e.dataTransfer.files);
    });
    this.fileInput.addEventListener('change', (e) => {
      this.addFiles(e.target.files);
    });

    // Slider events
    this.gapSlider.addEventListener('input', () => {
      this.gapValue.textContent = `${this.gapSlider.value}px`;
      this.updatePreview();
    });

    this.bgColor.addEventListener('input', () => {
      this.updatePreview();
    });

    // Align options
    document.querySelectorAll('.align-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.align-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.align = el.dataset.align;
        this.updatePreview();
      });
    });

    // Action buttons
    this.mergeBtn.addEventListener('click', () => this.merge());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  addFiles(fileList) {
    const loadPromises = [];

    for (const file of fileList) {
      if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        continue;
      }

      const promise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.images.push({
              id: Date.now() + Math.random().toString(36).substr(2, 9),
              file,
              image: img,
              dataUrl: e.target.result
            });
            resolve();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });

      loadPromises.push(promise);
    }

    Promise.all(loadPromises).then(() => {
      this.renderImageList();
      this.updateUI();
      this.updatePreview();
    });
  }

  renderImageList() {
    this.sortableList.innerHTML = '';

    this.images.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'sortable-item';
      div.draggable = true;
      div.dataset.id = item.id;

      div.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.file.name}">
        <div class="item-info">${item.file.name}<br>${item.image.width} × ${item.image.height}</div>
        <span class="order-badge">${index + 1}</span>
        <button class="remove-btn">×</button>
      `;

      // Drag events
      div.addEventListener('dragstart', (e) => {
        this.draggedItem = div;
        div.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        this.draggedItem = null;
        this.updateOrderBadges();
        this.updatePreview();
      });

      div.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.draggedItem && this.draggedItem !== div) {
          const rect = div.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            this.sortableList.insertBefore(this.draggedItem, div);
          } else {
            this.sortableList.insertBefore(this.draggedItem, div.nextSibling);
          }
          this.reorderImages();
        }
      });

      // Remove button
      div.querySelector('.remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(item.id);
      });

      this.sortableList.appendChild(div);
    });

    this.imageCount.textContent = `${this.images.length} 張`;
  }

  reorderImages() {
    const newOrder = [];
    this.sortableList.querySelectorAll('.sortable-item').forEach(el => {
      const id = el.dataset.id;
      const item = this.images.find(img => img.id === id);
      if (item) newOrder.push(item);
    });
    this.images = newOrder;
  }

  updateOrderBadges() {
    this.sortableList.querySelectorAll('.sortable-item').forEach((el, index) => {
      el.querySelector('.order-badge').textContent = index + 1;
    });
  }

  removeImage(id) {
    this.images = this.images.filter(img => img.id !== id);
    this.renderImageList();
    this.updateUI();
    this.updatePreview();
  }

  updateUI() {
    const hasImages = this.images.length >= 2;
    this.imageList.style.display = this.images.length > 0 ? 'block' : 'none';
    this.optionsPanel.style.display = this.images.length > 0 ? 'block' : 'none';
    this.previewSection.style.display = hasImages ? 'block' : 'none';
    this.mergeBtn.disabled = !hasImages;

    if (this.images.length === 1) {
      this.showStatus('info', '請至少上傳 2 張圖片進行拼接');
    } else {
      this.statusMessage.style.display = 'none';
    }
  }

  updatePreview() {
    if (this.images.length < 2) return;

    const gap = parseInt(this.gapSlider.value);
    const bgColor = this.bgColor.value;

    // Calculate dimensions
    let totalHeight = 0;
    let maxWidth = 0;

    this.images.forEach(item => {
      totalHeight += item.image.height;
      maxWidth = Math.max(maxWidth, item.image.width);
    });

    totalHeight += gap * (this.images.length - 1);

    // Set canvas size
    this.previewCanvas.width = maxWidth;
    this.previewCanvas.height = totalHeight;

    // Fill background
    this.previewCtx.fillStyle = bgColor;
    this.previewCtx.fillRect(0, 0, maxWidth, totalHeight);

    // Draw images
    let y = 0;
    this.images.forEach(item => {
      let x = 0;

      if (this.align === 'center') {
        x = (maxWidth - item.image.width) / 2;
      } else if (this.align === 'right') {
        x = maxWidth - item.image.width;
      }

      this.previewCtx.drawImage(item.image, x, y);
      y += item.image.height + gap;
    });

    this.previewInfo.textContent = `${maxWidth} × ${totalHeight}`;
  }

  async merge() {
    if (this.images.length < 2) {
      this.showStatus('error', '請至少上傳 2 張圖片');
      return;
    }

    this.mergeBtn.disabled = true;

    try {
      // Preview canvas already has the merged image
      const format = document.querySelector('input[name="format"]:checked').value;
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = format === 'png' ? 1 : 0.92;

      this.resultBlob = await new Promise((resolve) => {
        this.previewCanvas.toBlob(resolve, mimeType, quality);
      });

      this.previewInfo.textContent = `${this.previewCanvas.width} × ${this.previewCanvas.height} | ${this.formatSize(this.resultBlob.size)}`;

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', `已拼接 ${this.images.length} 張圖片！`);

    } catch (error) {
      console.error('Merge error:', error);
      this.showStatus('error', `拼接失敗：${error.message}`);
    }

    this.mergeBtn.disabled = false;
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
    link.download = `vertical_merge_${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.images = [];
    this.resultBlob = null;

    this.fileInput.value = '';
    this.sortableList.innerHTML = '';
    this.imageList.style.display = 'none';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.mergeBtn.disabled = true;

    this.gapSlider.value = 0;
    this.gapValue.textContent = '0px';
    this.bgColor.value = '#ffffff';

    document.querySelectorAll('.align-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.align === 'center');
    });
    this.align = 'center';

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
  new VerticalMergeTool();
});
