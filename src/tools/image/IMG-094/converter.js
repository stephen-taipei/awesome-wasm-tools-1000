/**
 * IMG-094 GIF 動畫製作
 * 將多張圖片合成為 GIF 動畫
 */

class GifMaker {
  constructor() {
    this.frames = [];
    this.frameDelay = 200;
    this.loopCount = 0;
    this.outputSize = 'original';
    this.isPlaying = false;
    this.previewInterval = null;
    this.currentFrame = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');
    this.framesList = document.getElementById('framesList');
    this.addMoreBtn = document.getElementById('addMoreBtn');

    this.frameDelaySlider = document.getElementById('frameDelay');
    this.frameDelayValue = document.getElementById('frameDelayValue');
    this.loopCountSelect = document.getElementById('loopCount');
    this.outputSizeSelect = document.getElementById('outputSize');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.playBtn = document.getElementById('playBtn');
    this.stopBtn = document.getElementById('stopBtn');

    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');

    this.createBtn = document.getElementById('createBtn');
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
      const files = Array.from(e.dataTransfer.files);
      this.loadImages(files);
    });
    this.fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) this.loadImages(files);
    });

    // Add more button
    this.addMoreBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Settings
    this.frameDelaySlider.addEventListener('input', () => {
      this.frameDelay = parseInt(this.frameDelaySlider.value);
      this.frameDelayValue.textContent = `${this.frameDelay} ms`;
      if (this.isPlaying) {
        this.stopPreview();
        this.playPreview();
      }
    });

    this.loopCountSelect.addEventListener('change', () => {
      this.loopCount = parseInt(this.loopCountSelect.value);
    });

    this.outputSizeSelect.addEventListener('change', () => {
      this.outputSize = this.outputSizeSelect.value;
    });

    // Preview controls
    this.playBtn.addEventListener('click', () => this.playPreview());
    this.stopBtn.addEventListener('click', () => this.stopPreview());

    // Buttons
    this.createBtn.addEventListener('click', () => this.createGif());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImages(files) {
    const imageFiles = files.filter(f => f.type.match(/^image\/(png|jpeg|webp)$/));

    if (imageFiles.length === 0) {
      this.showStatus('error', '請選擇 PNG、JPG 或 WebP 圖片');
      return;
    }

    let loadedCount = 0;
    const startIndex = this.frames.length;

    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.frames.push({
            id: Date.now() + index,
            image: img,
            dataUrl: e.target.result
          });

          loadedCount++;
          if (loadedCount === imageFiles.length) {
            this.updateUI();
            this.showStatus('success', `已載入 ${imageFiles.length} 張圖片`);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateUI() {
    if (this.frames.length > 0) {
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.createBtn.disabled = this.frames.length < 2;
    }

    this.renderFramesList();
    this.updatePreview();
  }

  renderFramesList() {
    this.framesList.innerHTML = '';

    this.frames.forEach((frame, index) => {
      const item = document.createElement('div');
      item.className = 'frame-item';
      item.draggable = true;
      item.dataset.index = index;

      item.innerHTML = `
        <img src="${frame.dataUrl}" alt="Frame ${index + 1}">
        <span class="frame-number">${index + 1}</span>
        <button class="frame-remove" data-index="${index}">&times;</button>
      `;

      // Drag events
      item.addEventListener('dragstart', (e) => this.onDragStart(e, index));
      item.addEventListener('dragover', (e) => this.onDragOver(e));
      item.addEventListener('drop', (e) => this.onDrop(e, index));
      item.addEventListener('dragend', () => this.onDragEnd());

      // Remove button
      item.querySelector('.frame-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFrame(index);
      });

      this.framesList.appendChild(item);
    });
  }

  onDragStart(e, index) {
    this.dragIndex = index;
    e.target.classList.add('dragging');
  }

  onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e, dropIndex) {
    e.preventDefault();
    if (this.dragIndex === dropIndex) return;

    const draggedFrame = this.frames[this.dragIndex];
    this.frames.splice(this.dragIndex, 1);
    this.frames.splice(dropIndex, 0, draggedFrame);

    this.renderFramesList();
  }

  onDragEnd() {
    document.querySelectorAll('.frame-item').forEach(item => {
      item.classList.remove('dragging');
    });
  }

  removeFrame(index) {
    this.frames.splice(index, 1);

    if (this.frames.length === 0) {
      this.reset();
    } else {
      this.updateUI();
    }
  }

  updatePreview() {
    if (this.frames.length === 0) return;

    const frame = this.frames[this.currentFrame % this.frames.length];
    const img = frame.image;

    // Calculate preview size
    const maxSize = 200;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    this.previewCanvas.width = Math.floor(img.width * scale);
    this.previewCanvas.height = Math.floor(img.height * scale);

    this.previewCtx.drawImage(img, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
  }

  playPreview() {
    if (this.frames.length < 2) return;

    this.isPlaying = true;
    this.playBtn.classList.add('active');
    this.stopBtn.classList.remove('active');

    this.previewInterval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.updatePreview();
    }, this.frameDelay);
  }

  stopPreview() {
    this.isPlaying = false;
    this.playBtn.classList.remove('active');
    this.stopBtn.classList.add('active');

    if (this.previewInterval) {
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
  }

  async createGif() {
    if (this.frames.length < 2) {
      this.showStatus('error', '至少需要 2 張圖片');
      return;
    }

    this.stopPreview();
    this.createBtn.disabled = true;
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';

    try {
      // Determine output dimensions
      let width, height;
      const firstImg = this.frames[0].image;

      if (this.outputSize === 'original') {
        width = firstImg.width;
        height = firstImg.height;
      } else {
        const maxSize = parseInt(this.outputSize);
        const scale = Math.min(1, maxSize / Math.max(firstImg.width, firstImg.height));
        width = Math.floor(firstImg.width * scale);
        height = Math.floor(firstImg.height * scale);
      }

      // Create GIF using gif.js
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: '/vendor/gif/gif.worker.js'
      });

      // Add frames
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      this.frames.forEach((frame, index) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame.image, 0, 0, width, height);
        gif.addFrame(ctx, { copy: true, delay: this.frameDelay });

        const progress = ((index + 1) / this.frames.length) * 50;
        this.progressFill.style.width = `${progress}%`;
      });

      // Set loop count
      gif.setOption('repeat', this.loopCount);

      gif.on('progress', (p) => {
        const progress = 50 + p * 50;
        this.progressFill.style.width = `${progress}%`;
      });

      gif.on('finished', (blob) => {
        this.downloadGif(blob);
        this.progressBar.classList.remove('active');
        this.createBtn.disabled = false;
        this.showStatus('success', 'GIF 建立成功！');
      });

      gif.render();

    } catch (error) {
      console.error('GIF creation error:', error);
      this.showStatus('error', 'GIF 建立失敗：' + error.message);
      this.progressBar.classList.remove('active');
      this.createBtn.disabled = false;
    }
  }

  downloadGif(blob) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `animation_${Date.now()}.gif`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.stopPreview();
    this.frames = [];
    this.currentFrame = 0;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.createBtn.disabled = true;

    this.framesList.innerHTML = '';
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.frameDelaySlider.value = 200;
    this.frameDelayValue.textContent = '200 ms';
    this.frameDelay = 200;
    this.loopCountSelect.value = '0';
    this.loopCount = 0;
    this.outputSizeSelect.value = 'original';
    this.outputSize = 'original';

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
  new GifMaker();
});
