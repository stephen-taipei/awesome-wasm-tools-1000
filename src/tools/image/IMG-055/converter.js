/**
 * IMG-055 長截圖合併
 * 合併多張連續截圖成一張長圖
 */

class LongScreenshotTool {
  constructor() {
    this.images = [];
    this.resultBlob = null;
    this.draggedItem = null;
    this.mode = 'simple';

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

    this.overlapRow = document.getElementById('overlapRow');
    this.overlapSlider = document.getElementById('overlapSlider');
    this.overlapValue = document.getElementById('overlapValue');

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

    // Mode options
    document.querySelectorAll('.mode-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.mode = el.dataset.mode;
        this.overlapRow.style.display = this.mode === 'overlap' ? 'flex' : 'none';
      });
    });

    // Overlap slider
    this.overlapSlider.addEventListener('input', () => {
      this.overlapValue.textContent = `${this.overlapSlider.value}%`;
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
  }

  updateUI() {
    const hasImages = this.images.length >= 2;
    this.imageList.style.display = this.images.length > 0 ? 'block' : 'none';
    this.optionsPanel.style.display = this.images.length > 0 ? 'block' : 'none';
    this.mergeBtn.disabled = !hasImages;

    if (this.images.length === 1) {
      this.showStatus('info', '請至少上傳 2 張截圖進行合併');
    } else {
      this.statusMessage.style.display = 'none';
    }
  }

  async merge() {
    if (this.images.length < 2) {
      this.showStatus('error', '請至少上傳 2 張截圖');
      return;
    }

    this.mergeBtn.disabled = true;
    this.showStatus('info', '正在處理中...');

    try {
      let offsets;

      if (this.mode === 'overlap') {
        offsets = await this.detectOverlaps();
      } else {
        // Simple mode: no overlap
        offsets = this.images.map((img, i) => ({
          index: i,
          offset: i === 0 ? 0 : this.images.slice(0, i).reduce((sum, item) => sum + item.image.height, 0)
        }));
      }

      // Calculate total dimensions
      const maxWidth = Math.max(...this.images.map(item => item.image.width));
      let totalHeight;

      if (this.mode === 'overlap') {
        const lastOffset = offsets[offsets.length - 1];
        totalHeight = lastOffset.offset + this.images[lastOffset.index].image.height;
      } else {
        totalHeight = this.images.reduce((sum, item) => sum + item.image.height, 0);
      }

      // Draw merged image
      this.previewCanvas.width = maxWidth;
      this.previewCanvas.height = totalHeight;

      this.previewCtx.fillStyle = '#ffffff';
      this.previewCtx.fillRect(0, 0, maxWidth, totalHeight);

      offsets.forEach(({ index, offset }) => {
        const item = this.images[index];
        const x = Math.floor((maxWidth - item.image.width) / 2);
        this.previewCtx.drawImage(item.image, x, offset);
      });

      // Generate blob
      const format = document.querySelector('input[name="format"]:checked').value;
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';
      const quality = format === 'png' ? 1 : 0.92;

      this.resultBlob = await new Promise((resolve) => {
        this.previewCanvas.toBlob(resolve, mimeType, quality);
      });

      this.previewSection.style.display = 'block';
      this.previewInfo.textContent = `${maxWidth} × ${totalHeight} | ${this.formatSize(this.resultBlob.size)}`;

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', `已合併 ${this.images.length} 張截圖！`);

    } catch (error) {
      console.error('Merge error:', error);
      this.showStatus('error', `合併失敗：${error.message}`);
    }

    this.mergeBtn.disabled = false;
  }

  async detectOverlaps() {
    const searchPercent = parseInt(this.overlapSlider.value) / 100;
    const offsets = [{ index: 0, offset: 0 }];
    let currentOffset = 0;

    for (let i = 1; i < this.images.length; i++) {
      const prevImg = this.images[i - 1].image;
      const currImg = this.images[i].image;

      const overlap = this.findOverlap(prevImg, currImg, searchPercent);
      currentOffset += prevImg.height - overlap;

      offsets.push({ index: i, offset: currentOffset });
    }

    return offsets;
  }

  findOverlap(img1, img2, searchPercent) {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    // Use smaller sample for performance
    const sampleWidth = Math.min(img1.width, img2.width, 300);
    const scale = sampleWidth / Math.min(img1.width, img2.width);

    canvas1.width = sampleWidth;
    canvas1.height = Math.floor(img1.height * scale);
    canvas2.width = sampleWidth;
    canvas2.height = Math.floor(img2.height * scale);

    ctx1.drawImage(img1, 0, 0, canvas1.width, canvas1.height);
    ctx2.drawImage(img2, 0, 0, canvas2.width, canvas2.height);

    const data1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height).data;
    const data2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height).data;

    const maxSearch = Math.floor(canvas1.height * searchPercent);
    let bestOverlap = 0;
    let bestScore = Infinity;

    for (let overlap = 10; overlap < maxSearch; overlap += 2) {
      const score = this.compareRegions(
        data1, canvas1.width, canvas1.height - overlap, overlap,
        data2, canvas2.width, 0, overlap,
        canvas1.width
      );

      if (score < bestScore) {
        bestScore = score;
        bestOverlap = overlap;
      }
    }

    // Only use overlap if score is good enough
    if (bestScore > 50) {
      return 0;
    }

    return Math.floor(bestOverlap / scale);
  }

  compareRegions(data1, w1, y1, h1, data2, w2, y2, h2, width) {
    let diff = 0;
    const samples = Math.min(h1, h2);
    const samplePoints = 100;

    for (let s = 0; s < samplePoints; s++) {
      const y = Math.floor((s / samplePoints) * samples);
      const x = Math.floor(Math.random() * width);

      const idx1 = ((y1 + y) * w1 + x) * 4;
      const idx2 = ((y2 + y) * w2 + x) * 4;

      const r1 = data1[idx1], g1 = data1[idx1 + 1], b1 = data1[idx1 + 2];
      const r2 = data2[idx2], g2 = data2[idx2 + 1], b2 = data2[idx2 + 2];

      diff += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    }

    return diff / samplePoints;
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
    link.download = `long_screenshot_${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.images = [];
    this.resultBlob = null;
    this.mode = 'simple';

    this.fileInput.value = '';
    this.sortableList.innerHTML = '';
    this.imageList.style.display = 'none';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.mergeBtn.disabled = true;

    document.querySelectorAll('.mode-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.mode === 'simple');
    });
    this.overlapRow.style.display = 'none';
    this.overlapSlider.value = 20;
    this.overlapValue.textContent = '20%';

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
  new LongScreenshotTool();
});
