/**
 * IMG-095 GIF 分解幀
 * 將 GIF 動畫分解為單獨的影格圖片
 */

class GifFrameExtractor {
  constructor() {
    this.gifData = null;
    this.frames = [];
    this.selectedFrames = new Set();
    this.outputFormat = 'png';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');

    this.gifPreview = document.getElementById('gifPreview');
    this.fileName = document.getElementById('fileName');
    this.dimensions = document.getElementById('dimensions');
    this.frameCount = document.getElementById('frameCount');
    this.duration = document.getElementById('duration');

    this.framesGrid = document.getElementById('framesGrid');
    this.selectAllBtn = document.getElementById('selectAllBtn');
    this.deselectAllBtn = document.getElementById('deselectAllBtn');
    this.selectOddBtn = document.getElementById('selectOddBtn');
    this.selectEvenBtn = document.getElementById('selectEvenBtn');

    this.outputFormatSelect = document.getElementById('outputFormat');
    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');

    this.exportBtn = document.getElementById('exportBtn');
    this.exportAllBtn = document.getElementById('exportAllBtn');
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
      if (file) this.loadGif(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadGif(file);
    });

    // Selection controls
    this.selectAllBtn.addEventListener('click', () => this.selectAll());
    this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
    this.selectOddBtn.addEventListener('click', () => this.selectOdd());
    this.selectEvenBtn.addEventListener('click', () => this.selectEven());

    // Format
    this.outputFormatSelect.addEventListener('change', () => {
      this.outputFormat = this.outputFormatSelect.value;
    });

    // Buttons
    this.exportBtn.addEventListener('click', () => this.exportSelected());
    this.exportAllBtn.addEventListener('click', () => this.exportAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  async loadGif(file) {
    if (!file.type.match(/^image\/gif$/)) {
      this.showStatus('error', '請選擇 GIF 格式檔案');
      return;
    }

    this.showStatus('success', '正在解析 GIF...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      this.gifData = {
        name: file.name,
        width: gif.lsd.width,
        height: gif.lsd.height
      };

      this.frames = frames.map((frame, index) => ({
        index: index,
        delay: frame.delay * 10, // Convert to ms
        imageData: this.createImageData(frame, gif.lsd.width, gif.lsd.height),
        disposalType: frame.disposalType
      }));

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      this.gifPreview.src = previewUrl;

      // Update info
      this.fileName.textContent = file.name;
      this.dimensions.textContent = `${this.gifData.width} x ${this.gifData.height} px`;
      this.frameCount.textContent = `${this.frames.length} 幀`;

      const totalDuration = this.frames.reduce((sum, f) => sum + f.delay, 0);
      this.duration.textContent = `${(totalDuration / 1000).toFixed(2)} 秒`;

      // Show editor
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.exportBtn.disabled = false;
      this.exportAllBtn.disabled = false;

      // Render frames
      await this.renderFrames();

      this.showStatus('success', `成功解析 ${this.frames.length} 個影格`);

    } catch (error) {
      console.error('GIF parse error:', error);
      this.showStatus('error', 'GIF 解析失敗：' + error.message);
    }
  }

  createImageData(frame, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create ImageData from patch
    const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
    imageData.data.set(frame.patch);

    // Draw at correct position
    ctx.putImageData(imageData, frame.dims.left, frame.dims.top);

    return canvas;
  }

  async renderFrames() {
    this.framesGrid.innerHTML = '';

    // Composite frames (handle disposal)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = this.gifData.width;
    compositeCanvas.height = this.gifData.height;
    const compositeCtx = compositeCanvas.getContext('2d');

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];

      // Draw current frame on composite
      compositeCtx.drawImage(frame.imageData, 0, 0);

      // Create display image
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = this.gifData.width;
      displayCanvas.height = this.gifData.height;
      const displayCtx = displayCanvas.getContext('2d');
      displayCtx.drawImage(compositeCanvas, 0, 0);

      // Store composite for export
      frame.compositeDataUrl = displayCanvas.toDataURL('image/png');

      // Create frame card
      const card = document.createElement('div');
      card.className = 'frame-card';
      card.dataset.index = i;

      const img = document.createElement('img');
      img.src = frame.compositeDataUrl;

      card.innerHTML = `
        <div class="frame-image"></div>
        <div class="frame-info">
          <span class="frame-number">幀 ${i + 1}</span>
          <span class="frame-delay">${frame.delay}ms</span>
        </div>
        <div class="frame-checkbox">
          <input type="checkbox" id="frame-${i}" data-index="${i}">
          <label for="frame-${i}">選擇</label>
        </div>
      `;

      card.querySelector('.frame-image').appendChild(img);

      // Checkbox event
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedFrames.add(i);
          card.classList.add('selected');
        } else {
          this.selectedFrames.delete(i);
          card.classList.remove('selected');
        }
        this.updateExportButton();
      });

      this.framesGrid.appendChild(card);

      // Handle disposal for next frame
      if (frame.disposalType === 2) {
        // Restore to background
        compositeCtx.clearRect(0, 0, this.gifData.width, this.gifData.height);
      }
      // disposalType 3 (restore to previous) is complex, skipping for simplicity
    }
  }

  selectAll() {
    this.frames.forEach((_, i) => {
      this.selectedFrames.add(i);
    });
    this.updateCheckboxes();
  }

  deselectAll() {
    this.selectedFrames.clear();
    this.updateCheckboxes();
  }

  selectOdd() {
    this.selectedFrames.clear();
    this.frames.forEach((_, i) => {
      if (i % 2 === 0) { // 0-indexed, so even index = odd frame number
        this.selectedFrames.add(i);
      }
    });
    this.updateCheckboxes();
  }

  selectEven() {
    this.selectedFrames.clear();
    this.frames.forEach((_, i) => {
      if (i % 2 === 1) { // 0-indexed, so odd index = even frame number
        this.selectedFrames.add(i);
      }
    });
    this.updateCheckboxes();
  }

  updateCheckboxes() {
    document.querySelectorAll('.frame-card').forEach(card => {
      const index = parseInt(card.dataset.index);
      const checkbox = card.querySelector('input[type="checkbox"]');
      const isSelected = this.selectedFrames.has(index);
      checkbox.checked = isSelected;
      card.classList.toggle('selected', isSelected);
    });
    this.updateExportButton();
  }

  updateExportButton() {
    this.exportBtn.disabled = this.selectedFrames.size === 0;
  }

  async exportSelected() {
    if (this.selectedFrames.size === 0) {
      this.showStatus('error', '請選擇要匯出的影格');
      return;
    }

    const indices = Array.from(this.selectedFrames).sort((a, b) => a - b);
    await this.exportFrames(indices);
  }

  async exportAll() {
    const indices = this.frames.map((_, i) => i);
    await this.exportFrames(indices);
  }

  async exportFrames(indices) {
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';
    this.exportBtn.disabled = true;
    this.exportAllBtn.disabled = true;

    try {
      const baseName = this.gifData.name.replace(/\.gif$/i, '');

      for (let i = 0; i < indices.length; i++) {
        const frameIndex = indices[i];
        const frame = this.frames[frameIndex];

        // Convert to target format
        const canvas = document.createElement('canvas');
        canvas.width = this.gifData.width;
        canvas.height = this.gifData.height;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        await new Promise(resolve => {
          img.onload = resolve;
          img.src = frame.compositeDataUrl;
        });

        ctx.drawImage(img, 0, 0);

        // Get blob in target format
        let mimeType = 'image/png';
        let extension = 'png';
        let quality = 0.92;

        if (this.outputFormat === 'jpg') {
          mimeType = 'image/jpeg';
          extension = 'jpg';
          // Fill background for JPG (no transparency)
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, canvas.width, canvas.height);
          tempCtx.drawImage(canvas, 0, 0);
          canvas.width = tempCanvas.width;
          canvas.height = tempCanvas.height;
          ctx.drawImage(tempCanvas, 0, 0);
        } else if (this.outputFormat === 'webp') {
          mimeType = 'image/webp';
          extension = 'webp';
        }

        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, mimeType, quality);
        });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${baseName}_frame_${String(frameIndex + 1).padStart(4, '0')}.${extension}`;
        link.click();
        URL.revokeObjectURL(link.href);

        const progress = ((i + 1) / indices.length) * 100;
        this.progressFill.style.width = `${progress}%`;

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.showStatus('success', `已匯出 ${indices.length} 個影格`);

    } catch (error) {
      console.error('Export error:', error);
      this.showStatus('error', '匯出失敗：' + error.message);
    }

    this.progressBar.classList.remove('active');
    this.exportBtn.disabled = this.selectedFrames.size === 0;
    this.exportAllBtn.disabled = false;
  }

  reset() {
    this.gifData = null;
    this.frames = [];
    this.selectedFrames.clear();
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.exportBtn.disabled = true;
    this.exportAllBtn.disabled = true;

    this.gifPreview.src = '';
    this.fileName.textContent = '-';
    this.dimensions.textContent = '-';
    this.frameCount.textContent = '-';
    this.duration.textContent = '-';

    this.framesGrid.innerHTML = '';
    this.outputFormatSelect.value = 'png';
    this.outputFormat = 'png';

    this.progressBar.classList.remove('active');
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new GifFrameExtractor();
});
