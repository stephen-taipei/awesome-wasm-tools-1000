/**
 * IMG-128 圖片鏡頭畸變校正
 * 修正桶形、枕形畸變與透視變形
 */

class DistortionCorrector {
  constructor() {
    this.originalImage = null;
    this.currentMode = 'barrel';
    this.settings = {
      k1: 0,
      k2: 0,
      perspectiveX: 0,
      perspectiveY: 0
    };
    this.showGrid = true;
    this.autoCrop = true;
    this.livePreview = true;
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.originalImg = document.getElementById('originalImage');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.gridOriginal = document.getElementById('gridOriginal');
    this.gridResult = document.getElementById('gridResult');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.applyBtn = document.getElementById('applyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.modeItems = document.querySelectorAll('.mode-item');
  }

  bindEvents() {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.modeItems.forEach(item => {
      item.addEventListener('click', () => this.selectMode(item));
    });

    // Sliders
    ['k1', 'k2', 'perspectiveX', 'perspectiveY'].forEach(id => {
      const slider = document.getElementById(id);
      slider.addEventListener('input', () => {
        this.settings[id] = parseFloat(slider.value);
        this.updateSliderDisplay(id);
        if (this.livePreview && this.originalImage) {
          this.apply();
        }
      });
    });

    // Checkboxes
    document.getElementById('showGrid').addEventListener('change', (e) => {
      this.showGrid = e.target.checked;
      this.updateGridVisibility();
    });

    document.getElementById('autoCrop').addEventListener('change', (e) => {
      this.autoCrop = e.target.checked;
      if (this.originalImage) this.apply();
    });

    document.getElementById('livePreview').addEventListener('change', (e) => {
      this.livePreview = e.target.checked;
    });

    this.applyBtn.addEventListener('click', () => this.apply());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave() {
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      this.loadImage(file);
    }
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
        this.originalImg.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.applyBtn.disabled = false;

        document.getElementById('originalSize').textContent =
          `${img.width} × ${img.height}`;

        // Setup grid overlays
        this.setupGridOverlays();

        // Initial apply
        this.apply();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  selectMode(item) {
    this.modeItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    this.currentMode = item.dataset.mode;

    // Set default values based on mode
    switch (this.currentMode) {
      case 'barrel':
        this.settings.k1 = 20;
        this.settings.k2 = 0;
        break;
      case 'pincushion':
        this.settings.k1 = -20;
        this.settings.k2 = 0;
        break;
      case 'perspective':
        this.settings.k1 = 0;
        this.settings.k2 = 0;
        break;
    }

    // Update sliders
    document.getElementById('k1').value = this.settings.k1;
    document.getElementById('k2').value = this.settings.k2;
    this.updateSliderDisplay('k1');
    this.updateSliderDisplay('k2');

    if (this.livePreview && this.originalImage) {
      this.apply();
    }
  }

  updateSliderDisplay(id) {
    const value = this.settings[id];
    const valueEl = document.getElementById(`${id}Value`);

    if (id === 'perspectiveX' || id === 'perspectiveY') {
      valueEl.textContent = `${value}°`;
    } else {
      valueEl.textContent = (value / 100).toFixed(2);
    }
  }

  setupGridOverlays() {
    const img = this.originalImg;
    const rect = img.getBoundingClientRect();

    // Wait for image to be rendered
    setTimeout(() => {
      this.drawGrid(this.gridOriginal, this.originalImg);
      this.updateGridVisibility();
    }, 100);
  }

  drawGrid(canvas, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const parent = targetElement.parentElement;
    const parentRect = parent.getBoundingClientRect();

    canvas.width = parentRect.width - 20;
    canvas.height = parentRect.height - 20;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.showGrid) return;

    const imgRect = targetElement.getBoundingClientRect();
    const offsetX = imgRect.left - parentRect.left - 10;
    const offsetY = imgRect.top - parentRect.top - 10;
    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;

    ctx.strokeStyle = 'rgba(102, 126, 234, 0.5)';
    ctx.lineWidth = 1;

    // Vertical lines
    const cols = 8;
    for (let i = 0; i <= cols; i++) {
      const x = offsetX + (imgWidth / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + imgHeight);
      ctx.stroke();
    }

    // Horizontal lines
    const rows = 6;
    for (let i = 0; i <= rows; i++) {
      const y = offsetY + (imgHeight / rows) * i;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + imgWidth, y);
      ctx.stroke();
    }
  }

  updateGridVisibility() {
    if (this.showGrid) {
      this.gridOriginal.style.display = 'block';
      this.gridResult.style.display = 'block';
      this.drawGrid(this.gridOriginal, this.originalImg);
      this.drawGrid(this.gridResult, this.resultCanvas);
    } else {
      this.gridOriginal.style.display = 'none';
      this.gridResult.style.display = 'none';
    }
  }

  async apply() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    this.applyBtn.disabled = true;

    try {
      const width = this.originalImage.width;
      const height = this.originalImage.height;

      // Create temp canvas for source
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = width;
      srcCanvas.height = height;
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(this.originalImage, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, width, height);

      // Set result canvas
      this.resultCanvas.width = width;
      this.resultCanvas.height = height;

      const dstData = this.ctx.createImageData(width, height);

      // Calculate distortion parameters
      const k1 = this.settings.k1 / 100;
      const k2 = this.settings.k2 / 100;
      const perspX = this.settings.perspectiveX * Math.PI / 180;
      const perspY = this.settings.perspectiveY * Math.PI / 180;

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      // Apply correction
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Normalize coordinates to [-1, 1]
          let nx = (x - cx) / maxR;
          let ny = (y - cy) / maxR;

          // Apply perspective correction
          if (perspX !== 0 || perspY !== 0) {
            const cosX = Math.cos(perspX);
            const sinX = Math.sin(perspX);
            const cosY = Math.cos(perspY);
            const sinY = Math.sin(perspY);

            const z = 1 - nx * sinX - ny * sinY;
            nx = nx * cosX / z;
            ny = ny * cosY / z;
          }

          // Apply radial distortion correction (inverse)
          const r2 = nx * nx + ny * ny;
          const r4 = r2 * r2;
          const factor = 1 + k1 * r2 + k2 * r4;

          // For correction, we need inverse mapping
          // This is approximate - for better results, use Newton's method
          const srcNx = nx * factor;
          const srcNy = ny * factor;

          // Convert back to pixel coordinates
          const srcX = srcNx * maxR + cx;
          const srcY = srcNy * maxR + cy;

          // Bilinear interpolation
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = x0 + 1;
          const y1 = y0 + 1;

          if (x0 >= 0 && x1 < width && y0 >= 0 && y1 < height) {
            const fx = srcX - x0;
            const fy = srcY - y0;

            const dstIdx = (y * width + x) * 4;

            for (let c = 0; c < 4; c++) {
              const v00 = srcData.data[(y0 * width + x0) * 4 + c];
              const v01 = srcData.data[(y0 * width + x1) * 4 + c];
              const v10 = srcData.data[(y1 * width + x0) * 4 + c];
              const v11 = srcData.data[(y1 * width + x1) * 4 + c];

              const v0 = v00 * (1 - fx) + v01 * fx;
              const v1 = v10 * (1 - fx) + v11 * fx;

              dstData.data[dstIdx + c] = Math.round(v0 * (1 - fy) + v1 * fy);
            }
          }
        }
      }

      // Auto crop if enabled
      if (this.autoCrop) {
        this.autoCropImage(dstData, width, height);
      } else {
        this.ctx.putImageData(dstData, 0, 0);
        document.getElementById('correctedSize').textContent = `${width} × ${height}`;
      }

      // Update distortion coefficient display
      document.getElementById('distortionCoef').textContent =
        `k1: ${k1.toFixed(3)}, k2: ${k2.toFixed(3)}`;

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.downloadBtn.disabled = false;

      // Update grid
      setTimeout(() => {
        this.drawGrid(this.gridResult, this.resultCanvas);
      }, 100);

    } catch (error) {
      console.error('Distortion correction error:', error);
      this.showStatus('處理失敗：' + error.message, 'error');
    }

    this.applyBtn.disabled = false;
  }

  autoCropImage(imageData, width, height) {
    const data = imageData.data;

    // Find bounds of non-black pixels
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 0 && (data[idx] > 5 || data[idx + 1] > 5 || data[idx + 2] > 5)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Add small margin
    const margin = 5;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width - 1, maxX + margin);
    maxY = Math.min(height - 1, maxY + margin);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // Create cropped canvas
    this.resultCanvas.width = cropWidth;
    this.resultCanvas.height = cropHeight;

    // Copy cropped region
    const croppedData = this.ctx.createImageData(cropWidth, cropHeight);

    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const srcIdx = ((y + minY) * width + (x + minX)) * 4;
        const dstIdx = (y * cropWidth + x) * 4;

        croppedData.data[dstIdx] = data[srcIdx];
        croppedData.data[dstIdx + 1] = data[srcIdx + 1];
        croppedData.data[dstIdx + 2] = data[srcIdx + 2];
        croppedData.data[dstIdx + 3] = data[srcIdx + 3];
      }
    }

    this.ctx.putImageData(croppedData, 0, 0);
    document.getElementById('correctedSize').textContent = `${cropWidth} × ${cropHeight}`;
  }

  showProgress(text, percent) {
    this.progressSection.classList.add('active');
    this.progressText.textContent = text;
    this.progressFill.style.width = `${percent}%`;
  }

  hideProgress() {
    this.progressSection.classList.remove('active');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }

  download() {
    const link = document.createElement('a');
    link.download = `distortion-corrected-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = { k1: 0, k2: 0, perspectiveX: 0, perspectiveY: 0 };
    this.originalImg.src = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.applyBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    // Reset sliders
    ['k1', 'k2', 'perspectiveX', 'perspectiveY'].forEach(id => {
      document.getElementById(id).value = 0;
      this.updateSliderDisplay(id);
    });

    document.getElementById('originalSize').textContent = '-';
    document.getElementById('correctedSize').textContent = '-';
    document.getElementById('distortionCoef').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new DistortionCorrector();
});
