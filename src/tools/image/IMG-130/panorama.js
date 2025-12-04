/**
 * IMG-130 圖片全景拼接
 * 多張圖片自動拼接成全景圖
 */

class PanoramaStitcher {
  constructor() {
    this.images = [];
    this.imageDataList = [];
    this.currentMode = 'horizontal';
    this.overlap = 20;
    this.blendWidth = 50;
    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
  }

  bindElements() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.imageList = document.getElementById('imageList');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.ctx = this.resultCanvas.getContext('2d');
    this.previewSection = document.getElementById('previewSection');
    this.progressSection = document.getElementById('progressSection');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.stitchBtn = document.getElementById('stitchBtn');
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

    document.getElementById('overlap').addEventListener('input', (e) => {
      this.overlap = parseInt(e.target.value);
      document.getElementById('overlapValue').textContent = `${this.overlap}%`;
    });

    document.getElementById('blendWidth').addEventListener('input', (e) => {
      this.blendWidth = parseInt(e.target.value);
      document.getElementById('blendWidthValue').textContent = this.blendWidth;
    });

    this.stitchBtn.addEventListener('click', () => this.stitch());
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    this.loadImages(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.loadImages(files);
  }

  loadImages(files) {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push({
            image: img,
            src: e.target.result
          });
          this.updateImageList();
          this.checkReadyState();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateImageList() {
    this.imageList.innerHTML = '';
    this.images.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.innerHTML = `
        <img src="${item.src}" alt="Image ${index + 1}">
        <button class="remove-btn" data-index="${index}">×</button>
        <span class="order">${index + 1}</span>
      `;
      this.imageList.appendChild(div);
    });

    // Bind remove buttons
    this.imageList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.images.splice(index, 1);
        this.updateImageList();
        this.checkReadyState();
      });
    });

    if (this.images.length > 0) {
      this.uploadZone.classList.add('has-file');
    } else {
      this.uploadZone.classList.remove('has-file');
    }
  }

  checkReadyState() {
    this.stitchBtn.disabled = this.images.length < 2;
    document.getElementById('sourceCount').textContent = `${this.images.length} 張`;
  }

  selectMode(item) {
    this.modeItems.forEach(m => m.classList.remove('active'));
    item.classList.add('active');
    this.currentMode = item.dataset.mode;
  }

  async stitch() {
    if (this.images.length < 2) {
      this.showStatus('請至少上傳2張圖片', 'error');
      return;
    }

    const startTime = performance.now();
    this.showProgress('準備圖片...', 0);
    this.stitchBtn.disabled = true;

    try {
      // Prepare image data
      this.imageDataList = [];
      for (let i = 0; i < this.images.length; i++) {
        const img = this.images[i].image;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.imageDataList.push({
          canvas,
          ctx,
          width: img.width,
          height: img.height,
          data: ctx.getImageData(0, 0, img.width, img.height)
        });
        this.showProgress(`載入圖片 ${i + 1}/${this.images.length}...`, (i + 1) / this.images.length * 20);
      }

      let result;

      switch (this.currentMode) {
        case 'horizontal':
          result = await this.horizontalStitch();
          document.getElementById('stitchMode').textContent = '水平拼接';
          break;
        case 'vertical':
          result = await this.verticalStitch();
          document.getElementById('stitchMode').textContent = '垂直拼接';
          break;
        case 'auto':
          result = await this.autoStitch();
          document.getElementById('stitchMode').textContent = '智能對齊';
          break;
      }

      this.resultCanvas.width = result.width;
      this.resultCanvas.height = result.height;
      this.ctx.putImageData(result.imageData, 0, 0);

      document.getElementById('outputSize').textContent = `${result.width} × ${result.height}`;

      const endTime = performance.now();
      document.getElementById('processTime').textContent =
        `${((endTime - startTime) / 1000).toFixed(2)} 秒`;

      this.hideProgress();
      this.previewSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('全景拼接完成！', 'success');

    } catch (error) {
      console.error('Stitch error:', error);
      this.showStatus('拼接失敗：' + error.message, 'error');
      this.hideProgress();
    }

    this.stitchBtn.disabled = false;
  }

  async horizontalStitch() {
    const numImages = this.imageDataList.length;
    const overlapPixels = Math.floor(this.imageDataList[0].width * this.overlap / 100);

    // Calculate total width
    let totalWidth = this.imageDataList[0].width;
    for (let i = 1; i < numImages; i++) {
      totalWidth += this.imageDataList[i].width - overlapPixels;
    }

    // Use max height
    const maxHeight = Math.max(...this.imageDataList.map(d => d.height));

    const result = new ImageData(totalWidth, maxHeight);

    this.showProgress('拼接圖片...', 30);

    let currentX = 0;

    for (let i = 0; i < numImages; i++) {
      const imgData = this.imageDataList[i];
      const yOffset = Math.floor((maxHeight - imgData.height) / 2);

      for (let y = 0; y < imgData.height; y++) {
        for (let x = 0; x < imgData.width; x++) {
          const srcIdx = (y * imgData.width + x) * 4;
          const dstX = currentX + x;
          const dstY = yOffset + y;
          const dstIdx = (dstY * totalWidth + dstX) * 4;

          // Check if in blend zone
          let blendFactor = 1;

          if (i > 0 && x < this.blendWidth) {
            // Left blend zone
            blendFactor = x / this.blendWidth;
          } else if (i < numImages - 1 && x >= imgData.width - this.blendWidth) {
            // Right blend zone
            blendFactor = (imgData.width - x) / this.blendWidth;
          }

          if (blendFactor < 1 && result.data[dstIdx + 3] > 0) {
            // Blend with existing pixel
            result.data[dstIdx] = result.data[dstIdx] * (1 - blendFactor) + imgData.data.data[srcIdx] * blendFactor;
            result.data[dstIdx + 1] = result.data[dstIdx + 1] * (1 - blendFactor) + imgData.data.data[srcIdx + 1] * blendFactor;
            result.data[dstIdx + 2] = result.data[dstIdx + 2] * (1 - blendFactor) + imgData.data.data[srcIdx + 2] * blendFactor;
            result.data[dstIdx + 3] = 255;
          } else {
            result.data[dstIdx] = imgData.data.data[srcIdx];
            result.data[dstIdx + 1] = imgData.data.data[srcIdx + 1];
            result.data[dstIdx + 2] = imgData.data.data[srcIdx + 2];
            result.data[dstIdx + 3] = imgData.data.data[srcIdx + 3];
          }
        }
      }

      currentX += imgData.width - overlapPixels;

      this.showProgress(`拼接圖片 ${i + 1}/${numImages}...`, 30 + (i + 1) / numImages * 60);
      await this.sleep(1);
    }

    return { imageData: result, width: totalWidth, height: maxHeight };
  }

  async verticalStitch() {
    const numImages = this.imageDataList.length;
    const overlapPixels = Math.floor(this.imageDataList[0].height * this.overlap / 100);

    // Calculate total height
    let totalHeight = this.imageDataList[0].height;
    for (let i = 1; i < numImages; i++) {
      totalHeight += this.imageDataList[i].height - overlapPixels;
    }

    // Use max width
    const maxWidth = Math.max(...this.imageDataList.map(d => d.width));

    const result = new ImageData(maxWidth, totalHeight);

    this.showProgress('拼接圖片...', 30);

    let currentY = 0;

    for (let i = 0; i < numImages; i++) {
      const imgData = this.imageDataList[i];
      const xOffset = Math.floor((maxWidth - imgData.width) / 2);

      for (let y = 0; y < imgData.height; y++) {
        for (let x = 0; x < imgData.width; x++) {
          const srcIdx = (y * imgData.width + x) * 4;
          const dstX = xOffset + x;
          const dstY = currentY + y;
          const dstIdx = (dstY * maxWidth + dstX) * 4;

          // Check if in blend zone
          let blendFactor = 1;

          if (i > 0 && y < this.blendWidth) {
            blendFactor = y / this.blendWidth;
          } else if (i < numImages - 1 && y >= imgData.height - this.blendWidth) {
            blendFactor = (imgData.height - y) / this.blendWidth;
          }

          if (blendFactor < 1 && result.data[dstIdx + 3] > 0) {
            result.data[dstIdx] = result.data[dstIdx] * (1 - blendFactor) + imgData.data.data[srcIdx] * blendFactor;
            result.data[dstIdx + 1] = result.data[dstIdx + 1] * (1 - blendFactor) + imgData.data.data[srcIdx + 1] * blendFactor;
            result.data[dstIdx + 2] = result.data[dstIdx + 2] * (1 - blendFactor) + imgData.data.data[srcIdx + 2] * blendFactor;
            result.data[dstIdx + 3] = 255;
          } else {
            result.data[dstIdx] = imgData.data.data[srcIdx];
            result.data[dstIdx + 1] = imgData.data.data[srcIdx + 1];
            result.data[dstIdx + 2] = imgData.data.data[srcIdx + 2];
            result.data[dstIdx + 3] = imgData.data.data[srcIdx + 3];
          }
        }
      }

      currentY += imgData.height - overlapPixels;

      this.showProgress(`拼接圖片 ${i + 1}/${numImages}...`, 30 + (i + 1) / numImages * 60);
      await this.sleep(1);
    }

    return { imageData: result, width: maxWidth, height: totalHeight };
  }

  async autoStitch() {
    // Auto-detect best alignment using feature matching
    const numImages = this.imageDataList.length;

    this.showProgress('分析圖片特徵...', 25);

    // For simplicity, detect if images are more suitable for horizontal or vertical stitch
    // based on aspect ratio comparison
    let horizontalScore = 0;
    let verticalScore = 0;

    for (let i = 0; i < numImages - 1; i++) {
      const current = this.imageDataList[i];
      const next = this.imageDataList[i + 1];

      // Compare edge similarities
      const rightEdge = this.getEdgeData(current, 'right');
      const leftEdge = this.getEdgeData(next, 'left');
      const bottomEdge = this.getEdgeData(current, 'bottom');
      const topEdge = this.getEdgeData(next, 'top');

      horizontalScore += this.compareEdges(rightEdge, leftEdge);
      verticalScore += this.compareEdges(bottomEdge, topEdge);
    }

    this.showProgress('選擇最佳拼接方式...', 40);

    // Choose best mode
    if (horizontalScore >= verticalScore) {
      return this.horizontalStitch();
    } else {
      return this.verticalStitch();
    }
  }

  getEdgeData(imgData, edge) {
    const width = imgData.width;
    const height = imgData.height;
    const data = imgData.data.data;
    const edgeSize = 20;
    const result = [];

    switch (edge) {
      case 'left':
        for (let y = 0; y < height; y++) {
          let sum = 0;
          for (let x = 0; x < edgeSize; x++) {
            const idx = (y * width + x) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
          result.push(sum / edgeSize);
        }
        break;
      case 'right':
        for (let y = 0; y < height; y++) {
          let sum = 0;
          for (let x = width - edgeSize; x < width; x++) {
            const idx = (y * width + x) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
          result.push(sum / edgeSize);
        }
        break;
      case 'top':
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let y = 0; y < edgeSize; y++) {
            const idx = (y * width + x) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
          result.push(sum / edgeSize);
        }
        break;
      case 'bottom':
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let y = height - edgeSize; y < height; y++) {
            const idx = (y * width + x) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
          result.push(sum / edgeSize);
        }
        break;
    }

    return result;
  }

  compareEdges(edge1, edge2) {
    // Use correlation coefficient
    const minLen = Math.min(edge1.length, edge2.length);
    if (minLen === 0) return 0;

    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < minLen; i++) {
      sum1 += edge1[i];
      sum2 += edge2[i];
    }
    const mean1 = sum1 / minLen;
    const mean2 = sum2 / minLen;

    let numerator = 0, denom1 = 0, denom2 = 0;
    for (let i = 0; i < minLen; i++) {
      const d1 = edge1[i] - mean1;
      const d2 = edge2[i] - mean2;
      numerator += d1 * d2;
      denom1 += d1 * d1;
      denom2 += d2 * d2;
    }

    const denom = Math.sqrt(denom1 * denom2);
    if (denom === 0) return 0;

    return numerator / denom;
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
    link.download = `panorama-${Date.now()}.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.images = [];
    this.imageDataList = [];
    this.imageList.innerHTML = '';
    this.ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
    this.uploadZone.classList.remove('has-file');
    this.previewSection.classList.remove('active');
    this.stitchBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.statusMessage.className = 'status-message';

    document.getElementById('sourceCount').textContent = '-';
    document.getElementById('outputSize').textContent = '-';
    document.getElementById('stitchMode').textContent = '-';
    document.getElementById('processTime').textContent = '-';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PanoramaStitcher();
});
