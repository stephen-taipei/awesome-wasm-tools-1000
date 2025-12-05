/**
 * IMG-149 圖片排序工具
 * Image Sorter Tool
 */

class ImageSorter {
  constructor() {
    this.images = [];
    this.sortField = null;
    this.sortAscending = true;
    this.viewMode = 'grid';
    this.draggedItem = null;
    this.draggedIndex = -1;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Controls
    this.controlsSection = document.getElementById('controlsSection');
    this.sortButtons = document.querySelectorAll('.sort-btn');
    this.sortDirection = document.getElementById('sortDirection');
    this.viewButtons = document.querySelectorAll('.view-btn');
    this.fileCount = document.getElementById('fileCount');

    // Gallery
    this.gallerySection = document.getElementById('gallerySection');
    this.galleryGrid = document.getElementById('galleryGrid');

    // List view
    this.listView = document.getElementById('listView');
    this.listTableBody = document.getElementById('listTableBody');

    // Buttons
    this.downloadBtn = document.getElementById('downloadBtn');
    this.shuffleBtn = document.getElementById('shuffleBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Sort buttons
    this.sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.sort;
        this.sortBy(field);
        this.updateSortButtons(field);
      });
    });

    // Sort direction
    this.sortDirection.addEventListener('click', () => {
      this.sortAscending = !this.sortAscending;
      this.sortDirection.textContent = this.sortAscending ? '↑ 升序' : '↓ 降序';
      if (this.sortField) {
        this.sortBy(this.sortField);
      }
    });

    // View toggle
    this.viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.view;
        this.updateViewButtons();
        this.render();
      });
    });

    // List table header sorting
    document.querySelectorAll('.list-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        this.sortBy(field);
        this.updateSortButtons(field);
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.shuffleBtn.addEventListener('click', () => this.shuffleImages());
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
      this.loadFiles(files);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      this.loadFiles(files);
    }
  }

  async loadFiles(files) {
    this.images = [];

    for (const file of files) {
      const imageInfo = await this.getImageInfo(file);
      this.images.push(imageInfo);
    }

    // 更新 UI
    this.uploadZone.classList.add('has-files');
    this.controlsSection.classList.add('active');
    this.gallerySection.classList.add('active');
    this.downloadBtn.disabled = false;
    this.shuffleBtn.disabled = false;
    this.fileCount.textContent = `${this.images.length} 個檔案`;

    this.render();
    this.showStatus(`已載入 ${this.images.length} 個檔案`, 'success');
  }

  getImageInfo(file) {
    return new Promise((resolve) => {
      const info = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        width: 0,
        height: 0,
        dataUrl: null
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          info.width = img.width;
          info.height = img.height;
          info.dataUrl = e.target.result;
          resolve(info);
        };
        img.onerror = () => {
          resolve(info);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  sortBy(field) {
    this.sortField = field;

    this.images.sort((a, b) => {
      let valueA, valueB;

      switch (field) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'size':
          valueA = a.size;
          valueB = b.size;
          break;
        case 'date':
          valueA = a.lastModified;
          valueB = b.lastModified;
          break;
        case 'width':
          valueA = a.width;
          valueB = b.width;
          break;
        case 'height':
          valueA = a.height;
          valueB = b.height;
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return this.sortAscending ? -1 : 1;
      if (valueA > valueB) return this.sortAscending ? 1 : -1;
      return 0;
    });

    this.render();
    this.showStatus(`已按${this.getSortFieldName(field)}${this.sortAscending ? '升序' : '降序'}排列`, 'success');
  }

  getSortFieldName(field) {
    const names = {
      name: '檔名',
      size: '大小',
      date: '日期',
      width: '寬度',
      height: '高度',
      type: '類型'
    };
    return names[field] || field;
  }

  updateSortButtons(activeField) {
    this.sortButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === activeField);
    });
  }

  updateViewButtons() {
    this.viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.viewMode);
    });

    if (this.viewMode === 'grid') {
      this.gallerySection.classList.add('active');
      this.listView.classList.remove('active');
    } else {
      this.gallerySection.classList.remove('active');
      this.listView.classList.add('active');
    }
  }

  shuffleImages() {
    // Fisher-Yates shuffle
    for (let i = this.images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.images[i], this.images[j]] = [this.images[j], this.images[i]];
    }

    this.sortField = null;
    this.sortButtons.forEach(btn => btn.classList.remove('active'));

    this.render();
    this.showStatus('已隨機排序', 'success');
  }

  render() {
    if (this.viewMode === 'grid') {
      this.renderGrid();
    } else {
      this.renderList();
    }
  }

  renderGrid() {
    this.galleryGrid.innerHTML = '';

    this.images.forEach((image, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.draggable = true;
      item.dataset.index = index;

      item.innerHTML = `
        <span class="item-order">${index + 1}</span>
        <button class="item-remove" title="移除">&times;</button>
        <img src="${image.dataUrl}" alt="${image.name}">
        <div class="item-info">
          <div class="item-name">${image.name}</div>
          <div class="item-meta">
            <span>${image.width}x${image.height}</span>
            <span>${this.formatSize(image.size)}</span>
          </div>
        </div>
      `;

      // Drag events
      item.addEventListener('dragstart', (e) => this.handleItemDragStart(e, index));
      item.addEventListener('dragend', (e) => this.handleItemDragEnd(e));
      item.addEventListener('dragover', (e) => this.handleItemDragOver(e));
      item.addEventListener('dragleave', (e) => this.handleItemDragLeave(e));
      item.addEventListener('drop', (e) => this.handleItemDrop(e, index));

      // Remove button
      item.querySelector('.item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });

      this.galleryGrid.appendChild(item);
    });
  }

  renderList() {
    this.listTableBody.innerHTML = '';

    this.images.forEach((image, index) => {
      const row = document.createElement('tr');
      row.draggable = true;
      row.dataset.index = index;

      row.innerHTML = `
        <td>${index + 1}</td>
        <td><img src="${image.dataUrl}" class="list-thumb" alt="${image.name}"></td>
        <td>${image.name}</td>
        <td>${this.formatSize(image.size)}</td>
        <td>${image.width} x ${image.height}</td>
        <td>${image.type.split('/')[1].toUpperCase()}</td>
      `;

      // Drag events for list
      row.addEventListener('dragstart', (e) => this.handleItemDragStart(e, index));
      row.addEventListener('dragend', (e) => this.handleItemDragEnd(e));
      row.addEventListener('dragover', (e) => this.handleItemDragOver(e));
      row.addEventListener('dragleave', (e) => this.handleItemDragLeave(e));
      row.addEventListener('drop', (e) => this.handleItemDrop(e, index));

      this.listTableBody.appendChild(row);
    });
  }

  handleItemDragStart(e, index) {
    this.draggedItem = e.currentTarget;
    this.draggedIndex = index;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  handleItemDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    this.draggedItem = null;
    this.draggedIndex = -1;

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  handleItemDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  handleItemDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  handleItemDrop(e, targetIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (this.draggedIndex !== -1 && this.draggedIndex !== targetIndex) {
      // Move item
      const [removed] = this.images.splice(this.draggedIndex, 1);
      this.images.splice(targetIndex, 0, removed);

      // Clear sort state
      this.sortField = null;
      this.sortButtons.forEach(btn => btn.classList.remove('active'));

      this.render();
      this.showStatus('已更新排序', 'success');
    }
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.fileCount.textContent = `${this.images.length} 個檔案`;

    if (this.images.length === 0) {
      this.reset();
    } else {
      this.render();
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async downloadZip() {
    if (this.images.length === 0) {
      this.showStatus('沒有圖片可下載', 'error');
      return;
    }

    try {
      this.downloadBtn.disabled = true;
      this.downloadBtn.innerHTML = '<span>⏳</span> 打包中...';

      const zip = new JSZip();
      const padding = String(this.images.length).length;

      // 添加檔案，使用排序後的順序編號
      for (let i = 0; i < this.images.length; i++) {
        const image = this.images[i];
        const ext = image.name.substring(image.name.lastIndexOf('.'));
        const newName = `${String(i + 1).padStart(padding, '0')}_${image.name}`;

        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        zip.file(newName, blob);
      }

      // 生成 ZIP
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // 下載
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `sorted_images_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('ZIP 檔案已下載！', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showStatus('下載過程中發生錯誤', 'error');
    } finally {
      this.downloadBtn.disabled = false;
      this.downloadBtn.innerHTML = '<span>💾</span> 下載排序後的 ZIP';
    }
  }

  reset() {
    this.images = [];
    this.sortField = null;
    this.sortAscending = true;
    this.viewMode = 'grid';

    // 重置 UI
    this.uploadZone.classList.remove('has-files');
    this.controlsSection.classList.remove('active');
    this.gallerySection.classList.remove('active');
    this.listView.classList.remove('active');
    this.downloadBtn.disabled = true;
    this.shuffleBtn.disabled = true;
    this.fileInput.value = '';
    this.galleryGrid.innerHTML = '';
    this.listTableBody.innerHTML = '';

    // 重置排序按鈕
    this.sortButtons.forEach(btn => btn.classList.remove('active'));
    this.sortDirection.textContent = '↑ 升序';

    // 重置視圖按鈕
    this.viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'grid');
    });

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
  new ImageSorter();
});
