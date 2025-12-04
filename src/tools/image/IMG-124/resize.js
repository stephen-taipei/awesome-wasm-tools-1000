/**
 * IMG-124 圖片智能縮放
 * 內容感知縮放，保護重要區域
 */

class SmartResizer {
  constructor() {
    this.originalImage = null;
    this.imageData = null;
    this.currentMode = 'seam';
    this.aspectLocked = true;
    this.originalWidth = 0;
    this.originalHeight = 0;
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
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.resizeBtn = document.getElementById('resizeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.lockBtn = document.getElementById('lockBtn');
    this.targetWidth = document.getElementById('targetWidth');
    this.targetHeight = document.getElementById('targetHeight');
    this.modeItems = document.querySelectorAll('.mode-item');
    this.presetItems = document.querySelectorAll('.preset-item');
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

    this.presetItems.forEach(item => {
      item.addEventListener('click', () => this.applyPreset(item));
    });

    this.lockBtn.addEventListener('click', () => this.toggleLock());
    this.targetWidth.addEventListener('input', () => this.handleWidthChange());
    this.targetHeight.addEventListener('input', () => this.handleHeightChange());

    this.resizeBtn.addEventListener('click', () => this.resize());
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
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.originalImg.src = e.target.result;
        this.uploadZone.classList.add('has-file');
        this.previewSection.classList.add('active');
        this.resizeBtn.disabled = false;

        // Set default target size
        this.targetWidth.value = Math.min(800, img.width);
        this.handleWidthChange();

        this.updateInfo();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  selectMode(item) {
    this.modeItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    this.currentMode = item.dataset.mode;
  }

  applyPreset(item) {
    this.aspectLocked = false;
    this.lockBtn.classList.remove('locked');
    this.lockBtn.textContent = '🔓';

    this.targetWidth.value = item.dataset.width;
    this.targetHeight.value = item.dataset.height;
    this.updateInfo();
  }

  toggleLock() {
    this.aspectLocked = !this.aspectLocked;
    if (this.aspectLocked) {
      this.lockBtn.classList.add('locked');
      this.lockBtn.textContent = '🔗';
    } else {
      this.lockBtn.classList.remove('locked');
      this.lockBtn.textContent = '🔓';
    }
  }

  handleWidthChange() {
    if (this.aspectLocked && this.originalWidth > 0) {
      const ratio = this.originalHeight / this.originalWidth;
      this.targetHeight.value = Math.round(parseInt(this.targetWidth.value) * ratio);
    }
    this.updateInfo();
  }

  handleHeightChange() {
    if (this.aspectLocked && this.originalHeight > 0) {
      const ratio = this.originalWidth / this.originalHeight;
      this.targetWidth.value = Math.round(parseInt(this.targetHeight.value) * ratio);
    }
    this.updateInfo();
  }

  updateInfo() {
    document.getElementById('originalSize').textContent =
      `${this.originalWidth} × ${this.originalHeight}`;

    const tw = parseInt(this.targetWidth.value) || 0;
    const th = parseInt(this.targetHeight.value) || 0;
    document.getElementById('targetSize').textContent = `${tw} × ${th}`;

    if (this.originalWidth > 0 && this.originalHeight > 0) {
      const scaleW = (tw / this.originalWidth * 100).toFixed(1);
      const scaleH = (th / this.originalHeight * 100).toFixed(1);
      document.getElementById('scaleRatio').textContent = `${scaleW}% × ${scaleH}%`;
    }
  }

  async resize() {
    if (!this.originalImage) return;

    const startTime = performance.now();
    const targetW = parseInt(this.targetWidth.value);
    const targetH = parseInt(this.targetHeight.value);

    this.showProgress('開始處理...', 0);
    this.resizeBtn.disabled = true;

    try {
      let result;

      switch (this.currentMode) {
        case 'seam':
          result = await this.seamCarving(targetW, targetH);
          break;
        case 'bilinear':
          result = this.bilinearResize(targetW, targetH);
          break;
        case 'bicubic':
          result = this.bicubicResize(targetW, targetH);
          break;
        case 'lanczos':
          result = this.lanczosResize(targetW, targetH);
          break;
        default:
          result = this.bilinearResize(targetW, targetH);
      }

      this.resultCanvas.width = targetW;
      this.resultCanvas.height = targetH;
      this.ctx.putImageData(result, 0, 0);

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.hideProgress();
      this.downloadBtn.disabled = false;
      this.showStatus('縮放完成！', 'success');

    } catch (error) {
      console.error('Resize error:', error);
      this.showStatus('處理失敗：' + error.message, 'error');
      this.hideProgress();
    }

    this.resizeBtn.disabled = false;
  }

  // Seam Carving (Content-Aware Resize)
  async seamCarving(targetW, targetH) {
    // Create temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.originalWidth;
    tempCanvas.height = this.originalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    let currentW = tempCanvas.width;
    let currentH = tempCanvas.height;

    const totalSteps = Math.abs(currentW - targetW) + Math.abs(currentH - targetH);
    let step = 0;

    // Resize width first
    while (currentW !== targetW) {
      const energyMap = this.computeEnergy(imageData, currentW, currentH);

      if (currentW > targetW) {
        // Remove seam
        const seam = this.findVerticalSeam(energyMap, currentW, currentH);
        imageData = this.removeVerticalSeam(imageData, seam, currentW, currentH);
        currentW--;
      } else {
        // Add seam
        const seam = this.findVerticalSeam(energyMap, currentW, currentH);
        imageData = this.addVerticalSeam(imageData, seam, currentW, currentH);
        currentW++;
      }

      step++;
      if (step % 10 === 0) {
        this.showProgress(`處理寬度... ${Math.round(step / totalSteps * 100)}%`, step / totalSteps * 100);
        await this.sleep(1);
      }
    }

    // Then resize height
    while (currentH !== targetH) {
      const energyMap = this.computeEnergy(imageData, currentW, currentH);

      if (currentH > targetH) {
        // Remove seam
        const seam = this.findHorizontalSeam(energyMap, currentW, currentH);
        imageData = this.removeHorizontalSeam(imageData, seam, currentW, currentH);
        currentH--;
      } else {
        // Add seam
        const seam = this.findHorizontalSeam(energyMap, currentW, currentH);
        imageData = this.addHorizontalSeam(imageData, seam, currentW, currentH);
        currentH++;
      }

      step++;
      if (step % 10 === 0) {
        this.showProgress(`處理高度... ${Math.round(step / totalSteps * 100)}%`, step / totalSteps * 100);
        await this.sleep(1);
      }
    }

    return imageData;
  }

  computeEnergy(imageData, width, height) {
    const energy = new Float32Array(width * height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Get neighbors
        const left = x > 0 ? (y * width + x - 1) * 4 : idx;
        const right = x < width - 1 ? (y * width + x + 1) * 4 : idx;
        const top = y > 0 ? ((y - 1) * width + x) * 4 : idx;
        const bottom = y < height - 1 ? ((y + 1) * width + x) * 4 : idx;

        // Calculate gradient
        const dx = Math.abs(data[right] - data[left]) +
                   Math.abs(data[right + 1] - data[left + 1]) +
                   Math.abs(data[right + 2] - data[left + 2]);

        const dy = Math.abs(data[bottom] - data[top]) +
                   Math.abs(data[bottom + 1] - data[top + 1]) +
                   Math.abs(data[bottom + 2] - data[top + 2]);

        energy[y * width + x] = Math.sqrt(dx * dx + dy * dy);
      }
    }

    return energy;
  }

  findVerticalSeam(energy, width, height) {
    // Dynamic programming to find minimum energy seam
    const dp = new Float32Array(width * height);
    const path = new Int32Array(width * height);

    // Initialize first row
    for (let x = 0; x < width; x++) {
      dp[x] = energy[x];
    }

    // Fill DP table
    for (let y = 1; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const above = (y - 1) * width + x;

        let minEnergy = dp[above];
        let minX = x;

        if (x > 0 && dp[above - 1] < minEnergy) {
          minEnergy = dp[above - 1];
          minX = x - 1;
        }
        if (x < width - 1 && dp[above + 1] < minEnergy) {
          minEnergy = dp[above + 1];
          minX = x + 1;
        }

        dp[idx] = energy[idx] + minEnergy;
        path[idx] = minX;
      }
    }

    // Backtrack to find seam
    const seam = new Int32Array(height);

    // Find minimum in last row
    let minIdx = 0;
    let minVal = dp[(height - 1) * width];
    for (let x = 1; x < width; x++) {
      if (dp[(height - 1) * width + x] < minVal) {
        minVal = dp[(height - 1) * width + x];
        minIdx = x;
      }
    }

    seam[height - 1] = minIdx;
    for (let y = height - 2; y >= 0; y--) {
      seam[y] = path[(y + 1) * width + seam[y + 1]];
    }

    return seam;
  }

  findHorizontalSeam(energy, width, height) {
    // Transpose and find vertical seam
    const transposed = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        transposed[x * height + y] = energy[y * width + x];
      }
    }

    const dp = new Float32Array(height * width);
    const path = new Int32Array(height * width);

    for (let y = 0; y < height; y++) {
      dp[y] = transposed[y];
    }

    for (let x = 1; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = x * height + y;
        const prev = (x - 1) * height + y;

        let minEnergy = dp[prev];
        let minY = y;

        if (y > 0 && dp[prev - 1] < minEnergy) {
          minEnergy = dp[prev - 1];
          minY = y - 1;
        }
        if (y < height - 1 && dp[prev + 1] < minEnergy) {
          minEnergy = dp[prev + 1];
          minY = y + 1;
        }

        dp[idx] = transposed[idx] + minEnergy;
        path[idx] = minY;
      }
    }

    const seam = new Int32Array(width);

    let minIdx = 0;
    let minVal = dp[(width - 1) * height];
    for (let y = 1; y < height; y++) {
      if (dp[(width - 1) * height + y] < minVal) {
        minVal = dp[(width - 1) * height + y];
        minIdx = y;
      }
    }

    seam[width - 1] = minIdx;
    for (let x = width - 2; x >= 0; x--) {
      seam[x] = path[(x + 1) * height + seam[x + 1]];
    }

    return seam;
  }

  removeVerticalSeam(imageData, seam, width, height) {
    const newWidth = width - 1;
    const newData = new Uint8ClampedArray(newWidth * height * 4);

    for (let y = 0; y < height; y++) {
      let newX = 0;
      for (let x = 0; x < width; x++) {
        if (x === seam[y]) continue;

        const oldIdx = (y * width + x) * 4;
        const newIdx = (y * newWidth + newX) * 4;

        newData[newIdx] = imageData.data[oldIdx];
        newData[newIdx + 1] = imageData.data[oldIdx + 1];
        newData[newIdx + 2] = imageData.data[oldIdx + 2];
        newData[newIdx + 3] = imageData.data[oldIdx + 3];

        newX++;
      }
    }

    return new ImageData(newData, newWidth, height);
  }

  removeHorizontalSeam(imageData, seam, width, height) {
    const newHeight = height - 1;
    const newData = new Uint8ClampedArray(width * newHeight * 4);

    for (let x = 0; x < width; x++) {
      let newY = 0;
      for (let y = 0; y < height; y++) {
        if (y === seam[x]) continue;

        const oldIdx = (y * width + x) * 4;
        const newIdx = (newY * width + x) * 4;

        newData[newIdx] = imageData.data[oldIdx];
        newData[newIdx + 1] = imageData.data[oldIdx + 1];
        newData[newIdx + 2] = imageData.data[oldIdx + 2];
        newData[newIdx + 3] = imageData.data[oldIdx + 3];

        newY++;
      }
    }

    return new ImageData(newData, width, newHeight);
  }

  addVerticalSeam(imageData, seam, width, height) {
    const newWidth = width + 1;
    const newData = new Uint8ClampedArray(newWidth * height * 4);

    for (let y = 0; y < height; y++) {
      let newX = 0;
      for (let x = 0; x < width; x++) {
        const oldIdx = (y * width + x) * 4;
        const newIdx = (y * newWidth + newX) * 4;

        newData[newIdx] = imageData.data[oldIdx];
        newData[newIdx + 1] = imageData.data[oldIdx + 1];
        newData[newIdx + 2] = imageData.data[oldIdx + 2];
        newData[newIdx + 3] = imageData.data[oldIdx + 3];
        newX++;

        if (x === seam[y]) {
          // Duplicate pixel with average
          const nextIdx = x < width - 1 ? (y * width + x + 1) * 4 : oldIdx;
          const dupIdx = (y * newWidth + newX) * 4;

          newData[dupIdx] = Math.round((imageData.data[oldIdx] + imageData.data[nextIdx]) / 2);
          newData[dupIdx + 1] = Math.round((imageData.data[oldIdx + 1] + imageData.data[nextIdx + 1]) / 2);
          newData[dupIdx + 2] = Math.round((imageData.data[oldIdx + 2] + imageData.data[nextIdx + 2]) / 2);
          newData[dupIdx + 3] = Math.round((imageData.data[oldIdx + 3] + imageData.data[nextIdx + 3]) / 2);
          newX++;
        }
      }
    }

    return new ImageData(newData, newWidth, height);
  }

  addHorizontalSeam(imageData, seam, width, height) {
    const newHeight = height + 1;
    const newData = new Uint8ClampedArray(width * newHeight * 4);

    for (let x = 0; x < width; x++) {
      let newY = 0;
      for (let y = 0; y < height; y++) {
        const oldIdx = (y * width + x) * 4;
        const newIdx = (newY * width + x) * 4;

        newData[newIdx] = imageData.data[oldIdx];
        newData[newIdx + 1] = imageData.data[oldIdx + 1];
        newData[newIdx + 2] = imageData.data[oldIdx + 2];
        newData[newIdx + 3] = imageData.data[oldIdx + 3];
        newY++;

        if (y === seam[x]) {
          const nextIdx = y < height - 1 ? ((y + 1) * width + x) * 4 : oldIdx;
          const dupIdx = (newY * width + x) * 4;

          newData[dupIdx] = Math.round((imageData.data[oldIdx] + imageData.data[nextIdx]) / 2);
          newData[dupIdx + 1] = Math.round((imageData.data[oldIdx + 1] + imageData.data[nextIdx + 1]) / 2);
          newData[dupIdx + 2] = Math.round((imageData.data[oldIdx + 2] + imageData.data[nextIdx + 2]) / 2);
          newData[dupIdx + 3] = Math.round((imageData.data[oldIdx + 3] + imageData.data[nextIdx + 3]) / 2);
          newY++;
        }
      }
    }

    return new ImageData(newData, width, newHeight);
  }

  // Bilinear Interpolation
  bilinearResize(targetW, targetH) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.originalWidth;
    tempCanvas.height = this.originalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    const srcData = tempCtx.getImageData(0, 0, this.originalWidth, this.originalHeight);
    const dstData = new ImageData(targetW, targetH);

    const xRatio = this.originalWidth / targetW;
    const yRatio = this.originalHeight / targetH;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, this.originalWidth - 1);
        const y2 = Math.min(y1 + 1, this.originalHeight - 1);

        const xFrac = srcX - x1;
        const yFrac = srcY - y1;

        const dstIdx = (y * targetW + x) * 4;

        for (let c = 0; c < 4; c++) {
          const v11 = srcData.data[(y1 * this.originalWidth + x1) * 4 + c];
          const v12 = srcData.data[(y1 * this.originalWidth + x2) * 4 + c];
          const v21 = srcData.data[(y2 * this.originalWidth + x1) * 4 + c];
          const v22 = srcData.data[(y2 * this.originalWidth + x2) * 4 + c];

          const v1 = v11 * (1 - xFrac) + v12 * xFrac;
          const v2 = v21 * (1 - xFrac) + v22 * xFrac;

          dstData.data[dstIdx + c] = Math.round(v1 * (1 - yFrac) + v2 * yFrac);
        }
      }
    }

    return dstData;
  }

  // Bicubic Interpolation
  bicubicResize(targetW, targetH) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.originalWidth;
    tempCanvas.height = this.originalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    const srcData = tempCtx.getImageData(0, 0, this.originalWidth, this.originalHeight);
    const dstData = new ImageData(targetW, targetH);

    const xRatio = this.originalWidth / targetW;
    const yRatio = this.originalHeight / targetH;

    const cubicWeight = (t) => {
      const a = -0.5;
      const absT = Math.abs(t);
      if (absT <= 1) {
        return (a + 2) * absT * absT * absT - (a + 3) * absT * absT + 1;
      } else if (absT <= 2) {
        return a * absT * absT * absT - 5 * a * absT * absT + 8 * a * absT - 4 * a;
      }
      return 0;
    };

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);

        const dstIdx = (y * targetW + x) * 4;

        for (let c = 0; c < 4; c++) {
          let value = 0;
          let weight = 0;

          for (let j = -1; j <= 2; j++) {
            for (let i = -1; i <= 2; i++) {
              const px = Math.min(Math.max(x0 + i, 0), this.originalWidth - 1);
              const py = Math.min(Math.max(y0 + j, 0), this.originalHeight - 1);

              const wx = cubicWeight(srcX - (x0 + i));
              const wy = cubicWeight(srcY - (y0 + j));
              const w = wx * wy;

              value += srcData.data[(py * this.originalWidth + px) * 4 + c] * w;
              weight += w;
            }
          }

          dstData.data[dstIdx + c] = Math.min(255, Math.max(0, Math.round(value / weight)));
        }
      }
    }

    return dstData;
  }

  // Lanczos Interpolation
  lanczosResize(targetW, targetH) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.originalWidth;
    tempCanvas.height = this.originalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(this.originalImage, 0, 0);

    const srcData = tempCtx.getImageData(0, 0, this.originalWidth, this.originalHeight);
    const dstData = new ImageData(targetW, targetH);

    const xRatio = this.originalWidth / targetW;
    const yRatio = this.originalHeight / targetH;
    const a = 3; // Lanczos kernel size

    const sinc = (x) => {
      if (x === 0) return 1;
      return Math.sin(Math.PI * x) / (Math.PI * x);
    };

    const lanczos = (x) => {
      if (x === 0) return 1;
      if (Math.abs(x) >= a) return 0;
      return sinc(x) * sinc(x / a);
    };

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);

        const dstIdx = (y * targetW + x) * 4;

        for (let c = 0; c < 4; c++) {
          let value = 0;
          let weight = 0;

          for (let j = -a + 1; j <= a; j++) {
            for (let i = -a + 1; i <= a; i++) {
              const px = Math.min(Math.max(x0 + i, 0), this.originalWidth - 1);
              const py = Math.min(Math.max(y0 + j, 0), this.originalHeight - 1);

              const w = lanczos(srcX - (x0 + i)) * lanczos(srcY - (y0 + j));

              value += srcData.data[(py * this.originalWidth + px) * 4 + c] * w;
              weight += w;
            }
          }

          dstData.data[dstIdx + c] = Math.min(255, Math.max(0, Math.round(value / weight)));
        }
      }
    }

    return dstData;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    link.download = `smart-resized-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.originalImg.src = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.resizeBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    document.getElementById('originalSize').textContent = '-';
    document.getElementById('targetSize').textContent = '-';
    document.getElementById('scaleRatio').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new SmartResizer();
});
