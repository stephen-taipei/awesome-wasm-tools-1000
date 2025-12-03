/**
 * IMG-097 GIF 速度調整
 * 調整 GIF 動畫的播放速度
 */

class GifSpeedAdjuster {
  constructor() {
    this.gifData = null;
    this.frames = [];
    this.speed = 1;
    this.originalDuration = 0;
    this.isPlaying = false;
    this.previewTimeout = null;
    this.currentFrame = 0;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.dimensions = document.getElementById('dimensions');
    this.frameCount = document.getElementById('frameCount');
    this.originalDurationEl = document.getElementById('originalDuration');
    this.newDuration = document.getElementById('newDuration');
    this.newDelay = document.getElementById('newDelay');

    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');

    this.playBtn = document.getElementById('playBtn');
    this.stopBtn = document.getElementById('stopBtn');

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

    // Speed slider
    this.speedSlider.addEventListener('input', () => {
      this.speed = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = `${this.speed.toFixed(1)}x`;
      this.updatePresets();
      this.updateComparison();

      if (this.isPlaying) {
        this.stopPreview();
        this.playPreview();
      }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.speed = parseFloat(btn.dataset.speed);
        this.speedSlider.value = this.speed;
        this.speedValue.textContent = `${this.speed.toFixed(1)}x`;
        this.updatePresets();
        this.updateComparison();

        if (this.isPlaying) {
          this.stopPreview();
          this.playPreview();
        }
      });
    });

    // Playback
    this.playBtn.addEventListener('click', () => this.playPreview());
    this.stopBtn.addEventListener('click', () => this.stopPreview());

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

      // Process frames
      await this.processFrames(frames);

      // Calculate original duration
      this.originalDuration = this.frames.reduce((sum, f) => sum + f.delay, 0);

      // Update UI
      this.dimensions.textContent = `${this.gifData.width} x ${this.gifData.height} px`;
      this.frameCount.textContent = `${this.frames.length} 幀`;
      this.originalDurationEl.textContent = `${(this.originalDuration / 1000).toFixed(2)} 秒`;

      // Show editor
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.processBtn.disabled = false;

      this.updateComparison();
      this.updatePreview();

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
        delay: frame.delay * 10,
        disposalType: frame.disposalType
      });

      if (frame.disposalType === 2) {
        compositeCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
      }
    }
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const presetSpeed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', Math.abs(presetSpeed - this.speed) < 0.05);
    });
  }

  updateComparison() {
    const newDurationMs = this.originalDuration / this.speed;
    this.newDuration.textContent = `${(newDurationMs / 1000).toFixed(2)} 秒`;

    const avgOriginalDelay = this.originalDuration / this.frames.length;
    const newAvgDelay = avgOriginalDelay / this.speed;
    this.newDelay.textContent = `${Math.round(newAvgDelay)} ms`;
  }

  updatePreview() {
    if (this.frames.length === 0) return;

    const frame = this.frames[this.currentFrame];
    this.previewCanvas.width = this.gifData.width;
    this.previewCanvas.height = this.gifData.height;
    this.previewCtx.drawImage(frame.canvas, 0, 0);
  }

  playPreview() {
    if (this.frames.length < 2) return;

    this.isPlaying = true;
    this.playBtn.classList.add('active');
    this.stopBtn.classList.remove('active');

    const playNext = () => {
      if (!this.isPlaying) return;

      this.updatePreview();

      const frame = this.frames[this.currentFrame];
      const adjustedDelay = Math.max(20, frame.delay / this.speed);

      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.previewTimeout = setTimeout(playNext, adjustedDelay);
    };

    playNext();
  }

  stopPreview() {
    this.isPlaying = false;
    this.playBtn.classList.remove('active');
    this.stopBtn.classList.add('active');

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
  }

  async processGif() {
    if (this.frames.length === 0) return;

    this.stopPreview();
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

      // Add frames with adjusted delay
      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        const adjustedDelay = Math.max(20, Math.round(frame.delay / this.speed));

        gif.addFrame(frame.canvas, { copy: true, delay: adjustedDelay });

        const progress = ((i + 1) / this.frames.length) * 50;
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
        this.showStatus('success', 'GIF 速度調整成功！');
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
    const speedText = this.speed === 1 ? '' : `_${this.speed}x`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}${speedText}.gif`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.stopPreview();
    this.gifData = null;
    this.frames = [];
    this.speed = 1;
    this.currentFrame = 0;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.processBtn.disabled = true;

    this.dimensions.textContent = '-';
    this.frameCount.textContent = '-';
    this.originalDurationEl.textContent = '-';
    this.newDuration.textContent = '-';
    this.newDelay.textContent = '-';

    this.speedSlider.value = 1;
    this.speedValue.textContent = '1.0x';
    this.updatePresets();

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
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
  new GifSpeedAdjuster();
});
