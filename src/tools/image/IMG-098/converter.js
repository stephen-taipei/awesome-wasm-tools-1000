/**
 * IMG-098 GIF 反轉播放
 * 將 GIF 動畫反向播放
 */

class GifReverser {
  constructor() {
    this.gifData = null;
    this.frames = [];
    this.mode = 'reverse';
    this.isPlayingOriginal = false;
    this.isPlayingReversed = false;
    this.originalTimeout = null;
    this.reversedTimeout = null;
    this.originalFrame = 0;
    this.reversedFrame = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.reversedCanvas = document.getElementById('reversedCanvas');
    this.reversedCtx = this.reversedCanvas.getContext('2d');

    this.playOriginalBtn = document.getElementById('playOriginalBtn');
    this.stopOriginalBtn = document.getElementById('stopOriginalBtn');
    this.playReversedBtn = document.getElementById('playReversedBtn');
    this.stopReversedBtn = document.getElementById('stopReversedBtn');

    this.dimensions = document.getElementById('dimensions');
    this.frameCount = document.getElementById('frameCount');
    this.originalDuration = document.getElementById('originalDuration');
    this.outputFrames = document.getElementById('outputFrames');

    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');

    this.processBtn = document.getElementById('processBtn');
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

    // Mode selection
    document.querySelectorAll('.option-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.mode = card.dataset.mode;
        this.updateOutputInfo();
      });
    });

    // Playback controls
    this.playOriginalBtn.addEventListener('click', () => this.playOriginal());
    this.stopOriginalBtn.addEventListener('click', () => this.stopOriginal());
    this.playReversedBtn.addEventListener('click', () => this.playReversed());
    this.stopReversedBtn.addEventListener('click', () => this.stopReversed());

    // Buttons
    this.processBtn.addEventListener('click', () => this.processGif());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  async loadGif(file) {
    if (!file.type.match(/^image\/gif$/)) {
      this.showStatus('error', '請選擇 GIF 格式檔案');
      return;
    }

    this.showStatus('success', '正在解析 GIF...');
    this.fileName = file.name;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      this.gifData = {
        width: gif.lsd.width,
        height: gif.lsd.height
      };

      await this.processFrames(frames);

      // Update info
      const totalDuration = this.frames.reduce((sum, f) => sum + f.delay, 0);
      this.dimensions.textContent = `${this.gifData.width}x${this.gifData.height}`;
      this.frameCount.textContent = `${this.frames.length}`;
      this.originalDuration.textContent = `${(totalDuration / 1000).toFixed(2)}s`;
      this.updateOutputInfo();

      // Show editor
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.processBtn.disabled = false;

      // Setup canvases
      this.originalCanvas.width = this.gifData.width;
      this.originalCanvas.height = this.gifData.height;
      this.reversedCanvas.width = this.gifData.width;
      this.reversedCanvas.height = this.gifData.height;

      this.updateOriginalPreview();
      this.updateReversedPreview();

      this.showStatus('success', `成功解析 ${this.frames.length} 個影格`);

    } catch (error) {
      console.error('GIF parse error:', error);
      this.showStatus('error', 'GIF 解析失敗：' + error.message);
    }
  }

  async processFrames(rawFrames) {
    this.frames = [];

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = this.gifData.width;
    compositeCanvas.height = this.gifData.height;
    const compositeCtx = compositeCanvas.getContext('2d');

    for (const frame of rawFrames) {
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = frame.dims.width;
      frameCanvas.height = frame.dims.height;
      const frameCtx = frameCanvas.getContext('2d');

      const imageData = frameCtx.createImageData(frame.dims.width, frame.dims.height);
      imageData.data.set(frame.patch);
      frameCtx.putImageData(imageData, 0, 0);

      compositeCtx.drawImage(frameCanvas, frame.dims.left, frame.dims.top);

      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = this.gifData.width;
      displayCanvas.height = this.gifData.height;
      const displayCtx = displayCanvas.getContext('2d');
      displayCtx.drawImage(compositeCanvas, 0, 0);

      this.frames.push({
        canvas: displayCanvas,
        delay: frame.delay * 10
      });

      if (frame.disposalType === 2) {
        compositeCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
      }
    }
  }

  updateOutputInfo() {
    let outputCount = this.frames.length;
    if (this.mode === 'boomerang' || this.mode === 'pingpong') {
      outputCount = this.frames.length * 2 - 2;
    }
    this.outputFrames.textContent = `${outputCount}`;
  }

  getReversedFrames() {
    const reversed = [...this.frames].reverse();

    if (this.mode === 'reverse') {
      return reversed;
    } else if (this.mode === 'boomerang') {
      // Forward then backward (exclude first and last to avoid duplicate)
      return [...this.frames, ...reversed.slice(1, -1)];
    } else if (this.mode === 'pingpong') {
      // Backward then forward
      return [...reversed, ...this.frames.slice(1, -1)];
    }

    return reversed;
  }

  updateOriginalPreview() {
    if (this.frames.length === 0) return;
    const frame = this.frames[this.originalFrame % this.frames.length];
    this.originalCtx.drawImage(frame.canvas, 0, 0);
  }

  updateReversedPreview() {
    if (this.frames.length === 0) return;
    const reversedFrames = this.getReversedFrames();
    const frame = reversedFrames[this.reversedFrame % reversedFrames.length];
    this.reversedCtx.drawImage(frame.canvas, 0, 0);
  }

  playOriginal() {
    if (this.frames.length < 2) return;

    this.isPlayingOriginal = true;
    this.playOriginalBtn.classList.add('active');
    this.stopOriginalBtn.classList.remove('active');

    const playNext = () => {
      if (!this.isPlayingOriginal) return;

      this.updateOriginalPreview();
      const frame = this.frames[this.originalFrame % this.frames.length];

      this.originalFrame = (this.originalFrame + 1) % this.frames.length;
      this.originalTimeout = setTimeout(playNext, frame.delay);
    };

    playNext();
  }

  stopOriginal() {
    this.isPlayingOriginal = false;
    this.playOriginalBtn.classList.remove('active');
    this.stopOriginalBtn.classList.add('active');

    if (this.originalTimeout) {
      clearTimeout(this.originalTimeout);
      this.originalTimeout = null;
    }
  }

  playReversed() {
    if (this.frames.length < 2) return;

    this.isPlayingReversed = true;
    this.playReversedBtn.classList.add('active');
    this.stopReversedBtn.classList.remove('active');

    const reversedFrames = this.getReversedFrames();

    const playNext = () => {
      if (!this.isPlayingReversed) return;

      this.updateReversedPreview();
      const frame = reversedFrames[this.reversedFrame % reversedFrames.length];

      this.reversedFrame = (this.reversedFrame + 1) % reversedFrames.length;
      this.reversedTimeout = setTimeout(playNext, frame.delay);
    };

    playNext();
  }

  stopReversed() {
    this.isPlayingReversed = false;
    this.playReversedBtn.classList.remove('active');
    this.stopReversedBtn.classList.add('active');

    if (this.reversedTimeout) {
      clearTimeout(this.reversedTimeout);
      this.reversedTimeout = null;
    }
  }

  async processGif() {
    if (this.frames.length === 0) return;

    this.stopOriginal();
    this.stopReversed();
    this.processBtn.disabled = true;
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: this.gifData.width,
        height: this.gifData.height,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
      });

      const outputFrames = this.getReversedFrames();

      for (let i = 0; i < outputFrames.length; i++) {
        const frame = outputFrames[i];
        gif.addFrame(frame.canvas, { copy: true, delay: frame.delay });

        const progress = ((i + 1) / outputFrames.length) * 50;
        this.progressFill.style.width = `${progress}%`;
      }

      gif.on('progress', (p) => {
        const progress = 50 + p * 50;
        this.progressFill.style.width = `${progress}%`;
      });

      gif.on('finished', (blob) => {
        this.downloadGif(blob);
        this.progressBar.classList.remove('active');
        this.processBtn.disabled = false;
        this.showStatus('success', 'GIF 反轉成功！');
      });

      gif.render();

    } catch (error) {
      console.error('Process error:', error);
      this.showStatus('error', '處理失敗：' + error.message);
      this.progressBar.classList.remove('active');
      this.processBtn.disabled = false;
    }
  }

  downloadGif(blob) {
    const baseName = this.fileName.replace(/\.gif$/i, '');
    const modeText = this.mode === 'reverse' ? '_reversed' :
                     this.mode === 'boomerang' ? '_boomerang' : '_pingpong';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}${modeText}.gif`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.stopOriginal();
    this.stopReversed();
    this.gifData = null;
    this.frames = [];
    this.originalFrame = 0;
    this.reversedFrame = 0;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.processBtn.disabled = true;

    this.dimensions.textContent = '-';
    this.frameCount.textContent = '-';
    this.originalDuration.textContent = '-';
    this.outputFrames.textContent = '-';

    // Reset mode selection
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    document.querySelector('[data-mode="reverse"]').classList.add('selected');
    this.mode = 'reverse';

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.reversedCtx.clearRect(0, 0, this.reversedCanvas.width, this.reversedCanvas.height);

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
  new GifReverser();
});
