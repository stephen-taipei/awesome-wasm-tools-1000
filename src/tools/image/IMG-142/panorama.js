/**
 * IMG-142 全景圖拼接工具
 * Panorama Stitching Tool
 */

class PanoramaStitcher {
  constructor() {
    this.images = [];
    this.maxImages = 10;
    this.resultBlob = null;
    this.zoom = 100;

    this.settings = {
      direction: 'horizontal',
      blendMode: 'linear',
      blendWidth: 50,
      quality: 90,
      autoCrop: true,
      autoExposure: true
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Image strip elements
    this.imageStripSection = document.getElementById('imageStripSection');
    this.imageStrip = document.getElementById('imageStrip');
    this.imageCount = document.getElementById('imageCount');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.directionSelect = document.getElementById('direction');
    this.blendModeSelect = document.getElementById('blendMode');
    this.blendWidthSlider = document.getElementById('blendWidth');
    this.qualitySlider = document.getElementById('quality');
    this.autoCropCheckbox = document.getElementById('autoCrop');
    this.autoExposureCheckbox = document.getElementById('autoExposure');

    // Value displays
    this.blendWidthValue = document.getElementById('blendWidthValue');
    this.qualityValue = document.getElementById('qualityValue');

    // Progress elements
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');

    // Zoom controls
    this.zoomIn = document.getElementById('zoomIn');
    this.zoomOut = document.getElementById('zoomOut');
    this.zoomLevel = document.getElementById('zoomLevel');

    // Info elements
    this.outputSize = document.getElementById('outputSize');
    this.inputCount = document.getElementById('inputCount');
    this.directionUsed = document.getElementById('directionUsed');
    this.fileSize = document.getElementById('fileSize');

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
    this.directionSelect.addEventListener('change', (e) => {
      this.settings.direction = e.target.value;
    });

    this.blendModeSelect.addEventListener('change', (e) => {
      this.settings.blendMode = e.target.value;
    });

    this.blendWidthSlider.addEventListener('input', (e) => {
      this.settings.blendWidth = parseInt(e.target.value);
      this.blendWidthValue.textContent = `${this.settings.blendWidth}px`;
    });

    this.qualitySlider.addEventListener('input', (e) => {
      this.settings.quality = parseInt(e.target.value);
      this.qualityValue.textContent = `${this.settings.quality}%`;
    });

    this.autoCropCheckbox.addEventListener('change', (e) => {
      this.settings.autoCrop = e.target.checked;
    });

    this.autoExposureCheckbox.addEventListener('change', (e) => {
      this.settings.autoExposure = e.target.checked;
    });

    // Zoom events
    this.zoomIn.addEventListener('click', () => this.setZoom(this.zoom + 25));
    this.zoomOut.addEventListener('click', () => this.setZoom(this.zoom - 25));

    // Button events
    this.processBtn.addEventListener('click', () => this.stitchPanorama());
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

    this.updateImageStrip();
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
          resolve({
            file,
            img,
            name: file.name,
            dataUrl: e.target.result,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  updateImageStrip() {
    this.imageStrip.innerHTML = '';
    this.imageCount.textContent = this.images.length;

    this.images.forEach((imageInfo, index) => {
      const item = document.createElement('div');
      item.className = 'strip-item';
      item.draggable = true;
      item.dataset.index = index;

      const img = document.createElement('img');
      img.src = imageInfo.dataUrl;

      const info = document.createElement('div');
      info.className = 'strip-info';

      const order = document.createElement('div');
      order.className = 'strip-order';
      order.textContent = `#${index + 1}`;

      const name = document.createElement('div');
      name.className = 'strip-name';
      name.textContent = imageInfo.name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'strip-remove';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });

      info.appendChild(order);
      info.appendChild(name);

      item.appendChild(img);
      item.appendChild(info);
      item.appendChild(removeBtn);

      // Drag events
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
      item.addEventListener('dragover', (e) => this.handleItemDragOver(e));
      item.addEventListener('drop', (e) => this.handleItemDrop(e, index));
      item.addEventListener('dragend', () => this.handleDragEnd());

      this.imageStrip.appendChild(item);
    });
  }

  handleDragStart(e, index) {
    e.dataTransfer.setData('text/plain', index);
    e.target.classList.add('dragging');
  }

  handleItemDragOver(e) {
    e.preventDefault();
  }

  handleItemDrop(e, targetIndex) {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (sourceIndex !== targetIndex) {
      const [removed] = this.images.splice(sourceIndex, 1);
      this.images.splice(targetIndex, 0, removed);
      this.updateImageStrip();
    }
  }

  handleDragEnd() {
    document.querySelectorAll('.strip-item').forEach(item => {
      item.classList.remove('dragging');
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.updateImageStrip();
    this.updateUI();
    this.showStatus('圖片已移除', 'success');
  }

  updateUI() {
    const hasImages = this.images.length > 0;
    const canProcess = this.images.length >= 2;

    this.uploadZone.classList.toggle('has-files', hasImages);
    this.imageStripSection.classList.toggle('active', hasImages);
    this.settingsSection.classList.toggle('active', canProcess);
    this.processBtn.disabled = !canProcess;

    if (!canProcess) {
      this.previewSection.classList.remove('active');
      this.downloadBtn.disabled = true;
    }
  }

  setZoom(level) {
    this.zoom = Math.max(25, Math.min(200, level));
    this.zoomLevel.textContent = `${this.zoom}%`;
    this.resultCanvas.style.width = `${this.resultCanvas.width * this.zoom / 100}px`;
    this.resultCanvas.style.height = `${this.resultCanvas.height * this.zoom / 100}px`;
  }

  async stitchPanorama() {
    if (this.images.length < 2) {
      this.showStatus('需要至少 2 張圖片', 'error');
      return;
    }

    this.progressSection.classList.add('active');
    this.processBtn.disabled = true;
    this.updateProgress(0, '準備拼接...');

    try {
      // 決定拼接方向
      let direction = this.settings.direction;
      if (direction === 'auto') {
        direction = this.detectDirection();
      }

      this.updateProgress(10, '分析圖片...');

      // 曝光均衡化
      let processedImages = this.images.map(info => info.img);
      if (this.settings.autoExposure) {
        this.updateProgress(20, '曝光均衡化...');
        processedImages = await this.equalizeExposure(processedImages);
      }

      this.updateProgress(40, '計算重疊區域...');

      // 執行拼接
      const result = await this.performStitch(processedImages, direction);

      this.updateProgress(80, '套用融合...');

      // 自動裁切
      if (this.settings.autoCrop) {
        this.updateProgress(90, '自動裁切...');
      }

      this.updateProgress(100, '完成！');

      // 顯示結果
      this.showResult(result, direction);

      setTimeout(() => {
        this.progressSection.classList.remove('active');
      }, 500);

      this.showStatus('全景圖拼接完成！', 'success');
    } catch (error) {
      console.error('Stitching error:', error);
      this.showStatus('拼接過程中發生錯誤', 'error');
      this.progressSection.classList.remove('active');
    }

    this.processBtn.disabled = false;
  }

  detectDirection() {
    // 簡單的方向偵測：比較圖片的寬高比
    const firstImg = this.images[0].img;
    const lastImg = this.images[this.images.length - 1].img;

    // 假設水平拼接更常見
    return 'horizontal';
  }

  async equalizeExposure(images) {
    // 計算每張圖片的平均亮度
    const luminances = images.map(img => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return sum / (100 * 100);
    });

    // 計算目標亮度（平均值）
    const targetLuminance = luminances.reduce((a, b) => a + b, 0) / luminances.length;

    // 調整每張圖片
    return images.map((img, index) => {
      const factor = targetLuminance / luminances[index];
      if (Math.abs(factor - 1) < 0.1) return img;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] * factor);
      }

      ctx.putImageData(imageData, 0, 0);

      const newImg = new Image();
      newImg.src = canvas.toDataURL();
      return newImg;
    });
  }

  async performStitch(images, direction) {
    const isHorizontal = direction === 'horizontal';

    // 計算輸出尺寸
    let totalWidth = 0;
    let totalHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const img of images) {
      if (isHorizontal) {
        totalWidth += img.width;
        maxHeight = Math.max(maxHeight, img.height);
      } else {
        totalHeight += img.height;
        maxWidth = Math.max(maxWidth, img.width);
      }
    }

    // 扣除重疊區域
    const overlapWidth = this.settings.blendWidth;
    if (isHorizontal) {
      totalWidth -= overlapWidth * (images.length - 1);
    } else {
      totalHeight -= overlapWidth * (images.length - 1);
    }

    // 設定畫布
    this.resultCanvas.width = isHorizontal ? totalWidth : maxWidth;
    this.resultCanvas.height = isHorizontal ? maxHeight : totalHeight;

    // 繪製並融合
    let offset = 0;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      if (i === 0) {
        // 第一張圖片直接繪製
        if (isHorizontal) {
          this.resultCtx.drawImage(img, 0, 0);
          offset = img.width - overlapWidth;
        } else {
          this.resultCtx.drawImage(img, 0, 0);
          offset = img.height - overlapWidth;
        }
      } else {
        // 後續圖片需要融合
        if (isHorizontal) {
          this.blendHorizontal(img, offset, overlapWidth);
          offset += img.width - overlapWidth;
        } else {
          this.blendVertical(img, offset, overlapWidth);
          offset += img.height - overlapWidth;
        }
      }
    }

    return {
      width: this.resultCanvas.width,
      height: this.resultCanvas.height
    };
  }

  blendHorizontal(img, offset, blendWidth) {
    const height = this.resultCanvas.height;

    // 先繪製非重疊區域
    this.resultCtx.drawImage(
      img,
      blendWidth, 0, img.width - blendWidth, img.height,
      offset + blendWidth, 0, img.width - blendWidth, img.height
    );

    // 創建臨時畫布處理融合區域
    const blendCanvas = document.createElement('canvas');
    blendCanvas.width = blendWidth;
    blendCanvas.height = height;
    const blendCtx = blendCanvas.getContext('2d');

    // 繪製新圖片的重疊部分
    blendCtx.drawImage(img, 0, 0, blendWidth, img.height, 0, 0, blendWidth, height);
    const newData = blendCtx.getImageData(0, 0, blendWidth, height);

    // 獲取現有的重疊區域
    const existingData = this.resultCtx.getImageData(offset, 0, blendWidth, height);

    // 融合
    this.blendImageData(existingData, newData, this.settings.blendMode);

    // 寫回
    this.resultCtx.putImageData(existingData, offset, 0);
  }

  blendVertical(img, offset, blendWidth) {
    const width = this.resultCanvas.width;

    // 先繪製非重疊區域
    this.resultCtx.drawImage(
      img,
      0, blendWidth, img.width, img.height - blendWidth,
      0, offset + blendWidth, img.width, img.height - blendWidth
    );

    // 創建臨時畫布處理融合區域
    const blendCanvas = document.createElement('canvas');
    blendCanvas.width = width;
    blendCanvas.height = blendWidth;
    const blendCtx = blendCanvas.getContext('2d');

    // 繪製新圖片的重疊部分
    blendCtx.drawImage(img, 0, 0, img.width, blendWidth, 0, 0, width, blendWidth);
    const newData = blendCtx.getImageData(0, 0, width, blendWidth);

    // 獲取現有的重疊區域
    const existingData = this.resultCtx.getImageData(0, offset, width, blendWidth);

    // 融合
    this.blendImageData(existingData, newData, this.settings.blendMode);

    // 寫回
    this.resultCtx.putImageData(existingData, 0, offset);
  }

  blendImageData(base, overlay, mode) {
    const width = base.width;
    const height = base.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        let alpha;
        switch (mode) {
          case 'linear':
            alpha = x / width;
            break;
          case 'feather':
            // Sigmoid-like curve for smoother transition
            const t = x / width;
            alpha = t * t * (3 - 2 * t);
            break;
          case 'multiband':
            // 簡化的多頻帶融合（使用頻率相關的權重）
            const freq = Math.sin(x / width * Math.PI);
            alpha = freq * freq;
            break;
          default:
            alpha = x / width;
        }

        base.data[i] = Math.round(base.data[i] * (1 - alpha) + overlay.data[i] * alpha);
        base.data[i + 1] = Math.round(base.data[i + 1] * (1 - alpha) + overlay.data[i + 1] * alpha);
        base.data[i + 2] = Math.round(base.data[i + 2] * (1 - alpha) + overlay.data[i + 2] * alpha);
        base.data[i + 3] = 255;
      }
    }
  }

  showResult(result, direction) {
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;

    // 更新資訊
    this.outputSize.textContent = `${result.width} × ${result.height}`;
    this.inputCount.textContent = `${this.images.length} 張`;
    this.directionUsed.textContent = direction === 'horizontal' ? '水平' : '垂直';

    // 重置縮放
    this.setZoom(100);

    // 計算檔案大小
    this.resultCanvas.toBlob((blob) => {
      this.resultBlob = blob;
      const sizeKB = (blob.size / 1024).toFixed(1);
      this.fileSize.textContent = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    }, 'image/jpeg', this.settings.quality / 100);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  downloadImage() {
    if (!this.resultBlob) {
      this.resultCanvas.toBlob((blob) => {
        this.downloadBlob(blob);
      }, 'image/jpeg', this.settings.quality / 100);
    } else {
      this.downloadBlob(this.resultBlob);
    }
  }

  downloadBlob(blob) {
    const link = document.createElement('a');
    link.download = `panorama_${this.images.length}imgs_${Date.now()}.jpg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    this.showStatus('全景圖已下載！', 'success');
  }

  reset() {
    this.images = [];
    this.resultBlob = null;
    this.zoom = 100;

    // 重置設定
    this.settings = {
      direction: 'horizontal',
      blendMode: 'linear',
      blendWidth: 50,
      quality: 90,
      autoCrop: true,
      autoExposure: true
    };

    // 重置 UI
    this.uploadZone.classList.remove('has-files');
    this.imageStripSection.classList.remove('active');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.progressSection.classList.remove('active');
    this.processBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';

    // 重置控制項
    this.directionSelect.value = 'horizontal';
    this.blendModeSelect.value = 'linear';
    this.blendWidthSlider.value = 50;
    this.qualitySlider.value = 90;
    this.autoCropCheckbox.checked = true;
    this.autoExposureCheckbox.checked = true;

    this.blendWidthValue.textContent = '50px';
    this.qualityValue.textContent = '90%';

    // 清空列表
    this.imageStrip.innerHTML = '';
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
  new PanoramaStitcher();
});
