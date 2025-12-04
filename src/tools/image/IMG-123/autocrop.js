/**
 * IMG-123 圖片自動裁切
 * 智慧偵測主體並自動裁切
 */

class AutoCropper {
  constructor() {
    this.image = null;
    this.cropBounds = null;
    this.selectedMode = 'subject';

    this.init();
  }

  init() {
    this.canvas = document.getElementById('resultCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Mode selection
    document.querySelectorAll('.mode-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.mode-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.selectedMode = item.dataset.mode;
      });
    });

    // Sliders
    document.getElementById('padding').addEventListener('input', (e) => {
      document.getElementById('paddingValue').textContent = `${e.target.value} px`;
    });

    document.getElementById('tolerance').addEventListener('input', (e) => {
      document.getElementById('toleranceValue').textContent = e.target.value;
    });

    // Buttons
    document.getElementById('cropBtn').addEventListener('click', () => this.crop());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('cropBtn').disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async crop() {
    if (!this.image) return;

    this.showProgress(true);
    this.updateProgress(0, '正在分析圖片...');

    const padding = parseInt(document.getElementById('padding').value);
    const tolerance = parseInt(document.getElementById('tolerance').value);

    // Create temp canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.image.width;
    tempCanvas.height = this.image.height;
    tempCtx.drawImage(this.image, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    await this.delay(200);
    this.updateProgress(30, '正在偵測邊界...');

    // Detect crop bounds based on mode
    switch (this.selectedMode) {
      case 'subject':
        this.cropBounds = this.detectSubject(imageData, tolerance);
        break;
      case 'edges':
        this.cropBounds = this.detectEdges(imageData, tolerance);
        break;
      case 'content':
        this.cropBounds = this.detectContent(imageData, tolerance);
        break;
      case 'trim':
        this.cropBounds = this.detectTrim(imageData, tolerance);
        break;
      default:
        this.cropBounds = { x: 0, y: 0, width: this.image.width, height: this.image.height };
    }

    await this.delay(200);
    this.updateProgress(60, '正在套用邊距...');

    // Apply padding
    this.cropBounds.x = Math.max(0, this.cropBounds.x - padding);
    this.cropBounds.y = Math.max(0, this.cropBounds.y - padding);
    this.cropBounds.width = Math.min(
      this.image.width - this.cropBounds.x,
      this.cropBounds.width + padding * 2
    );
    this.cropBounds.height = Math.min(
      this.image.height - this.cropBounds.y,
      this.cropBounds.height + padding * 2
    );

    await this.delay(200);
    this.updateProgress(80, '正在裁切圖片...');

    // Perform crop
    this.canvas.width = this.cropBounds.width;
    this.canvas.height = this.cropBounds.height;
    this.ctx.drawImage(
      this.image,
      this.cropBounds.x, this.cropBounds.y,
      this.cropBounds.width, this.cropBounds.height,
      0, 0,
      this.cropBounds.width, this.cropBounds.height
    );

    this.updateProgress(100, '完成！');

    // Show overlay on original
    this.showCropOverlay();
    this.updateInfo();

    document.getElementById('previewSection').classList.add('active');
    document.getElementById('downloadBtn').disabled = false;

    await this.delay(200);
    this.showProgress(false);
    this.showStatus('success', '自動裁切完成！');
  }

  detectSubject(imageData, tolerance) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Calculate saliency map
    const saliency = new Float32Array(width * height);

    // Convert to grayscale and calculate local contrast
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // Calculate global mean
    let globalMean = 0;
    for (let i = 0; i < gray.length; i++) {
      globalMean += gray[i];
    }
    globalMean /= gray.length;

    // Calculate saliency based on deviation from mean
    const blockSize = 16;
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let blockSum = 0;
        let blockCount = 0;

        for (let by = y; by < Math.min(y + blockSize, height); by++) {
          for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
            blockSum += gray[by * width + bx];
            blockCount++;
          }
        }

        const blockMean = blockSum / blockCount;
        const sal = Math.abs(blockMean - globalMean) / 255;

        for (let by = y; by < Math.min(y + blockSize, height); by++) {
          for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
            saliency[by * width + bx] = sal;
          }
        }
      }
    }

    // Find bounding box of salient regions
    const threshold = 0.1 + (tolerance / 100) * 0.3;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (saliency[y * width + x] > threshold) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX >= maxX || minY >= maxY) {
      return { x: 0, y: 0, width, height };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  detectEdges(imageData, tolerance) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale
    const gray = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    // Sobel edge detection
    const edges = new Float32Array(width * height);
    const threshold = 30 + (100 - tolerance);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        const gx = gray[idx - width - 1] - gray[idx - width + 1] +
                  2 * gray[idx - 1] - 2 * gray[idx + 1] +
                  gray[idx + width - 1] - gray[idx + width + 1];

        const gy = gray[idx - width - 1] + 2 * gray[idx - width] + gray[idx - width + 1] -
                  gray[idx + width - 1] - 2 * gray[idx + width] - gray[idx + width + 1];

        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Find bounding box of edges
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > threshold) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX >= maxX || minY >= maxY) {
      return { x: 0, y: 0, width, height };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  detectContent(imageData, tolerance) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Calculate variance in blocks
    const blockSize = 32;
    const variances = [];

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const pixels = [];

        for (let by = y; by < Math.min(y + blockSize, height); by++) {
          for (let bx = x; bx < Math.min(x + blockSize, width); bx++) {
            const idx = (by * width + bx) * 4;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            pixels.push(gray);
          }
        }

        const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
        const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;

        variances.push({ x, y, variance });
      }
    }

    // Find blocks with high variance (content)
    const threshold = 100 + (100 - tolerance) * 10;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (const block of variances) {
      if (block.variance > threshold) {
        minX = Math.min(minX, block.x);
        minY = Math.min(minY, block.y);
        maxX = Math.max(maxX, block.x + blockSize);
        maxY = Math.max(maxY, block.y + blockSize);
      }
    }

    if (minX >= maxX || minY >= maxY) {
      return { x: 0, y: 0, width, height };
    }

    return {
      x: minX,
      y: minY,
      width: Math.min(width, maxX) - minX,
      height: Math.min(height, maxY) - minY
    };
  }

  detectTrim(imageData, tolerance) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Get corner colors (background reference)
    const corners = [
      { x: 0, y: 0 },
      { x: width - 1, y: 0 },
      { x: 0, y: height - 1 },
      { x: width - 1, y: height - 1 }
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    for (const corner of corners) {
      const idx = (corner.y * width + corner.x) * 4;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
    }
    bgR /= 4;
    bgG /= 4;
    bgB /= 4;

    const toleranceValue = tolerance * 2.55;

    // Find boundaries
    let top = 0, bottom = height - 1, left = 0, right = width - 1;

    // Top
    topLoop:
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (Math.abs(data[idx] - bgR) > toleranceValue ||
            Math.abs(data[idx + 1] - bgG) > toleranceValue ||
            Math.abs(data[idx + 2] - bgB) > toleranceValue) {
          top = y;
          break topLoop;
        }
      }
    }

    // Bottom
    bottomLoop:
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (Math.abs(data[idx] - bgR) > toleranceValue ||
            Math.abs(data[idx + 1] - bgG) > toleranceValue ||
            Math.abs(data[idx + 2] - bgB) > toleranceValue) {
          bottom = y;
          break bottomLoop;
        }
      }
    }

    // Left
    leftLoop:
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        if (Math.abs(data[idx] - bgR) > toleranceValue ||
            Math.abs(data[idx + 1] - bgG) > toleranceValue ||
            Math.abs(data[idx + 2] - bgB) > toleranceValue) {
          left = x;
          break leftLoop;
        }
      }
    }

    // Right
    rightLoop:
    for (let x = width - 1; x >= 0; x--) {
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        if (Math.abs(data[idx] - bgR) > toleranceValue ||
            Math.abs(data[idx + 1] - bgG) > toleranceValue ||
            Math.abs(data[idx + 2] - bgB) > toleranceValue) {
          right = x;
          break rightLoop;
        }
      }
    }

    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1
    };
  }

  showCropOverlay() {
    const overlay = document.getElementById('cropOverlay');
    const originalImg = document.getElementById('originalImage');
    const area = document.getElementById('originalArea');

    // Wait for image to be displayed
    setTimeout(() => {
      const imgRect = originalImg.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();

      const scaleX = imgRect.width / this.image.width;
      const scaleY = imgRect.height / this.image.height;

      const offsetX = imgRect.left - areaRect.left;
      const offsetY = imgRect.top - areaRect.top;

      overlay.style.left = `${offsetX + this.cropBounds.x * scaleX}px`;
      overlay.style.top = `${offsetY + this.cropBounds.y * scaleY}px`;
      overlay.style.width = `${this.cropBounds.width * scaleX}px`;
      overlay.style.height = `${this.cropBounds.height * scaleY}px`;
      overlay.style.display = 'block';
    }, 100);
  }

  updateInfo() {
    const originalPixels = this.image.width * this.image.height;
    const croppedPixels = this.cropBounds.width * this.cropBounds.height;
    const reduction = ((1 - croppedPixels / originalPixels) * 100).toFixed(1);

    document.getElementById('originalSize').textContent =
      `${this.image.width} × ${this.image.height}`;
    document.getElementById('croppedSize').textContent =
      `${this.cropBounds.width} × ${this.cropBounds.height}`;
    document.getElementById('cropArea').textContent =
      `(${this.cropBounds.x}, ${this.cropBounds.y})`;
    document.getElementById('reduction').textContent = `${reduction}%`;
  }

  download() {
    const link = document.createElement('a');
    link.download = `autocrop_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    this.showStatus('success', '圖片已下載！');
  }

  reset() {
    this.image = null;
    this.cropBounds = null;

    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('cropBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('cropOverlay').style.display = 'none';
    document.getElementById('statusMessage').className = 'status-message';
  }

  showProgress(show) {
    document.getElementById('progressSection').classList.toggle('active', show);
  }

  updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new AutoCropper();
});
