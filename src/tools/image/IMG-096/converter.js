/**
 * IMG-096 GIF 裁切
 * 裁切 GIF 動畫的時間長度
 */

class GifTrimmer {
  constructor() {
    this.gifData = null;
    this.frames = [];
    this.startFrame = 0;
    this.endFrame = 0;
    this.isPlaying = false;
    this.previewInterval = null;
    this.currentFrame = 0;
    this.useOriginalDelay = true;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorSection = document.getElementById('editorSection');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.framesStrip = document.getElementById('framesStrip');

    this.startRange = document.getElementById('startRange');
    this.endRange = document.getElementById('endRange');
    this.rangeFill = document.getElementById('rangeFill');
    this.startLabel = document.getElementById('startLabel');
    this.endLabel = document.getElementById('endLabel');

    this.dimensions = document.getElementById('dimensions');
    this.totalFrames = document.getElementById('totalFrames');
    this.originalDuration = document.getElementById('originalDuration');
    this.selectedRange = document.getElementById('selectedRange');
    this.newDuration = document.getElementById('newDuration');

    this.frameDelaySlider = document.getElementById('frameDelay');
    this.frameDelayValue = document.getElementById('frameDelayValue');
    this.loopCountSelect = document.getElementById('loopCount');

    this.playBtn = document.getElementById('playBtn');
    this.stopBtn = document.getElementById('stopBtn');

    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');

    this.trimBtn = document.getElementById('trimBtn');
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

    // Range sliders
    this.startRange.addEventListener('input', () => this.onRangeChange());
    this.endRange.addEventListener('input', () => this.onRangeChange());

    // Frame delay
    this.frameDelaySlider.addEventListener('input', () => {
      const value = parseInt(this.frameDelaySlider.value);
      if (value === 100) {
        this.useOriginalDelay = true;
        this.frameDelayValue.textContent = '原始';
      } else {
        this.useOriginalDelay = false;
        this.frameDelayValue.textContent = `${value}ms`;
      }
    });

    // Playback
    this.playBtn.addEventListener('click', () => this.playPreview());
    this.stopBtn.addEventListener('click', () => this.stopPreview());

    // Buttons
    this.trimBtn.addEventListener('click', () => this.trimGif());
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

      // Process frames with compositing
      await this.processFrames(frames, gif.lsd.width, gif.lsd.height);

      // Update UI
      this.dimensions.textContent = `${this.gifData.width} x ${this.gifData.height} px`;
      this.totalFrames.textContent = `${this.frames.length} 幀`;

      const totalDuration = this.frames.reduce((sum, f) => sum + f.delay, 0);
      this.originalDuration.textContent = `${(totalDuration / 1000).toFixed(2)} 秒`;

      // Initialize range
      this.startFrame = 0;
      this.endFrame = this.frames.length - 1;
      this.startRange.max = this.frames.length - 1;
      this.endRange.max = this.frames.length - 1;
      this.startRange.value = 0;
      this.endRange.value = this.frames.length - 1;

      // Show editor
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.trimBtn.disabled = false;

      // Render frames strip
      this.renderFramesStrip();
      this.updateRangeUI();
      this.updatePreview();

      this.showStatus('success', `成功解析 ${this.frames.length} 個影格`);

    } catch (error) {
      console.error('GIF parse error:', error);
      this.showStatus('error', 'GIF 解析失敗：' + error.message);
    }
  }

  async processFrames(rawFrames, width, height) {
    this.frames = [];

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const compositeCtx = compositeCanvas.getContext('2d');

    for (const frame of rawFrames) {
      // Create frame image data
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = frame.dims.width;
      frameCanvas.height = frame.dims.height;
      const frameCtx = frameCanvas.getContext('2d');

      const imageData = frameCtx.createImageData(frame.dims.width, frame.dims.height);
      imageData.data.set(frame.patch);
      frameCtx.putImageData(imageData, 0, 0);

      // Draw on composite
      compositeCtx.drawImage(frameCanvas, frame.dims.left, frame.dims.top);

      // Save composite state
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = width;
      displayCanvas.height = height;
      const displayCtx = displayCanvas.getContext('2d');
      displayCtx.drawImage(compositeCanvas, 0, 0);

      this.frames.push({
        canvas: displayCanvas,
        delay: frame.delay * 10, // Convert to ms
        disposalType: frame.disposalType
      });

      // Handle disposal
      if (frame.disposalType === 2) {
        compositeCtx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
      }
    }
  }

  renderFramesStrip() {
    this.framesStrip.innerHTML = '';

    this.frames.forEach((frame, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'frame-thumb';
      thumb.dataset.index = index;

      const img = document.createElement('img');
      img.src = frame.canvas.toDataURL('image/png');
      thumb.appendChild(img);

      thumb.addEventListener('click', () => {
        this.currentFrame = index;
        this.updatePreview();
      });

      this.framesStrip.appendChild(thumb);
    });

    this.updateFrameHighlights();
  }

  onRangeChange() {
    let start = parseInt(this.startRange.value);
    let end = parseInt(this.endRange.value);

    // Ensure start <= end
    if (start > end) {
      if (this.startRange === document.activeElement) {
        end = start;
        this.endRange.value = end;
      } else {
        start = end;
        this.startRange.value = start;
      }
    }

    this.startFrame = start;
    this.endFrame = end;

    this.updateRangeUI();
    this.updateFrameHighlights();

    // Update preview to current range
    if (this.currentFrame < this.startFrame || this.currentFrame > this.endFrame) {
      this.currentFrame = this.startFrame;
      this.updatePreview();
    }
  }

  updateRangeUI() {
    const total = this.frames.length - 1;
    const startPercent = (this.startFrame / total) * 100;
    const endPercent = (this.endFrame / total) * 100;

    this.rangeFill.style.left = `${startPercent}%`;
    this.rangeFill.style.width = `${endPercent - startPercent}%`;

    this.startLabel.textContent = `開始: 幀 ${this.startFrame + 1}`;
    this.endLabel.textContent = `結束: 幀 ${this.endFrame + 1}`;

    const count = this.endFrame - this.startFrame + 1;
    this.selectedRange.textContent = `幀 ${this.startFrame + 1} - ${this.endFrame + 1} (共 ${count} 幀)`;

    // Calculate new duration
    let duration = 0;
    for (let i = this.startFrame; i <= this.endFrame; i++) {
      duration += this.frames[i].delay;
    }
    this.newDuration.textContent = `${(duration / 1000).toFixed(2)} 秒`;
  }

  updateFrameHighlights() {
    document.querySelectorAll('.frame-thumb').forEach((thumb, index) => {
      thumb.classList.toggle('in-range', index >= this.startFrame && index <= this.endFrame);
      thumb.classList.toggle('selected', index === this.currentFrame);
    });
  }

  updatePreview() {
    if (this.frames.length === 0) return;

    const frame = this.frames[this.currentFrame];
    this.previewCanvas.width = this.gifData.width;
    this.previewCanvas.height = this.gifData.height;
    this.previewCtx.drawImage(frame.canvas, 0, 0);

    this.updateFrameHighlights();
  }

  playPreview() {
    if (this.frames.length < 2) return;

    this.isPlaying = true;
    this.playBtn.classList.add('active');
    this.stopBtn.classList.remove('active');
    this.currentFrame = this.startFrame;

    const playNext = () => {
      if (!this.isPlaying) return;

      this.updatePreview();

      const frame = this.frames[this.currentFrame];
      const delay = this.useOriginalDelay ? frame.delay : parseInt(this.frameDelaySlider.value);

      this.currentFrame++;
      if (this.currentFrame > this.endFrame) {
        this.currentFrame = this.startFrame;
      }

      this.previewInterval = setTimeout(playNext, delay);
    };

    playNext();
  }

  stopPreview() {
    this.isPlaying = false;
    this.playBtn.classList.remove('active');
    this.stopBtn.classList.add('active');

    if (this.previewInterval) {
      clearTimeout(this.previewInterval);
      this.previewInterval = null;
    }
  }

  async trimGif() {
    if (this.frames.length === 0) return;

    this.stopPreview();
    this.trimBtn.disabled = true;
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: this.gifData.width,
        height: this.gifData.height,
        workerScript: '/vendor/gif/gif.worker.js'
      });

      // Add selected frames
      const frameCount = this.endFrame - this.startFrame + 1;
      for (let i = this.startFrame; i <= this.endFrame; i++) {
        const frame = this.frames[i];
        const delay = this.useOriginalDelay ? frame.delay : parseInt(this.frameDelaySlider.value);

        gif.addFrame(frame.canvas, { copy: true, delay: delay });

        const progress = ((i - this.startFrame + 1) / frameCount) * 50;
        this.progressFill.style.width = `${progress}%`;
      }

      // Set loop count
      gif.setOption('repeat', parseInt(this.loopCountSelect.value));

      gif.on('progress', (p) => {
        const progress = 50 + p * 50;
        this.progressFill.style.width = `${progress}%`;
      });

      gif.on('finished', (blob) => {
        this.downloadGif(blob);
        this.progressBar.classList.remove('active');
        this.trimBtn.disabled = false;
        this.showStatus('success', 'GIF 裁切成功！');
      });

      gif.render();

    } catch (error) {
      console.error('Trim error:', error);
      this.showStatus('error', '裁切失敗：' + error.message);
      this.progressBar.classList.remove('active');
      this.trimBtn.disabled = false;
    }
  }

  downloadGif(blob) {
    const baseName = this.gifData.name.replace(/\.gif$/i, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}_trimmed.gif`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.stopPreview();
    this.gifData = null;
    this.frames = [];
    this.startFrame = 0;
    this.endFrame = 0;
    this.currentFrame = 0;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.trimBtn.disabled = true;

    this.framesStrip.innerHTML = '';
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.dimensions.textContent = '-';
    this.totalFrames.textContent = '-';
    this.originalDuration.textContent = '-';
    this.selectedRange.textContent = '幀 1 - 1 (共 0 幀)';
    this.newDuration.textContent = '0 秒';

    this.frameDelaySlider.value = 100;
    this.frameDelayValue.textContent = '原始';
    this.useOriginalDelay = true;
    this.loopCountSelect.value = '0';

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
  new GifTrimmer();
});
