/**
 * IMG-131 圖片景深模擬
 * 模擬淺景深散景效果
 */

class DepthOfFieldSimulator {
  constructor() {
    this.originalImage = null;
    this.imageData = null;
    this.focusPoint = { x: 0.5, y: 0.5 }; // Normalized coordinates
    this.settings = {
      mode: 'circular',
      blurStrength: 20,
      focusRange: 30,
      gradient: 50,
      highlightBoost: 20
    };
    this.isProcessing = false;
    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.originalImageEl = document.getElementById('originalImage');
    this.originalArea = document.getElementById('originalArea');
    this.focusPointEl = document.getElementById('focusPoint');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Info elements
    this.imageSizeEl = document.getElementById('imageSize');
    this.focusPositionEl = document.getElementById('focusPosition');
    this.bokehModeEl = document.getElementById('bokehMode');
    this.processTimeEl = document.getElementById('processTime');

    // Sliders
    this.blurStrengthSlider = document.getElementById('blurStrength');
    this.focusRangeSlider = document.getElementById('focusRange');
    this.gradientSlider = document.getElementById('gradient');
    this.highlightBoostSlider = document.getElementById('highlightBoost');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });

    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });

    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadImage(file);
      }
    });

    // Focus point selection
    this.originalArea.addEventListener('click', (e) => this.handleFocusClick(e));

    // Mode selection
    document.querySelectorAll('.mode-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.mode-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.settings.mode = item.dataset.mode;
        this.updateModeDisplay();
      });
    });

    // Sliders
    this.blurStrengthSlider.addEventListener('input', (e) => {
      this.settings.blurStrength = parseInt(e.target.value);
      document.getElementById('blurStrengthValue').textContent = e.target.value;
    });

    this.focusRangeSlider.addEventListener('input', (e) => {
      this.settings.focusRange = parseInt(e.target.value);
      document.getElementById('focusRangeValue').textContent = e.target.value + '%';
    });

    this.gradientSlider.addEventListener('input', (e) => {
      this.settings.gradient = parseInt(e.target.value);
      document.getElementById('gradientValue').textContent = e.target.value + '%';
    });

    this.highlightBoostSlider.addEventListener('input', (e) => {
      this.settings.highlightBoost = parseInt(e.target.value);
      document.getElementById('highlightBoostValue').textContent = e.target.value + '%';
    });

    // Buttons
    this.applyBtn.addEventListener('click', () => this.applyDepthOfField());
    this.downloadBtn.addEventListener('click', () => this.downloadResult());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.applyBtn.disabled = false;

        // Reset focus point to center
        this.focusPoint = { x: 0.5, y: 0.5 };
        this.updateFocusPointDisplay();

        // Update info
        this.imageSizeEl.textContent = `${img.width} x ${img.height}`;
        this.updateModeDisplay();

        this.showStatus('', '');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  handleFocusClick(e) {
    if (!this.originalImage) return;

    const rect = this.originalImageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    this.focusPoint = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    this.updateFocusPointDisplay();
  }

  updateFocusPointDisplay() {
    const rect = this.originalImageEl.getBoundingClientRect();
    const areaRect = this.originalArea.getBoundingClientRect();

    const offsetX = rect.left - areaRect.left;
    const offsetY = rect.top - areaRect.top;

    this.focusPointEl.style.display = 'block';
    this.focusPointEl.style.left = (offsetX + this.focusPoint.x * rect.width) + 'px';
    this.focusPointEl.style.top = (offsetY + this.focusPoint.y * rect.height) + 'px';

    const px = Math.round(this.focusPoint.x * 100);
    const py = Math.round(this.focusPoint.y * 100);
    this.focusPositionEl.textContent = `${px}%, ${py}%`;
  }

  updateModeDisplay() {
    const modeNames = {
      'circular': '圓形散景',
      'hexagon': '六角散景',
      'star': '星芒散景',
      'tilt': '移軸效果'
    };
    this.bokehModeEl.textContent = modeNames[this.settings.mode] || '圓形散景';
  }

  async applyDepthOfField() {
    if (!this.originalImage || this.isProcessing) return;

    this.isProcessing = true;
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.progressSection.classList.add('active');

    const startTime = performance.now();

    try {
      const { width, height } = this.originalImage;
      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      // Draw original image
      this.ctx.drawImage(this.originalImage, 0, 0);
      const imageData = this.ctx.getImageData(0, 0, width, height);

      this.updateProgress(10, '建立深度圖...');
      await this.sleep(10);

      // Create depth map based on focus point
      const depthMap = this.createDepthMap(width, height);

      this.updateProgress(30, '計算模糊核心...');
      await this.sleep(10);

      // Apply blur based on depth
      const result = await this.applyVariableBlur(imageData, depthMap, width, height);

      this.updateProgress(90, '套用高光效果...');
      await this.sleep(10);

      // Apply highlight boost for bokeh
      this.applyHighlightBoost(result, depthMap, width, height);

      this.ctx.putImageData(result, 0, 0);

      this.updateProgress(100, '完成！');

      const endTime = performance.now();
      this.processTimeEl.textContent = ((endTime - startTime) / 1000).toFixed(2) + 's';

      this.downloadBtn.disabled = false;
      this.showStatus('景深效果已套用成功！', 'success');

    } catch (error) {
      console.error('Processing error:', error);
      this.showStatus('處理時發生錯誤：' + error.message, 'error');
    } finally {
      this.isProcessing = false;
      this.applyBtn.disabled = false;
      setTimeout(() => {
        this.progressSection.classList.remove('active');
      }, 1000);
    }
  }

  createDepthMap(width, height) {
    const depthMap = new Float32Array(width * height);
    const focusX = this.focusPoint.x * width;
    const focusY = this.focusPoint.y * height;
    const focusRadius = (this.settings.focusRange / 100) * Math.max(width, height) / 2;
    const gradientWidth = (this.settings.gradient / 100) * Math.max(width, height) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let distance;

        if (this.settings.mode === 'tilt') {
          // Tilt-shift: horizontal band in focus
          distance = Math.abs(y - focusY);
        } else {
          // Circular/radial focus
          const dx = x - focusX;
          const dy = y - focusY;
          distance = Math.sqrt(dx * dx + dy * dy);
        }

        // Calculate depth value (0 = in focus, 1 = max blur)
        let depth;
        if (distance < focusRadius) {
          depth = 0;
        } else {
          depth = Math.min(1, (distance - focusRadius) / gradientWidth);
        }

        // Apply easing for smoother transition
        depth = this.easeInOutQuad(depth);

        depthMap[y * width + x] = depth;
      }
    }

    return depthMap;
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  async applyVariableBlur(imageData, depthMap, width, height) {
    const src = imageData.data;
    const result = new ImageData(width, height);
    const dst = result.data;

    // Copy original
    dst.set(src);

    const maxRadius = this.settings.blurStrength;
    const totalPixels = width * height;
    let lastProgress = 30;

    // Process in chunks for progress updates
    const chunkSize = Math.ceil(height / 10);

    for (let startY = 0; startY < height; startY += chunkSize) {
      const endY = Math.min(startY + chunkSize, height);

      for (let y = startY; y < endY; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const depth = depthMap[idx];

          if (depth > 0.01) {
            const radius = Math.round(depth * maxRadius);
            if (radius > 0) {
              const blurred = this.applyBokehBlur(src, x, y, width, height, radius);
              const pixelIdx = idx * 4;

              // Blend based on depth
              dst[pixelIdx] = src[pixelIdx] * (1 - depth) + blurred[0] * depth;
              dst[pixelIdx + 1] = src[pixelIdx + 1] * (1 - depth) + blurred[1] * depth;
              dst[pixelIdx + 2] = src[pixelIdx + 2] * (1 - depth) + blurred[2] * depth;
              dst[pixelIdx + 3] = 255;
            }
          }
        }
      }

      const progress = 30 + Math.round((endY / height) * 55);
      if (progress > lastProgress) {
        this.updateProgress(progress, `處理中... ${Math.round((endY / height) * 100)}%`);
        lastProgress = progress;
        await this.sleep(1);
      }
    }

    return result;
  }

  applyBokehBlur(src, cx, cy, width, height, radius) {
    let r = 0, g = 0, b = 0, count = 0;

    const mode = this.settings.mode;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Check if pixel is within bokeh shape
        if (!this.isInBokehShape(dx, dy, radius, mode)) continue;

        const idx = (y * width + x) * 4;
        r += src[idx];
        g += src[idx + 1];
        b += src[idx + 2];
        count++;
      }
    }

    if (count === 0) return [0, 0, 0];

    return [r / count, g / count, b / count];
  }

  isInBokehShape(dx, dy, radius, mode) {
    const dist = Math.sqrt(dx * dx + dy * dy);

    switch (mode) {
      case 'circular':
        return dist <= radius;

      case 'hexagon': {
        // Hexagonal shape
        const angle = Math.atan2(dy, dx);
        const hexRadius = radius * (1 / Math.cos((angle % (Math.PI / 3)) - Math.PI / 6));
        return dist <= Math.abs(hexRadius);
      }

      case 'star': {
        // Star shape with 6 points
        const angle = Math.atan2(dy, dx);
        const normalizedAngle = ((angle % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
        const starRadius = radius * (0.5 + 0.5 * Math.cos(normalizedAngle * 6));
        return dist <= starRadius;
      }

      case 'tilt':
        // For tilt-shift, use circular blur
        return dist <= radius;

      default:
        return dist <= radius;
    }
  }

  applyHighlightBoost(imageData, depthMap, width, height) {
    if (this.settings.highlightBoost === 0) return;

    const data = imageData.data;
    const boostFactor = this.settings.highlightBoost / 100;
    const threshold = 200;

    for (let i = 0; i < width * height; i++) {
      const depth = depthMap[i];
      if (depth < 0.1) continue; // Skip in-focus areas

      const idx = i * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness > threshold) {
        const boost = 1 + boostFactor * depth * ((brightness - threshold) / (255 - threshold));
        data[idx] = Math.min(255, data[idx] * boost);
        data[idx + 1] = Math.min(255, data[idx + 1] * boost);
        data[idx + 2] = Math.min(255, data[idx + 2] * boost);
      }
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = percent + '%';
    this.progressText.textContent = text;
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = 'status-message' + (type ? ' ' + type : '');
  }

  downloadResult() {
    const link = document.createElement('a');
    link.download = 'dof_result.png';
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.focusPoint = { x: 0.5, y: 0.5 };
    this.originalImageEl.src = '';
    this.focusPointEl.style.display = 'none';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.progressSection.classList.remove('active');
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // Reset info
    this.imageSizeEl.textContent = '-';
    this.focusPositionEl.textContent = '中心';
    this.processTimeEl.textContent = '-';

    this.showStatus('', '');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DepthOfFieldSimulator();
});
