/**
 * IMG-100 APNG 製作
 * 製作 APNG 動畫圖片（支援透明背景）
 */

class ApngMaker {
  constructor() {
    this.frames = [];
    this.frameDelay = 100;
    this.loopCount = 0;
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

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.playBtn = document.getElementById('playBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.infoBadge = document.getElementById('infoBadge');

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

    // Preview controls
    this.playBtn.addEventListener('click', () => this.playPreview());
    this.stopBtn.addEventListener('click', () => this.stopPreview());

    // Buttons
    this.createBtn.addEventListener('click', () => this.createApng());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImages(files) {
    const pngFiles = files.filter(f => f.type === 'image/png');

    if (pngFiles.length === 0) {
      this.showStatus('error', '請選擇 PNG 格式圖片');
      return;
    }

    let loadedCount = 0;

    pngFiles.forEach((file, index) => {
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
          if (loadedCount === pngFiles.length) {
            this.updateUI();
            this.showStatus('success', `已載入 ${pngFiles.length} 張圖片`);
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

      // Update info badge
      const firstFrame = this.frames[0].image;
      this.infoBadge.textContent = `${this.frames.length} 幀 | ${firstFrame.width}x${firstFrame.height}`;
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

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
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

  async createApng() {
    if (this.frames.length < 2) {
      this.showStatus('error', '至少需要 2 張圖片');
      return;
    }

    this.stopPreview();
    this.createBtn.disabled = true;
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';

    try {
      // Get dimensions from first frame
      const firstImg = this.frames[0].image;
      const width = firstImg.width;
      const height = firstImg.height;

      // Convert all frames to RGBA data
      const framesData = [];
      const delays = [];

      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame.image, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        framesData.push(imageData.data.buffer);
        delays.push(this.frameDelay);

        const progress = ((i + 1) / this.frames.length) * 50;
        this.progressFill.style.width = `${progress}%`;
      }

      // Create APNG using UPNG.js
      this.progressFill.style.width = '60%';

      const apng = UPNG.encode(
        framesData,
        width,
        height,
        0, // color depth (0 = auto)
        delays,
        { loop: this.loopCount }
      );

      this.progressFill.style.width = '90%';

      // Download
      const blob = new Blob([apng], { type: 'image/png' });
      this.downloadApng(blob);

      this.progressFill.style.width = '100%';
      this.progressBar.classList.remove('active');
      this.createBtn.disabled = false;
      this.showStatus('success', 'APNG 建立成功！');

    } catch (error) {
      console.error('APNG creation error:', error);
      this.showStatus('error', 'APNG 建立失敗：' + error.message);
      this.progressBar.classList.remove('active');
      this.createBtn.disabled = false;
    }
  }

  downloadApng(blob) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `animation_${Date.now()}.png`;
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

    this.frameDelaySlider.value = 100;
    this.frameDelayValue.textContent = '100 ms';
    this.frameDelay = 100;
    this.loopCountSelect.value = '0';
    this.loopCount = 0;

    this.infoBadge.textContent = '0 幀 | 0x0';
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
  new ApngMaker();
});
