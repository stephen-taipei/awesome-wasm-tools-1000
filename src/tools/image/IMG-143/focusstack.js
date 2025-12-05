/**
 * IMG-143 焦點堆疊工具
 * Focus Stacking Tool
 */

class FocusStacker {
  constructor() {
    this.images = [];
    this.imageData = [];
    this.maxImages = 10;
    this.resultImageData = null;
    this.focusMapData = null;
    this.startTime = null;

    this.settings = {
      method: 'laplacian',
      radius: 15,
      smooth: 3,
      sharpen: 0
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Image list elements
    this.imageListSection = document.getElementById('imageListSection');
    this.imageGrid = document.getElementById('imageGrid');
    this.imageCount = document.getElementById('imageCount');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.methodSelect = document.getElementById('method');
    this.radiusSlider = document.getElementById('radius');
    this.smoothSlider = document.getElementById('smooth');
    this.sharpenSlider = document.getElementById('sharpen');

    // Value displays
    this.radiusValue = document.getElementById('radiusValue');
    this.smoothValue = document.getElementById('smoothValue');
    this.sharpenValue = document.getElementById('sharpenValue');

    // Progress elements
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewTabs = document.querySelectorAll('.preview-tab');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');

    // Info elements
    this.outputSize = document.getElementById('outputSize');
    this.inputCount = document.getElementById('inputCount');
    this.methodUsed = document.getElementById('methodUsed');
    this.processTime = document.getElementById('processTime');

    // Buttons
    this.processBtn = document.getElementById('processBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Settings events
    this.methodSelect.addEventListener('change', (e) => {
      this.settings.method = e.target.value;
    });

    this.radiusSlider.addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      this.radiusValue.textContent = `${this.settings.radius}px`;
    });

    this.smoothSlider.addEventListener('input', (e) => {
      this.settings.smooth = parseInt(e.target.value);
      const labels = ['最低', '低', '中', '高', '最高'];
      this.smoothValue.textContent = labels[this.settings.smooth - 1];
    });

    this.sharpenSlider.addEventListener('input', (e) => {
      this.settings.sharpen = parseInt(e.target.value);
      this.sharpenValue.textContent = this.settings.sharpen;
    });

    // Preview tabs
    this.previewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.previewTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.showPreview(tab.dataset.view);
      });
    });

    // Button events
    this.processBtn.addEventListener('click', () => this.stackFocus());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    this.addImages(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addImages(files);
  }

  async addImages(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const availableSlots = this.maxImages - this.images.length;

    if (imageFiles.length === 0) {
      this.showStatus('請選擇圖片檔案', 'error');
      return;
    }

    if (availableSlots <= 0) {
      this.showStatus('最多只能上傳 10 張圖片', 'error');
      return;
    }

    const filesToAdd = imageFiles.slice(0, availableSlots);

    for (const file of filesToAdd) {
      try {
        const imageInfo = await this.loadImage(file);
        this.images.push(imageInfo);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }

    this.updateImageGrid();
    this.updateUI();

    if (imageFiles.length > availableSlots) {
      this.showStatus(`已載入 ${filesToAdd.length} 張圖片（已達上限）`, 'info');
    } else {
      this.showStatus(`已載入 ${filesToAdd.length} 張圖片`, 'success');
    }
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 計算焦點分數（用於顯示）
          const focusScore = this.calculateFocusScore(img);
          resolve({
            file,
            img,
            name: file.name,
            dataUrl: e.target.result,
            width: img.width,
            height: img.height,
            focusScore
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  calculateFocusScore(img) {
    // 取樣圖片計算整體對焦分數
    const canvas = document.createElement('canvas');
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // 計算 Laplacian 變異數
    let sum = 0;
    let count = 0;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = (y * size + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const top = 0.299 * data[idx - size * 4] + 0.587 * data[idx - size * 4 + 1] + 0.114 * data[idx - size * 4 + 2];
        const bottom = 0.299 * data[idx + size * 4] + 0.587 * data[idx + size * 4 + 1] + 0.114 * data[idx + size * 4 + 2];

        const laplacian = Math.abs(4 * gray - left - right - top - bottom);
        sum += laplacian;
        count++;
      }
    }

    return (sum / count).toFixed(1);
  }

  updateImageGrid() {
    this.imageGrid.innerHTML = '';
    this.imageCount.textContent = this.images.length;

    this.images.forEach((imageInfo, index) => {
      const item = document.createElement('div');
      item.className = 'image-item';

      const img = document.createElement('img');
      img.src = imageInfo.dataUrl;

      const info = document.createElement('div');
      info.className = 'image-info';

      const name = document.createElement('div');
      name.className = 'image-name';
      name.textContent = imageInfo.name;

      const focus = document.createElement('div');
      focus.className = 'focus-indicator';
      focus.textContent = `對焦分數: ${imageInfo.focusScore}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'image-remove';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => this.removeImage(index));

      info.appendChild(name);
      info.appendChild(focus);

      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(removeBtn);

      this.imageGrid.appendChild(item);
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageGrid();
    this.updateUI();
    this.showStatus('圖片已移除', 'success');
  }

  updateUI() {
    const hasImages = this.images.length > 0;
    const canProcess = this.images.length >= 2;

    this.uploadZone.classList.toggle('has-files', hasImages);
    this.imageListSection.classList.toggle('active', hasImages);
    this.settingsSection.classList.toggle('active', canProcess);
    this.processBtn.disabled = !canProcess;

    if (!canProcess) {
      this.previewSection.classList.remove('active');
      this.downloadBtn.disabled = true;
    }
  }

  async stackFocus() {
    if (this.images.length < 2) {
      this.showStatus('需要至少 2 張圖片', 'error');
      return;
    }

    this.startTime = performance.now();
    this.progressSection.classList.add('active');
    this.processBtn.disabled = true;
    this.updateProgress(0, '準備處理...');

    try {
      // 載入所有圖片數據
      await this.loadAllImageData();
      this.updateProgress(20, '載入圖片數據...');

      // 計算焦點圖
      this.updateProgress(30, '分析焦點區域...');
      const focusMaps = this.computeFocusMaps();

      this.updateProgress(50, '計算權重...');

      // 執行堆疊
      await this.performStack(focusMaps);
      this.updateProgress(80, '套用融合...');

      // 銳化處理
      if (this.settings.sharpen > 0) {
        this.updateProgress(90, '銳化處理...');
        this.applySharpen();
      }

      this.updateProgress(100, '完成！');

      // 顯示結果
      this.showResult();

      setTimeout(() => {
        this.progressSection.classList.remove('active');
      }, 500);

      this.showStatus('焦點堆疊完成！', 'success');
    } catch (error) {
      console.error('Stacking error:', error);
      this.showStatus('處理過程中發生錯誤', 'error');
      this.progressSection.classList.remove('active');
    }

    this.processBtn.disabled = false;
  }

  async loadAllImageData() {
    this.imageData = [];

    // 找出最小的圖片尺寸
    let minWidth = Infinity;
    let minHeight = Infinity;

    this.images.forEach(info => {
      minWidth = Math.min(minWidth, info.img.width);
      minHeight = Math.min(minHeight, info.img.height);
    });

    // 統一尺寸並載入數據
    const canvas = document.createElement('canvas');
    canvas.width = minWidth;
    canvas.height = minHeight;
    const ctx = canvas.getContext('2d');

    for (const info of this.images) {
      ctx.clearRect(0, 0, minWidth, minHeight);
      ctx.drawImage(info.img, 0, 0, minWidth, minHeight);
      const data = ctx.getImageData(0, 0, minWidth, minHeight);
      this.imageData.push(data);
    }

    // 設定輸出畫布
    this.resultCanvas.width = minWidth;
    this.resultCanvas.height = minHeight;
  }

  computeFocusMaps() {
    const width = this.resultCanvas.width;
    const height = this.resultCanvas.height;
    const numImages = this.imageData.length;
    const radius = this.settings.radius;

    const focusMaps = [];

    for (let i = 0; i < numImages; i++) {
      const focusMap = new Float32Array(width * height);
      const data = this.imageData[i].data;

      // 計算每個像素的焦點值
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          let focusValue;

          switch (this.settings.method) {
            case 'laplacian':
              focusValue = this.laplacianFocus(data, x, y, width, height, radius);
              break;
            case 'contrast':
              focusValue = this.contrastFocus(data, x, y, width, height, radius);
              break;
            case 'gradient':
              focusValue = this.gradientFocus(data, x, y, width, height, radius);
              break;
            default:
              focusValue = this.laplacianFocus(data, x, y, width, height, radius);
          }

          focusMap[idx] = focusValue;
        }
      }

      // 平滑焦點圖
      const smoothedMap = this.smoothFocusMap(focusMap, width, height);
      focusMaps.push(smoothedMap);
    }

    return focusMaps;
  }

  laplacianFocus(data, cx, cy, width, height, radius) {
    let sum = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const top = 0.299 * data[idx - width * 4] + 0.587 * data[idx - width * 4 + 1] + 0.114 * data[idx - width * 4 + 2];
        const bottom = 0.299 * data[idx + width * 4] + 0.587 * data[idx + width * 4 + 1] + 0.114 * data[idx + width * 4 + 2];

        const laplacian = Math.abs(4 * gray - left - right - top - bottom);
        sum += laplacian * laplacian;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  contrastFocus(data, cx, cy, width, height, radius) {
    let min = 255;
    let max = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.max(0, Math.min(width - 1, cx + dx));
        const y = Math.max(0, Math.min(height - 1, cy + dy));

        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        min = Math.min(min, gray);
        max = Math.max(max, gray);
      }
    }

    return (max - min) * (max - min);
  }

  gradientFocus(data, cx, cy, width, height, radius) {
    let sum = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const top = 0.299 * data[idx - width * 4] + 0.587 * data[idx - width * 4 + 1] + 0.114 * data[idx - width * 4 + 2];
        const bottom = 0.299 * data[idx + width * 4] + 0.587 * data[idx + width * 4 + 1] + 0.114 * data[idx + width * 4 + 2];

        const gx = right - left;
        const gy = bottom - top;
        sum += gx * gx + gy * gy;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  smoothFocusMap(focusMap, width, height) {
    const smoothed = new Float32Array(width * height);
    const kernelSize = this.settings.smooth * 2 + 1;
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const nx = x + kx;
            const ny = y + ky;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += focusMap[ny * width + nx];
              count++;
            }
          }
        }

        smoothed[y * width + x] = sum / count;
      }
    }

    return smoothed;
  }

  async performStack(focusMaps) {
    const width = this.resultCanvas.width;
    const height = this.resultCanvas.height;
    const numImages = this.imageData.length;

    this.resultImageData = this.resultCtx.createImageData(width, height);
    this.focusMapData = this.resultCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixelIdx = idx * 4;

        // 找出焦點最清晰的圖片
        let maxFocus = -1;
        let bestImage = 0;

        for (let i = 0; i < numImages; i++) {
          if (focusMaps[i][idx] > maxFocus) {
            maxFocus = focusMaps[i][idx];
            bestImage = i;
          }
        }

        // 使用焦點最清晰的像素
        const srcData = this.imageData[bestImage].data;
        this.resultImageData.data[pixelIdx] = srcData[pixelIdx];
        this.resultImageData.data[pixelIdx + 1] = srcData[pixelIdx + 1];
        this.resultImageData.data[pixelIdx + 2] = srcData[pixelIdx + 2];
        this.resultImageData.data[pixelIdx + 3] = 255;

        // 記錄焦點圖（用於視覺化）
        const hue = (bestImage / numImages) * 360;
        const rgb = this.hslToRgb(hue, 100, 50);
        this.focusMapData.data[pixelIdx] = rgb.r;
        this.focusMapData.data[pixelIdx + 1] = rgb.g;
        this.focusMapData.data[pixelIdx + 2] = rgb.b;
        this.focusMapData.data[pixelIdx + 3] = 255;
      }
    }
  }

  hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  applySharpen() {
    const width = this.resultCanvas.width;
    const height = this.resultCanvas.height;
    const data = this.resultImageData.data;
    const amount = this.settings.sharpen / 100;

    const original = new Uint8ClampedArray(data);

    // Unsharp mask kernel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = original[idx + c];
          const left = original[idx - 4 + c];
          const right = original[idx + 4 + c];
          const top = original[idx - width * 4 + c];
          const bottom = original[idx + width * 4 + c];

          const blur = (left + right + top + bottom) / 4;
          const sharpen = center + (center - blur) * amount * 2;

          data[idx + c] = Math.max(0, Math.min(255, sharpen));
        }
      }
    }
  }

  showResult() {
    this.resultCtx.putImageData(this.resultImageData, 0, 0);
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;

    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);

    // 更新資訊
    this.outputSize.textContent = `${this.resultCanvas.width} × ${this.resultCanvas.height}`;
    this.inputCount.textContent = `${this.images.length} 張`;
    const methodNames = { laplacian: 'Laplacian', contrast: '對比度', gradient: '梯度' };
    this.methodUsed.textContent = methodNames[this.settings.method];
    this.processTime.textContent = `${elapsed}秒`;
  }

  showPreview(view) {
    if (view === 'focusmap' && this.focusMapData) {
      this.resultCtx.putImageData(this.focusMapData, 0, 0);
    } else if (view === 'result' && this.resultImageData) {
      this.resultCtx.putImageData(this.resultImageData, 0, 0);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  downloadImage() {
    if (!this.resultImageData) return;

    const link = document.createElement('a');
    link.download = `focus_stacked_${this.images.length}imgs_${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('圖片已下載！', 'success');
  }

  reset() {
    this.images = [];
    this.imageData = [];
    this.resultImageData = null;
    this.focusMapData = null;

    // 重置設定
    this.settings = {
      method: 'laplacian',
      radius: 15,
      smooth: 3,
      sharpen: 0
    };

    // 重置 UI
    this.uploadZone.classList.remove('has-files');
    this.imageListSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.progressSection.classList.remove('active');
    this.processBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置控制項
    this.methodSelect.value = 'laplacian';
    this.radiusSlider.value = 15;
    this.smoothSlider.value = 3;
    this.sharpenSlider.value = 0;

    this.radiusValue.textContent = '15px';
    this.smoothValue.textContent = '中';
    this.sharpenValue.textContent = '0';

    // 清空列表
    this.imageGrid.innerHTML = '';
    this.imageCount.textContent = '0';

    // 清空畫布
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new FocusStacker();
});
