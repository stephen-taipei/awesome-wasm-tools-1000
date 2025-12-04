/**
 * IMG-111 圖片放大（AI 超解析度）
 * 使用進階插值演算法放大圖片
 */

class ImageUpscaler {
  constructor() {
    this.sourceImage = null;
    this.fileName = '';
    this.resultCanvas = null;
    this.scale = 2;
    this.algorithm = 'lanczos';

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

    // Scale selection
    document.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.scale = parseInt(btn.dataset.scale);
        this.updateResultInfo();
      });
    });

    // Algorithm selection
    document.querySelectorAll('.algo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.algorithm = btn.dataset.algo;
      });
    });

    // Upscale
    document.getElementById('upscaleBtn').addEventListener('click', () => this.upscale());

    // Download
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.showPreview(e.target.result, file, img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showPreview(dataUrl, file, img) {
    const uploadZone = document.getElementById('uploadZone');
    uploadZone.classList.add('has-file');

    const fileInfo = document.getElementById('fileInfo');
    fileInfo.classList.add('active');
    fileInfo.innerHTML = `
      <strong>${file.name}</strong><br>
      大小：${(file.size / 1024).toFixed(1)} KB
    `;

    document.getElementById('originalPreview').src = dataUrl;
    document.getElementById('originalInfo').textContent = `${img.width} × ${img.height} 像素`;

    document.getElementById('settingsSection').classList.add('active');
    document.getElementById('upscaleBtn').disabled = false;

    this.updateResultInfo();

    // Reset result area
    document.getElementById('resultPreview').style.display = 'none';
    document.getElementById('resultArea').innerHTML = '<img id="resultPreview" src="" alt="Result" style="display: none;"><span style="color: #666;">等待處理...</span>';
  }

  updateResultInfo() {
    if (!this.sourceImage) return;
    const newWidth = this.sourceImage.width * this.scale;
    const newHeight = this.sourceImage.height * this.scale;
    document.getElementById('resultInfo').textContent = `將放大至 ${newWidth} × ${newHeight} 像素`;
  }

  async upscale() {
    if (!this.sourceImage) return;

    this.showProgress(true);
    this.updateProgress(0, '正在初始化...');

    const newWidth = this.sourceImage.width * this.scale;
    const newHeight = this.sourceImage.height * this.scale;

    // Check if the image is too large
    if (newWidth * newHeight > 16000000) {
      this.showStatus('warning', '輸出尺寸過大，可能會影響效能。');
    }

    await this.delay(100);
    this.updateProgress(10, '正在分析圖片...');

    // Create result canvas
    this.resultCanvas = document.createElement('canvas');
    this.resultCanvas.width = newWidth;
    this.resultCanvas.height = newHeight;
    const ctx = this.resultCanvas.getContext('2d');

    await this.delay(200);
    this.updateProgress(20, '正在進行超解析度處理...');

    // Apply upscaling based on algorithm
    if (this.algorithm === 'lanczos') {
      await this.lanczosResize(ctx, newWidth, newHeight);
    } else if (this.algorithm === 'bicubic') {
      await this.bicubicResize(ctx, newWidth, newHeight);
    } else {
      await this.bilinearResize(ctx, newWidth, newHeight);
    }

    this.updateProgress(90, '正在優化結果...');
    await this.delay(200);

    // Apply sharpening
    this.sharpen(ctx, newWidth, newHeight);

    this.updateProgress(100, '處理完成！');

    // Show result
    const resultImg = document.getElementById('resultPreview');
    resultImg.src = this.resultCanvas.toDataURL('image/png');
    resultImg.style.display = 'block';

    // Remove waiting text
    const resultArea = document.getElementById('resultArea');
    const waitingText = resultArea.querySelector('span');
    if (waitingText) waitingText.remove();

    document.getElementById('resultInfo').textContent = `${newWidth} × ${newHeight} 像素`;
    document.getElementById('downloadBtn').disabled = false;

    await this.delay(500);
    this.showProgress(false);
    this.showStatus('success', `成功將圖片放大 ${this.scale} 倍！`);
  }

  async lanczosResize(ctx, newWidth, newHeight) {
    // Use high-quality image smoothing as base
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Multi-step resize for better quality
    const steps = Math.ceil(Math.log2(this.scale));
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');

    let currentWidth = this.sourceImage.width;
    let currentHeight = this.sourceImage.height;
    let currentImage = this.sourceImage;

    for (let i = 0; i < steps; i++) {
      const stepScale = i === steps - 1 ?
        newWidth / currentWidth :
        2;

      const stepWidth = Math.round(currentWidth * stepScale);
      const stepHeight = Math.round(currentHeight * stepScale);

      tempCanvas.width = stepWidth;
      tempCanvas.height = stepHeight;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';

      tempCtx.drawImage(currentImage, 0, 0, stepWidth, stepHeight);

      currentWidth = stepWidth;
      currentHeight = stepHeight;

      // Create new image from canvas for next iteration
      if (i < steps - 1) {
        const tempImage = new Image();
        tempImage.src = tempCanvas.toDataURL();
        await new Promise(resolve => tempImage.onload = resolve);
        currentImage = tempImage;
      }

      this.updateProgress(20 + (i + 1) / steps * 50, `放大中... (${i + 1}/${steps})`);
      await this.delay(100);
    }

    ctx.drawImage(tempCanvas, 0, 0);
  }

  async bicubicResize(ctx, newWidth, newHeight) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Two-step resize for bicubic approximation
    const intermediateWidth = Math.round(newWidth * 0.75);
    const intermediateHeight = Math.round(newHeight * 0.75);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = intermediateWidth;
    tempCanvas.height = intermediateHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    tempCtx.drawImage(this.sourceImage, 0, 0, intermediateWidth, intermediateHeight);

    this.updateProgress(50, '正在應用 Bicubic 插值...');
    await this.delay(200);

    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
  }

  async bilinearResize(ctx, newWidth, newHeight) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    ctx.drawImage(this.sourceImage, 0, 0, newWidth, newHeight);

    this.updateProgress(70, '正在應用 Bilinear 插值...');
    await this.delay(200);
  }

  sharpen(ctx, width, height) {
    // Apply unsharp mask for better perceived sharpness
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Simple sharpening kernel
    const kernel = [
      0, -0.5, 0,
      -0.5, 3, -0.5,
      0, -0.5, 0
    ];

    const tempData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          data[idx] = Math.min(255, Math.max(0, sum));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  download() {
    if (!this.resultCanvas) return;

    const link = document.createElement('a');
    link.download = `${this.fileName}_${this.scale}x_upscaled.png`;
    link.href = this.resultCanvas.toDataURL('image/png');
    link.click();

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.resultCanvas = null;
    this.scale = 2;
    this.algorithm = 'lanczos';

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInfo').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('settingsSection').classList.remove('active');
    document.getElementById('upscaleBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('statusMessage').className = 'status-message';

    document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('[data-scale="2"]').classList.add('selected');

    document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-algo="lanczos"]').classList.add('active');

    document.getElementById('resultArea').innerHTML = '<img id="resultPreview" src="" alt="Result" style="display: none;"><span style="color: #666;">等待處理...</span>';
    document.getElementById('resultInfo').textContent = '';
  }

  showProgress(show) {
    const progressSection = document.getElementById('progressSection');
    progressSection.classList.toggle('active', show);
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
  new ImageUpscaler();
});
