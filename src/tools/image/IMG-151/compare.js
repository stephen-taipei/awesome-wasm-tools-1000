/**
 * IMG-151 圖片比較工具
 * Image Compare Tool
 */

class ImageCompare {
  constructor() {
    this.image1 = null;
    this.image2 = null;
    this.file1 = null;
    this.file2 = null;
    this.currentMode = 'slider';
    this.diffCanvas = null;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone1 = document.getElementById('uploadZone1');
    this.uploadZone2 = document.getElementById('uploadZone2');
    this.fileInput1 = document.getElementById('fileInput1');
    this.fileInput2 = document.getElementById('fileInput2');

    // Mode buttons
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.compareMode = document.getElementById('compareMode');

    // Slider elements
    this.sliderSection = document.getElementById('sliderSection');
    this.sliderCompare = document.getElementById('sliderCompare');
    this.sliderBase = document.getElementById('sliderBase');
    this.sliderTop = document.getElementById('sliderTop');
    this.sliderOverlay = document.getElementById('sliderOverlay');
    this.sliderHandle = document.getElementById('sliderHandle');

    // Side by side
    this.sideSection = document.getElementById('sideSection');
    this.sideImage1 = document.getElementById('sideImage1');
    this.sideImage2 = document.getElementById('sideImage2');

    // Fade
    this.fadeSection = document.getElementById('fadeSection');
    this.fadeBase = document.getElementById('fadeBase');
    this.fadeTop = document.getElementById('fadeTop');
    this.fadeOverlay = document.getElementById('fadeOverlay');
    this.fadeRange = document.getElementById('fadeRange');
    this.fadeValue = document.getElementById('fadeValue');

    // Diff
    this.diffSection = document.getElementById('diffSection');
    this.diffCanvas = document.getElementById('diffCanvas');
    this.diffPercent = document.getElementById('diffPercent');
    this.diffPixels = document.getElementById('diffPixels');
    this.matchPercent = document.getElementById('matchPercent');

    // Info
    this.imageInfo = document.getElementById('imageInfo');
    this.info1Size = document.getElementById('info1Size');
    this.info1Format = document.getElementById('info1Format');
    this.info1FileSize = document.getElementById('info1FileSize');
    this.info2Size = document.getElementById('info2Size');
    this.info2Format = document.getElementById('info2Format');
    this.info2FileSize = document.getElementById('info2FileSize');

    // Buttons
    this.swapBtn = document.getElementById('swapBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload zone 1
    this.uploadZone1.addEventListener('click', () => this.fileInput1.click());
    this.uploadZone1.addEventListener('dragover', (e) => this.handleDragOver(e, this.uploadZone1));
    this.uploadZone1.addEventListener('dragleave', (e) => this.handleDragLeave(e, this.uploadZone1));
    this.uploadZone1.addEventListener('drop', (e) => this.handleDrop(e, 1));
    this.fileInput1.addEventListener('change', (e) => this.handleFileSelect(e, 1));

    // Upload zone 2
    this.uploadZone2.addEventListener('click', () => this.fileInput2.click());
    this.uploadZone2.addEventListener('dragover', (e) => this.handleDragOver(e, this.uploadZone2));
    this.uploadZone2.addEventListener('dragleave', (e) => this.handleDragLeave(e, this.uploadZone2));
    this.uploadZone2.addEventListener('drop', (e) => this.handleDrop(e, 2));
    this.fileInput2.addEventListener('change', (e) => this.handleFileSelect(e, 2));

    // Mode buttons
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
      });
    });

    // Slider drag
    this.initSliderDrag();

    // Fade range
    this.fadeRange.addEventListener('input', (e) => {
      const value = e.target.value;
      this.fadeOverlay.style.opacity = value / 100;
      this.fadeValue.textContent = `${value}%`;
    });

    // Buttons
    this.swapBtn.addEventListener('click', () => this.swapImages());
    this.downloadBtn.addEventListener('click', () => this.downloadDiff());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e, zone) {
    e.preventDefault();
    zone.classList.add('dragover');
  }

  handleDragLeave(e, zone) {
    e.preventDefault();
    zone.classList.remove('dragover');
  }

  handleDrop(e, index) {
    e.preventDefault();
    const zone = index === 1 ? this.uploadZone1 : this.uploadZone2;
    zone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      this.loadImage(files[0], index);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e, index) {
    const files = e.target.files;
    if (files.length > 0) {
      this.loadImage(files[0], index);
    }
  }

  loadImage(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (index === 1) {
          this.image1 = img;
          this.file1 = file;
          this.uploadZone1.classList.add('has-file');
          this.updateInfo(1, img, file);
        } else {
          this.image2 = img;
          this.file2 = file;
          this.uploadZone2.classList.add('has-file');
          this.updateInfo(2, img, file);
        }

        if (this.image1 && this.image2) {
          this.updateCompare();
          this.swapBtn.disabled = false;
          this.downloadBtn.disabled = false;
          this.imageInfo.style.display = 'grid';
        }

        this.showStatus(`圖片 ${index === 1 ? 'A' : 'B'} 載入成功！`, 'success');
      };
      img.onerror = () => {
        this.showStatus('圖片載入失敗', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateInfo(index, img, file) {
    if (index === 1) {
      this.info1Size.textContent = `${img.width} × ${img.height}`;
      this.info1Format.textContent = file.type.split('/')[1].toUpperCase();
      this.info1FileSize.textContent = this.formatSize(file.size);
    } else {
      this.info2Size.textContent = `${img.width} × ${img.height}`;
      this.info2Format.textContent = file.type.split('/')[1].toUpperCase();
      this.info2FileSize.textContent = this.formatSize(file.size);
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  setMode(mode) {
    this.currentMode = mode;

    this.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Hide all sections
    this.sliderSection.classList.remove('active');
    this.sideSection.classList.remove('active');
    this.fadeSection.classList.remove('active');
    this.diffSection.classList.remove('active');

    // Show current section
    switch (mode) {
      case 'slider':
        this.sliderSection.classList.add('active');
        break;
      case 'side':
        this.sideSection.classList.add('active');
        break;
      case 'fade':
        this.fadeSection.classList.add('active');
        break;
      case 'diff':
        this.diffSection.classList.add('active');
        if (this.image1 && this.image2) {
          this.calculateDifference();
        }
        break;
    }
  }

  updateCompare() {
    if (!this.image1 || !this.image2) return;

    // Create data URLs
    const canvas1 = document.createElement('canvas');
    canvas1.width = this.image1.width;
    canvas1.height = this.image1.height;
    canvas1.getContext('2d').drawImage(this.image1, 0, 0);
    const url1 = canvas1.toDataURL();

    const canvas2 = document.createElement('canvas');
    canvas2.width = this.image2.width;
    canvas2.height = this.image2.height;
    canvas2.getContext('2d').drawImage(this.image2, 0, 0);
    const url2 = canvas2.toDataURL();

    // Update slider
    this.sliderBase.src = url1;
    this.sliderTop.src = url2;

    // Update side by side
    this.sideImage1.src = url1;
    this.sideImage2.src = url2;

    // Update fade
    this.fadeBase.src = url1;
    this.fadeTop.src = url2;

    // Calculate diff if in diff mode
    if (this.currentMode === 'diff') {
      this.calculateDifference();
    }
  }

  initSliderDrag() {
    let isDragging = false;

    const updateSlider = (x) => {
      const rect = this.sliderCompare.getBoundingClientRect();
      let percent = (x - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));

      this.sliderOverlay.style.width = `${percent * 100}%`;
      this.sliderHandle.style.left = `${percent * 100}%`;
    };

    this.sliderHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
    });

    this.sliderCompare.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateSlider(e.clientX);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateSlider(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch events
    this.sliderHandle.addEventListener('touchstart', (e) => {
      isDragging = true;
      e.preventDefault();
    });

    this.sliderCompare.addEventListener('touchstart', (e) => {
      isDragging = true;
      updateSlider(e.touches[0].clientX);
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        updateSlider(e.touches[0].clientX);
      }
    });

    document.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  calculateDifference() {
    if (!this.image1 || !this.image2) return;

    // Create canvases for both images
    const width = Math.max(this.image1.width, this.image2.width);
    const height = Math.max(this.image1.height, this.image2.height);

    const canvas1 = document.createElement('canvas');
    canvas1.width = width;
    canvas1.height = height;
    const ctx1 = canvas1.getContext('2d');
    ctx1.drawImage(this.image1, 0, 0);
    const data1 = ctx1.getImageData(0, 0, width, height).data;

    const canvas2 = document.createElement('canvas');
    canvas2.width = width;
    canvas2.height = height;
    const ctx2 = canvas2.getContext('2d');
    ctx2.drawImage(this.image2, 0, 0);
    const data2 = ctx2.getImageData(0, 0, width, height).data;

    // Create diff canvas
    this.diffCanvas.width = width;
    this.diffCanvas.height = height;
    const diffCtx = this.diffCanvas.getContext('2d');
    const diffImageData = diffCtx.createImageData(width, height);
    const diffData = diffImageData.data;

    let diffPixelCount = 0;
    const totalPixels = width * height;
    const threshold = 30; // Difference threshold

    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (diff > threshold) {
        // Highlight difference in red
        diffData[i] = 255;
        diffData[i + 1] = 0;
        diffData[i + 2] = 0;
        diffData[i + 3] = 255;
        diffPixelCount++;
      } else {
        // Show original image in grayscale
        const gray = (r1 + g1 + b1) / 3;
        diffData[i] = gray * 0.3;
        diffData[i + 1] = gray * 0.3;
        diffData[i + 2] = gray * 0.3;
        diffData[i + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImageData, 0, 0);

    // Update stats
    const diffPercentValue = (diffPixelCount / totalPixels * 100).toFixed(2);
    const matchPercentValue = (100 - parseFloat(diffPercentValue)).toFixed(2);

    this.diffPercent.textContent = `${diffPercentValue}%`;
    this.diffPixels.textContent = diffPixelCount.toLocaleString();
    this.matchPercent.textContent = `${matchPercentValue}%`;
  }

  swapImages() {
    if (!this.image1 || !this.image2) return;

    // Swap images
    [this.image1, this.image2] = [this.image2, this.image1];
    [this.file1, this.file2] = [this.file2, this.file1];

    // Update info
    this.updateInfo(1, this.image1, this.file1);
    this.updateInfo(2, this.image2, this.file2);

    // Update compare views
    this.updateCompare();

    this.showStatus('已交換圖片', 'success');
  }

  downloadDiff() {
    if (!this.diffCanvas || this.diffCanvas.width === 0) {
      // Generate diff first
      this.calculateDifference();
    }

    const link = document.createElement('a');
    link.download = `diff_${Date.now()}.png`;
    link.href = this.diffCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('差異圖已下載！', 'success');
  }

  reset() {
    this.image1 = null;
    this.image2 = null;
    this.file1 = null;
    this.file2 = null;

    // Reset UI
    this.uploadZone1.classList.remove('has-file');
    this.uploadZone2.classList.remove('has-file');
    this.fileInput1.value = '';
    this.fileInput2.value = '';
    this.swapBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.imageInfo.style.display = 'none';

    // Reset images
    this.sliderBase.src = '';
    this.sliderTop.src = '';
    this.sideImage1.src = '';
    this.sideImage2.src = '';
    this.fadeBase.src = '';
    this.fadeTop.src = '';

    // Reset slider
    this.sliderOverlay.style.width = '50%';
    this.sliderHandle.style.left = '50%';

    // Reset fade
    this.fadeRange.value = 50;
    this.fadeOverlay.style.opacity = 0.5;
    this.fadeValue.textContent = '50%';

    // Reset diff
    const ctx = this.diffCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.diffCanvas.width, this.diffCanvas.height);
    this.diffPercent.textContent = '0%';
    this.diffPixels.textContent = '0';
    this.matchPercent.textContent = '100%';

    // Reset mode
    this.setMode('slider');

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
  new ImageCompare();
});
