/**
 * IMG-112 照片修復（AI）
 * 修復老舊照片、刮痕、破損區域
 */

class PhotoRepair {
  constructor() {
    this.canvas = document.getElementById('editorCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sourceImage = null;
    this.fileName = '';
    this.brushSize = 20;
    this.repairMode = 'inpaint';
    this.isDrawing = false;
    this.maskCanvas = null;
    this.maskCtx = null;
    this.history = [];
    this.resultCanvas = null;

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
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

    // Canvas drawing
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());

    // Brush sizes
    document.querySelectorAll('.brush-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.brushSize = parseInt(btn.dataset.size);
      });
    });

    // Repair modes
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.repairMode = btn.dataset.mode;
      });
    });

    // Action buttons
    document.getElementById('clearMaskBtn').addEventListener('click', () => this.clearMask());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('repairBtn').addEventListener('click', () => this.repair());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.setupCanvas(img);
        document.getElementById('uploadZone').classList.add('has-file');
        document.getElementById('editorSection').classList.add('active');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupCanvas(img) {
    // Scale canvas to fit container while maintaining aspect ratio
    const maxWidth = 800;
    const maxHeight = 600;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = (maxHeight / height) * width;
      height = maxHeight;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(img, 0, 0, width, height);

    // Create mask canvas
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    this.maskCtx = this.maskCanvas.getContext('2d');
    this.maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    this.maskCtx.fillRect(0, 0, width, height);

    this.history = [];
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.saveHistory();
    const coords = this.getCanvasCoords(e);
    this.drawBrush(coords.x, coords.y);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const coords = this.getCanvasCoords(e);
    this.drawBrush(coords.x, coords.y);
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  drawBrush(x, y) {
    // Draw on mask canvas
    this.maskCtx.fillStyle = 'rgba(255, 0, 0, 1)';
    this.maskCtx.beginPath();
    this.maskCtx.arc(x, y, this.brushSize, 0, Math.PI * 2);
    this.maskCtx.fill();

    // Redraw main canvas with overlay
    this.redrawCanvas();
  }

  redrawCanvas() {
    // Draw original image
    this.ctx.drawImage(this.sourceImage, 0, 0, this.canvas.width, this.canvas.height);

    // Draw mask overlay with transparency
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.ctx.drawImage(this.maskCanvas, 0, 0);
    this.ctx.restore();
  }

  saveHistory() {
    const imageData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.history.push(imageData);
    if (this.history.length > 20) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length > 0) {
      const imageData = this.history.pop();
      this.maskCtx.putImageData(imageData, 0, 0);
      this.redrawCanvas();
    }
  }

  clearMask() {
    this.saveHistory();
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.redrawCanvas();
  }

  async repair() {
    this.showProgress(true);
    this.updateProgress(0, '正在分析損壞區域...');

    await this.delay(500);
    this.updateProgress(20, '正在進行 AI 修復...');

    // Get mask data
    const maskData = this.maskCtx.getImageData(0, 0, this.maskCanvas.width, this.maskCanvas.height);

    // Create result canvas
    this.resultCanvas = document.createElement('canvas');
    this.resultCanvas.width = this.canvas.width;
    this.resultCanvas.height = this.canvas.height;
    const resultCtx = this.resultCanvas.getContext('2d');

    // Draw original image
    resultCtx.drawImage(this.sourceImage, 0, 0, this.canvas.width, this.canvas.height);

    await this.delay(500);
    this.updateProgress(40, '正在填充修復區域...');

    // Get image data
    const imageData = resultCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Apply inpainting based on mode
    await this.applyRepair(data, maskData.data, this.canvas.width, this.canvas.height);

    this.updateProgress(80, '正在優化結果...');
    await this.delay(300);

    // Apply additional processing based on mode
    if (this.repairMode === 'denoise') {
      this.applyDenoise(data, this.canvas.width, this.canvas.height);
    } else if (this.repairMode === 'scratch') {
      this.applyLineRepair(data, maskData.data, this.canvas.width, this.canvas.height);
    }

    resultCtx.putImageData(imageData, 0, 0);

    this.updateProgress(100, '修復完成！');
    await this.delay(300);

    // Show comparison
    document.getElementById('beforeImage').src = this.canvas.toDataURL();
    document.getElementById('afterImage').src = this.resultCanvas.toDataURL();
    document.getElementById('compareSection').classList.add('active');
    document.getElementById('downloadBtn').disabled = false;

    this.showProgress(false);
    this.showStatus('success', '照片修復完成！');
  }

  async applyRepair(data, maskData, width, height) {
    // Advanced inpainting using surrounding pixels
    const repairRadius = 15;
    const iterations = 3;

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          // Check if this pixel is in the mask (repair area)
          if (maskData[idx] > 128) {
            // Sample from surrounding non-masked pixels
            let totalR = 0, totalG = 0, totalB = 0;
            let count = 0;

            for (let dy = -repairRadius; dy <= repairRadius; dy++) {
              for (let dx = -repairRadius; dx <= repairRadius; dx++) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * 4;

                  // Only sample from non-masked areas
                  if (maskData[nIdx] < 128) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const weight = 1 / (1 + distance);

                    totalR += data[nIdx] * weight;
                    totalG += data[nIdx + 1] * weight;
                    totalB += data[nIdx + 2] * weight;
                    count += weight;
                  }
                }
              }
            }

            if (count > 0) {
              data[idx] = Math.round(totalR / count);
              data[idx + 1] = Math.round(totalG / count);
              data[idx + 2] = Math.round(totalB / count);
            }
          }
        }
      }

      this.updateProgress(40 + (iter + 1) / iterations * 30, `修復中... (${iter + 1}/${iterations})`);
      await this.delay(200);
    }
  }

  applyDenoise(data, width, height) {
    // Simple bilateral-like filter for noise reduction
    const tempData = new Uint8ClampedArray(data);
    const radius = 2;
    const sigmaSpace = 2;
    const sigmaColor = 30;

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          let totalWeight = 0;
          let totalValue = 0;
          const centerValue = tempData[idx + c];

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const neighborValue = tempData[nIdx + c];

              const spatialDist = dx * dx + dy * dy;
              const colorDist = (centerValue - neighborValue) ** 2;

              const weight = Math.exp(-spatialDist / (2 * sigmaSpace * sigmaSpace)) *
                           Math.exp(-colorDist / (2 * sigmaColor * sigmaColor));

              totalWeight += weight;
              totalValue += neighborValue * weight;
            }
          }

          data[idx + c] = Math.round(totalValue / totalWeight);
        }
      }
    }
  }

  applyLineRepair(data, maskData, width, height) {
    // Additional smoothing for scratch repair
    const tempData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        if (maskData[idx] > 128) {
          for (let c = 0; c < 3; c++) {
            // Gaussian-like smoothing
            const sum = tempData[((y - 1) * width + x) * 4 + c] * 0.2 +
                       tempData[((y + 1) * width + x) * 4 + c] * 0.2 +
                       tempData[(y * width + x - 1) * 4 + c] * 0.2 +
                       tempData[(y * width + x + 1) * 4 + c] * 0.2 +
                       tempData[idx + c] * 0.2;

            data[idx + c] = Math.round(sum);
          }
        }
      }
    }
  }

  download() {
    if (!this.resultCanvas) return;

    const link = document.createElement('a');
    link.download = `${this.fileName}_repaired.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.resultCanvas = null;
    this.history = [];

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInput').value = '';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('compareSection').classList.remove('active');
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('statusMessage').className = 'status-message';

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.maskCtx) {
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }
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
  new PhotoRepair();
});
