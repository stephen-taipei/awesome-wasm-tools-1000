/**
 * IMG-099 GIF 壓縮
 * 壓縮 GIF 檔案大小
 */

class GifCompressor {
  constructor() {
    this.gifData = null;
    this.frames = [];
    this.originalSize = 0;
    this.settings = {
      colorCount: 128,
      scale: 1,
      frameSkip: 1,
      quality: 10,
      dither: true
    };
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

    this.originalSizeEl = document.getElementById('originalSize');
    this.estimatedSizeEl = document.getElementById('estimatedSize');
    this.reductionBadge = document.getElementById('reductionBadge');

    this.colorCountSlider = document.getElementById('colorCount');
    this.colorCountValue = document.getElementById('colorCountValue');
    this.scaleSelect = document.getElementById('scaleSelect');
    this.frameSkipSelect = document.getElementById('frameSkip');
    this.qualitySlider = document.getElementById('quality');
    this.qualityValue = document.getElementById('qualityValue');
    this.ditherCheckbox = document.getElementById('dither');

    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');

    this.compressBtn = document.getElementById('compressBtn');
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Settings
    this.colorCountSlider.addEventListener('input', () => {
      this.settings.colorCount = parseInt(this.colorCountSlider.value);
      this.colorCountValue.textContent = this.settings.colorCount;
      this.updateEstimate();
    });

    this.scaleSelect.addEventListener('change', () => {
      this.settings.scale = parseFloat(this.scaleSelect.value);
      this.updateEstimate();
    });

    this.frameSkipSelect.addEventListener('change', () => {
      this.settings.frameSkip = parseInt(this.frameSkipSelect.value);
      this.updateEstimate();
    });

    this.qualitySlider.addEventListener('input', () => {
      this.settings.quality = parseInt(this.qualitySlider.value);
      this.qualityValue.textContent = this.settings.quality;
      this.updateEstimate();
    });

    this.ditherCheckbox.addEventListener('change', () => {
      this.settings.dither = this.ditherCheckbox.checked;
    });

    // Buttons
    this.compressBtn.addEventListener('click', () => this.compressGif());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'light':
        this.settings = { colorCount: 256, scale: 1, frameSkip: 1, quality: 5, dither: true };
        break;
      case 'medium':
        this.settings = { colorCount: 128, scale: 1, frameSkip: 1, quality: 10, dither: true };
        break;
      case 'heavy':
        this.settings = { colorCount: 64, scale: 0.75, frameSkip: 2, quality: 15, dither: true };
        break;
    }

    this.colorCountSlider.value = this.settings.colorCount;
    this.colorCountValue.textContent = this.settings.colorCount;
    this.scaleSelect.value = this.settings.scale;
    this.frameSkipSelect.value = this.settings.frameSkip;
    this.qualitySlider.value = this.settings.quality;
    this.qualityValue.textContent = this.settings.quality;
    this.ditherCheckbox.checked = this.settings.dither;

    this.updateEstimate();
  }

  async loadGif(file) {
    if (!file.type.match(/^image\/gif$/)) {
      this.showStatus('error', '請選擇 GIF 格式檔案');
      return;
    }

    this.showStatus('success', '正在解析 GIF...');
    this.fileName = file.name;
    this.originalSize = file.size;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const gif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      this.gifData = {
        width: gif.lsd.width,
        height: gif.lsd.height
      };

      await this.processFrames(frames);

      // Update UI
      this.originalSizeEl.textContent = this.formatSize(this.originalSize);

      // Show editor
      this.uploadArea.style.display = 'none';
      this.editorSection.classList.add('active');
      this.compressBtn.disabled = false;

      this.previewCanvas.width = this.gifData.width;
      this.previewCanvas.height = this.gifData.height;

      this.updateEstimate();
      this.startPreview();

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

  updateEstimate() {
    // Rough estimation based on settings
    const colorFactor = this.settings.colorCount / 256;
    const scaleFactor = this.settings.scale * this.settings.scale;
    const frameFactor = 1 / this.settings.frameSkip;
    const qualityFactor = 1 - (this.settings.quality - 1) / 40;

    const estimate = this.originalSize * colorFactor * scaleFactor * frameFactor * qualityFactor;
    const reduction = Math.round((1 - estimate / this.originalSize) * 100);

    this.estimatedSizeEl.textContent = `~${this.formatSize(estimate)}`;
    this.reductionBadge.textContent = `減少 ~${Math.max(0, reduction)}%`;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  startPreview() {
    this.isPlaying = true;

    const playNext = () => {
      if (!this.isPlaying || this.frames.length === 0) return;

      const frame = this.frames[this.currentFrame];
      this.previewCtx.drawImage(frame.canvas, 0, 0);

      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.previewTimeout = setTimeout(playNext, frame.delay);
    };

    playNext();
  }

  stopPreview() {
    this.isPlaying = false;
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
  }

  async compressGif() {
    if (this.frames.length === 0) return;

    this.stopPreview();
    this.compressBtn.disabled = true;
    this.progressBar.classList.add('active');
    this.progressFill.style.width = '0%';

    try {
      const newWidth = Math.round(this.gifData.width * this.settings.scale);
      const newHeight = Math.round(this.gifData.height * this.settings.scale);

      const gif = new GIF({
        workers: 2,
        quality: this.settings.quality,
        width: newWidth,
        height: newHeight,
        dither: this.settings.dither,
        workerScript: '/vendor/gif/gif.worker.js'
      });

      // Filter frames based on frameSkip
      const filteredFrames = this.frames.filter((_, i) => i % this.settings.frameSkip === 0);

      // Create scaled canvas
      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = newWidth;
      scaleCanvas.height = newHeight;
      const scaleCtx = scaleCanvas.getContext('2d');

      for (let i = 0; i < filteredFrames.length; i++) {
        const frame = filteredFrames[i];

        // Scale frame
        scaleCtx.clearRect(0, 0, newWidth, newHeight);
        scaleCtx.drawImage(frame.canvas, 0, 0, newWidth, newHeight);

        // Adjust delay for skipped frames
        const adjustedDelay = frame.delay * this.settings.frameSkip;

        gif.addFrame(scaleCtx, { copy: true, delay: adjustedDelay });

        const progress = ((i + 1) / filteredFrames.length) * 50;
        this.progressFill.style.width = `${progress}%`;
      }

      gif.on('progress', (p) => {
        const progress = 50 + p * 50;
        this.progressFill.style.width = `${progress}%`;
      });

      gif.on('finished', (blob) => {
        const reduction = Math.round((1 - blob.size / this.originalSize) * 100);
        this.downloadGif(blob);
        this.progressBar.classList.remove('active');
        this.compressBtn.disabled = false;
        this.showStatus('success', `壓縮完成！減少 ${reduction}%`);
        this.startPreview();
      });

      gif.render();

    } catch (error) {
      console.error('Compress error:', error);
      this.showStatus('error', '壓縮失敗：' + error.message);
      this.progressBar.classList.remove('active');
      this.compressBtn.disabled = false;
      this.startPreview();
    }
  }

  downloadGif(blob) {
    const baseName = this.fileName.replace(/\.gif$/i, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${baseName}_compressed.gif`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.stopPreview();
    this.gifData = null;
    this.frames = [];
    this.originalSize = 0;
    this.currentFrame = 0;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.editorSection.classList.remove('active');
    this.compressBtn.disabled = true;

    this.originalSizeEl.textContent = '-';
    this.estimatedSizeEl.textContent = '-';
    this.reductionBadge.textContent = '減少 0%';

    // Reset to medium preset
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-preset="medium"]').classList.add('active');
    this.applyPreset('medium');

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
  new GifCompressor();
});
