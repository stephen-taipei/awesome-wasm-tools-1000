/**
 * IMG-060 圖片差異比較
 * 比較兩張圖片的差異並高亮顯示不同處
 */

class ImageDiffTool {
  constructor() {
    this.image1 = null;
    this.image2 = null;
    this.mode = 'diff';
    this.threshold = 10;
    this.diffColor = '#ff0000';
    this.diffResult = null;

    this.init();
  }

  init() {
    this.image1Upload = document.getElementById('image1Upload');
    this.image2Upload = document.getElementById('image2Upload');
    this.image1Input = document.getElementById('image1Input');
    this.image2Input = document.getElementById('image2Input');

    this.optionsPanel = document.getElementById('optionsPanel');
    this.resultSection = document.getElementById('resultSection');

    this.canvas1 = document.getElementById('canvas1');
    this.ctx1 = this.canvas1.getContext('2d');
    this.canvas2 = document.getElementById('canvas2');
    this.ctx2 = this.canvas2.getContext('2d');
    this.diffCanvas = document.getElementById('diffCanvas');
    this.diffCtx = this.diffCanvas.getContext('2d');
    this.diffStats = document.getElementById('diffStats');

    this.thresholdSlider = document.getElementById('thresholdSlider');
    this.thresholdValue = document.getElementById('thresholdValue');
    this.diffColorPicker = document.getElementById('diffColorPicker');

    this.compareBtn = document.getElementById('compareBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Image 1 upload
    this.image1Upload.addEventListener('click', () => this.image1Input.click());
    this.image1Upload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.image1Upload.classList.add('drag-over');
    });
    this.image1Upload.addEventListener('dragleave', () => {
      this.image1Upload.classList.remove('drag-over');
    });
    this.image1Upload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.image1Upload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file, 1);
    });
    this.image1Input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file, 1);
    });

    // Image 2 upload
    this.image2Upload.addEventListener('click', () => this.image2Input.click());
    this.image2Upload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.image2Upload.classList.add('drag-over');
    });
    this.image2Upload.addEventListener('dragleave', () => {
      this.image2Upload.classList.remove('drag-over');
    });
    this.image2Upload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.image2Upload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file, 2);
    });
    this.image2Input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file, 2);
    });

    // Mode options
    document.querySelectorAll('.mode-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.mode = el.dataset.mode;
        if (this.image1 && this.image2) {
          this.compare();
        }
      });
    });

    // Threshold slider
    this.thresholdSlider.addEventListener('input', () => {
      this.threshold = parseInt(this.thresholdSlider.value);
      this.thresholdValue.textContent = this.threshold;
      if (this.image1 && this.image2) {
        this.compare();
      }
    });

    // Diff color
    this.diffColorPicker.addEventListener('input', () => {
      this.diffColor = this.diffColorPicker.value;
      this.updateColorPresets();
      if (this.image1 && this.image2) {
        this.compare();
      }
    });

    document.querySelectorAll('.color-preset').forEach(el => {
      el.addEventListener('click', () => {
        this.diffColor = el.dataset.color;
        this.diffColorPicker.value = this.diffColor;
        this.updateColorPresets();
        if (this.image1 && this.image2) {
          this.compare();
        }
      });
    });

    // Buttons
    this.compareBtn.addEventListener('click', () => this.compare());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateColorPresets() {
    document.querySelectorAll('.color-preset').forEach(el => {
      el.classList.toggle('selected', el.dataset.color === this.diffColor);
    });
  }

  loadImage(file, num) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (num === 1) {
          this.image1 = { img, dataUrl: e.target.result };
          this.image1Upload.classList.add('has-image');
          this.image1Upload.innerHTML = `
            <span class="upload-label">圖片 A</span>
            <img src="${e.target.result}" alt="Image 1">
          `;
        } else {
          this.image2 = { img, dataUrl: e.target.result };
          this.image2Upload.classList.add('has-image');
          this.image2Upload.innerHTML = `
            <span class="upload-label">圖片 B</span>
            <img src="${e.target.result}" alt="Image 2">
          `;
        }
        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    const ready = this.image1 && this.image2;
    this.compareBtn.disabled = !ready;
    this.optionsPanel.style.display = ready ? 'block' : 'none';

    if (ready) {
      if (this.image1.img.width !== this.image2.img.width ||
          this.image1.img.height !== this.image2.img.height) {
        this.showStatus('info', '圖片尺寸不同，將自動調整至相同大小');
      }
    }
  }

  compare() {
    if (!this.image1 || !this.image2) return;

    // Determine common dimensions
    const width = Math.max(this.image1.img.width, this.image2.img.width);
    const height = Math.max(this.image1.img.height, this.image2.img.height);

    // Setup canvases
    this.canvas1.width = width;
    this.canvas1.height = height;
    this.canvas2.width = width;
    this.canvas2.height = height;
    this.diffCanvas.width = width;
    this.diffCanvas.height = height;

    // Draw images
    this.ctx1.fillStyle = '#ffffff';
    this.ctx1.fillRect(0, 0, width, height);
    this.ctx1.drawImage(this.image1.img, 0, 0);

    this.ctx2.fillStyle = '#ffffff';
    this.ctx2.fillRect(0, 0, width, height);
    this.ctx2.drawImage(this.image2.img, 0, 0);

    // Get pixel data
    const data1 = this.ctx1.getImageData(0, 0, width, height);
    const data2 = this.ctx2.getImageData(0, 0, width, height);

    // Compute diff based on mode
    let diffData;
    let diffCount = 0;

    switch (this.mode) {
      case 'diff':
        ({ diffData, diffCount } = this.computeDiffMask(data1, data2, width, height));
        break;
      case 'overlay':
        ({ diffData, diffCount } = this.computeOverlay(data1, data2, width, height));
        break;
      case 'sidebyside':
        ({ diffData, diffCount } = this.computeSideBySide(data1, data2, width, height));
        break;
    }

    this.diffCtx.putImageData(diffData, 0, 0);

    // Calculate stats
    const totalPixels = width * height;
    const diffPercent = ((diffCount / totalPixels) * 100).toFixed(2);

    this.diffStats.innerHTML = `
      差異像素：<span class="highlight">${diffCount.toLocaleString()}</span> / ${totalPixels.toLocaleString()}
      (<span class="highlight">${diffPercent}%</span>)
    `;

    this.diffResult = true;
    this.resultSection.style.display = 'block';
    this.downloadBtn.disabled = false;

    this.showStatus('success', `比較完成！發現 ${diffPercent}% 差異`);
  }

  computeDiffMask(data1, data2, width, height) {
    const diffData = this.diffCtx.createImageData(width, height);
    const diffPixels = diffData.data;
    const pixels1 = data1.data;
    const pixels2 = data2.data;

    const diffRgb = this.hexToRgb(this.diffColor);
    let diffCount = 0;

    for (let i = 0; i < pixels1.length; i += 4) {
      const r1 = pixels1[i], g1 = pixels1[i + 1], b1 = pixels1[i + 2];
      const r2 = pixels2[i], g2 = pixels2[i + 1], b2 = pixels2[i + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (diff > this.threshold * 3) {
        // Different - show diff color
        diffPixels[i] = diffRgb.r;
        diffPixels[i + 1] = diffRgb.g;
        diffPixels[i + 2] = diffRgb.b;
        diffPixels[i + 3] = 255;
        diffCount++;
      } else {
        // Same - show grayscale of original
        const gray = Math.round((r1 + g1 + b1) / 3);
        diffPixels[i] = gray;
        diffPixels[i + 1] = gray;
        diffPixels[i + 2] = gray;
        diffPixels[i + 3] = 255;
      }
    }

    return { diffData, diffCount };
  }

  computeOverlay(data1, data2, width, height) {
    const diffData = this.diffCtx.createImageData(width, height);
    const diffPixels = diffData.data;
    const pixels1 = data1.data;
    const pixels2 = data2.data;

    let diffCount = 0;

    for (let i = 0; i < pixels1.length; i += 4) {
      const r1 = pixels1[i], g1 = pixels1[i + 1], b1 = pixels1[i + 2];
      const r2 = pixels2[i], g2 = pixels2[i + 1], b2 = pixels2[i + 2];

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (diff > this.threshold * 3) {
        // Different - blend with tint
        diffPixels[i] = Math.round((r1 + r2) / 2);
        diffPixels[i + 1] = 0;
        diffPixels[i + 2] = Math.round((b1 + b2) / 2);
        diffPixels[i + 3] = 255;
        diffCount++;
      } else {
        // Same - average
        diffPixels[i] = Math.round((r1 + r2) / 2);
        diffPixels[i + 1] = Math.round((g1 + g2) / 2);
        diffPixels[i + 2] = Math.round((b1 + b2) / 2);
        diffPixels[i + 3] = 255;
      }
    }

    return { diffData, diffCount };
  }

  computeSideBySide(data1, data2, width, height) {
    // For side by side, we need a wider canvas
    const newWidth = width * 2 + 10;
    this.diffCanvas.width = newWidth;

    const diffData = this.diffCtx.createImageData(newWidth, height);
    const diffPixels = diffData.data;
    const pixels1 = data1.data;
    const pixels2 = data2.data;

    const diffRgb = this.hexToRgb(this.diffColor);
    let diffCount = 0;

    // Draw image 1 on left
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * newWidth + x) * 4;

        const r1 = pixels1[srcIdx], g1 = pixels1[srcIdx + 1], b1 = pixels1[srcIdx + 2];
        const r2 = pixels2[srcIdx], g2 = pixels2[srcIdx + 1], b2 = pixels2[srcIdx + 2];

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        const isDiff = diff > this.threshold * 3;

        if (isDiff) {
          // Highlight differences
          diffPixels[dstIdx] = Math.min(255, r1 + 50);
          diffPixels[dstIdx + 1] = Math.max(0, g1 - 50);
          diffPixels[dstIdx + 2] = Math.max(0, b1 - 50);
        } else {
          diffPixels[dstIdx] = r1;
          diffPixels[dstIdx + 1] = g1;
          diffPixels[dstIdx + 2] = b1;
        }
        diffPixels[dstIdx + 3] = 255;
      }
    }

    // Draw separator
    for (let y = 0; y < height; y++) {
      for (let x = width; x < width + 10; x++) {
        const dstIdx = (y * newWidth + x) * 4;
        diffPixels[dstIdx] = 50;
        diffPixels[dstIdx + 1] = 50;
        diffPixels[dstIdx + 2] = 50;
        diffPixels[dstIdx + 3] = 255;
      }
    }

    // Draw image 2 on right
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (y * newWidth + x + width + 10) * 4;

        const r1 = pixels1[srcIdx], g1 = pixels1[srcIdx + 1], b1 = pixels1[srcIdx + 2];
        const r2 = pixels2[srcIdx], g2 = pixels2[srcIdx + 1], b2 = pixels2[srcIdx + 2];

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        const isDiff = diff > this.threshold * 3;

        if (isDiff) {
          diffPixels[dstIdx] = Math.max(0, r2 - 50);
          diffPixels[dstIdx + 1] = Math.min(255, g2 + 50);
          diffPixels[dstIdx + 2] = Math.max(0, b2 - 50);
          diffCount++;
        } else {
          diffPixels[dstIdx] = r2;
          diffPixels[dstIdx + 1] = g2;
          diffPixels[dstIdx + 2] = b2;
        }
        diffPixels[dstIdx + 3] = 255;
      }
    }

    return { diffData, diffCount };
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 0, b: 0 };
  }

  download() {
    this.diffCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `diff_${this.mode}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '差異圖已下載');
    }, 'image/png');
  }

  reset() {
    this.image1 = null;
    this.image2 = null;
    this.diffResult = null;

    this.image1Input.value = '';
    this.image2Input.value = '';

    this.image1Upload.classList.remove('has-image');
    this.image1Upload.innerHTML = `
      <span class="upload-label">圖片 A</span>
      <div class="upload-icon">🖼️</div>
      <div class="upload-text">點擊或拖放第一張圖片</div>
      <div class="upload-hint">支援 PNG、JPG、WebP</div>
    `;

    this.image2Upload.classList.remove('has-image');
    this.image2Upload.innerHTML = `
      <span class="upload-label">圖片 B</span>
      <div class="upload-icon">🖼️</div>
      <div class="upload-text">點擊或拖放第二張圖片</div>
      <div class="upload-hint">支援 PNG、JPG、WebP</div>
    `;

    this.optionsPanel.style.display = 'none';
    this.resultSection.style.display = 'none';
    this.compareBtn.disabled = true;
    this.downloadBtn.disabled = true;

    this.threshold = 10;
    this.thresholdSlider.value = 10;
    this.thresholdValue.textContent = '10';

    this.mode = 'diff';
    document.querySelectorAll('.mode-option').forEach((el, i) => {
      el.classList.toggle('selected', i === 0);
    });

    this.ctx1.clearRect(0, 0, this.canvas1.width, this.canvas1.height);
    this.ctx2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
    this.diffCtx.clearRect(0, 0, this.diffCanvas.width, this.diffCanvas.height);
    this.diffStats.innerHTML = '';

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageDiffTool();
});
