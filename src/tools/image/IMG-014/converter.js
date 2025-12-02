/**
 * IMG-014: Smart Image Compression
 *
 * Automatically analyzes image content and selects optimal compression strategy.
 * Chooses between PNG, JPG, and WebP based on image characteristics.
 *
 * Technical Implementation:
 * 1. Analyze image type (photo, illustration, screenshot, icon)
 * 2. Evaluate color complexity and transparency
 * 3. Determine optimal format and quality
 * 4. Apply compression with chosen settings
 *
 * Analysis Factors:
 * - Color distribution and count
 * - Edge sharpness and texture density
 * - Transparency presence
 * - Image dimensions
 *
 * Performance: 3-6 seconds including analysis
 */

class SmartCompressor {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.compressionGoal = 'balanced';
    this.analysis = null;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.compressionGoalSelect = document.getElementById('compressionGoal');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadBtnText = document.getElementById('downloadBtnText');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.analysisPanel = document.getElementById('analysisPanel');
    this.originalImage = document.getElementById('originalImage');
    this.convertedImage = document.getElementById('convertedImage');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Analysis elements
    this.imageType = document.getElementById('imageType');
    this.colorComplexity = document.getElementById('colorComplexity');
    this.recommendedFormat = document.getElementById('recommendedFormat');
    this.recommendedQuality = document.getElementById('recommendedQuality');
    this.estimatedSaving = document.getElementById('estimatedSaving');

    // Result elements
    this.processTime = document.getElementById('processTime');
    this.originalSizeInfo = document.getElementById('originalSizeInfo');
    this.compressedSizeInfo = document.getElementById('compressedSizeInfo');
    this.savedSpace = document.getElementById('savedSpace');
    this.usedFormat = document.getElementById('usedFormat');
    this.usedQuality = document.getElementById('usedQuality');

    this.bindEvents();
  }

  bindEvents() {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    this.compressionGoalSelect.addEventListener('change', (e) => {
      this.compressionGoal = e.target.value;
      if (this.analysis) {
        this.updateRecommendations();
      }
    });

    this.convertBtn.addEventListener('click', () => this.compress());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  async processFile(file) {
    if (!file.type.match('image/(png|jpeg|webp)')) {
      this.showStatus('error', '請選擇 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;
    this.showStatus('info', '正在分析圖片...');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImage.src = e.target.result;
      this.originalSize.textContent = this.formatFileSize(file.size);
      this.previewArea.style.display = 'grid';
    };
    reader.readAsDataURL(file);

    // Analyze image
    await this.analyzeImage(file);
  }

  async analyzeImage(file) {
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '分析圖片...');

    try {
      const img = await this.loadImage(file);

      this.updateProgress(30, '分析色彩...');

      // Create analysis canvas
      const sampleSize = Math.min(200, img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      this.updateProgress(50, '分析特徵...');

      // Analyze colors
      const colors = new Set();
      let hasTransparency = false;
      let totalSaturation = 0;
      let edgeCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Quantize colors for counting
        const qr = Math.floor(r / 16);
        const qg = Math.floor(g / 16);
        const qb = Math.floor(b / 16);
        colors.add(`${qr},${qg},${qb}`);

        if (a < 255) hasTransparency = true;

        // Calculate saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max > 0) {
          totalSaturation += (max - min) / max;
        }
      }

      this.updateProgress(70, '判斷類型...');

      // Detect edges (simple gradient detection)
      for (let y = 1; y < sampleSize - 1; y++) {
        for (let x = 1; x < sampleSize - 1; x++) {
          const idx = (y * sampleSize + x) * 4;
          const idxRight = idx + 4;
          const idxDown = idx + sampleSize * 4;

          const gradX = Math.abs(data[idx] - data[idxRight]);
          const gradY = Math.abs(data[idx] - data[idxDown]);

          if (gradX > 30 || gradY > 30) edgeCount++;
        }
      }

      const pixelCount = sampleSize * sampleSize;
      const avgSaturation = totalSaturation / pixelCount;
      const edgeRatio = edgeCount / pixelCount;

      // Determine image type
      let imageType;
      if (colors.size < 50 && edgeRatio > 0.1) {
        imageType = 'icon';
      } else if (colors.size < 200 && edgeRatio > 0.15) {
        imageType = 'illustration';
      } else if (edgeRatio > 0.2 && avgSaturation < 0.3) {
        imageType = 'screenshot';
      } else {
        imageType = 'photo';
      }

      this.analysis = {
        imageType,
        colorCount: colors.size,
        hasTransparency,
        avgSaturation,
        edgeRatio,
        width: img.width,
        height: img.height,
        originalSize: file.size
      };

      this.updateProgress(90, '生成建議...');

      this.updateRecommendations();
      this.analysisPanel.style.display = 'block';

      this.updateProgress(100, '分析完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.convertBtn.disabled = false;
        this.showStatus('success', '分析完成，可以開始壓縮');
      }, 500);

    } catch (error) {
      console.error('Analysis error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '分析失敗');
    }
  }

  updateRecommendations() {
    if (!this.analysis) return;

    const { imageType, colorCount, hasTransparency, avgSaturation } = this.analysis;

    // Display image type
    const typeNames = {
      'photo': '📷 照片',
      'illustration': '🎨 插圖/圖形',
      'screenshot': '🖥️ 截圖',
      'icon': '🔷 圖示/標誌'
    };
    this.imageType.textContent = typeNames[imageType] || imageType;

    // Color complexity
    let complexity;
    if (colorCount < 100) complexity = '低 (少色彩)';
    else if (colorCount < 500) complexity = '中等';
    else complexity = '高 (豐富色彩)';
    this.colorComplexity.textContent = complexity;

    // Determine format and quality based on goal and image type
    let format, quality, estimatedSaving;

    switch (this.compressionGoal) {
      case 'quality':
        if (hasTransparency) {
          format = 'PNG';
          quality = 100;
          estimatedSaving = '10-20%';
        } else {
          format = 'WebP';
          quality = 95;
          estimatedSaving = '20-40%';
        }
        break;

      case 'size':
        format = 'WebP';
        quality = imageType === 'photo' ? 70 : 75;
        estimatedSaving = '70-85%';
        break;

      case 'web':
        format = 'WebP';
        quality = 85;
        estimatedSaving = '50-70%';
        break;

      case 'balanced':
      default:
        if (hasTransparency && imageType !== 'photo') {
          format = 'PNG';
          quality = 100;
          estimatedSaving = '10-30%';
        } else if (imageType === 'photo') {
          format = 'WebP';
          quality = 85;
          estimatedSaving = '50-70%';
        } else {
          format = 'WebP';
          quality = 90;
          estimatedSaving = '40-60%';
        }
    }

    this.recommendedFormat.textContent = format;
    this.recommendedQuality.textContent = format === 'PNG' ? '無損' : `${quality}%`;
    this.estimatedSaving.textContent = estimatedSaving;

    // Store for compression
    this.analysis.recommendedFormat = format.toLowerCase();
    this.analysis.recommendedQuality = quality / 100;
  }

  async compress() {
    if (!this.originalFile || !this.analysis) {
      this.showStatus('error', '請先選擇並分析圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.updateProgress(0, '開始壓縮...');
    this.convertBtn.disabled = true;

    try {
      const { recommendedFormat, recommendedQuality } = this.analysis;

      this.updateProgress(20, '載入圖片...');

      const img = await this.loadImage(this.originalFile);

      this.updateProgress(40, '處理中...');

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // Fill background for JPG
      if (recommendedFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      this.updateProgress(60, `壓縮為 ${recommendedFormat.toUpperCase()}...`);

      let mimeType;
      switch (recommendedFormat) {
        case 'jpg': mimeType = 'image/jpeg'; break;
        case 'webp': mimeType = 'image/webp'; break;
        default: mimeType = 'image/png';
      }

      const quality = recommendedFormat === 'png' ? undefined : recommendedQuality;

      this.convertedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.updateProgress(90, '完成中...');

      // Show preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      this.convertedImage.src = convertedUrl;
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);

      // Update download button text
      this.downloadBtnText.textContent = `下載 ${recommendedFormat.toUpperCase()}`;

      // Calculate stats
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);
      const savedBytes = this.originalFile.size - this.convertedBlob.size;
      const savedPercent = ((savedBytes / this.originalFile.size) * 100).toFixed(1);

      this.processTime.textContent = `${processingTime} 秒`;
      this.originalSizeInfo.textContent = this.formatFileSize(this.originalFile.size);
      this.compressedSizeInfo.textContent = this.formatFileSize(this.convertedBlob.size);
      this.savedSpace.textContent = savedBytes > 0
        ? `${this.formatFileSize(savedBytes)} (${savedPercent}%)`
        : '無節省';
      this.usedFormat.textContent = recommendedFormat.toUpperCase();
      this.usedQuality.textContent = recommendedFormat === 'png' ? '無損' : `${Math.round(recommendedQuality * 100)}%`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '智慧壓縮完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '智慧壓縮完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Compression error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '壓縮失敗，請重試');
      this.convertBtn.disabled = false;
    }
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const { recommendedFormat } = this.analysis;
    const originalName = this.originalFile.name.replace(/\.[^.]+$/, '');
    const filename = `${originalName}_smart.${recommendedFormat}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.originalFile = null;
    this.convertedBlob = null;
    this.analysis = null;

    this.originalImage.src = '';
    this.convertedImage.src = '';
    this.originalSize.textContent = '-';
    this.convertedSize.textContent = '-';
    this.previewArea.style.display = 'none';
    this.analysisPanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    this.compressionGoalSelect.value = 'balanced';
    this.compressionGoal = 'balanced';
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.classList.remove('active');
      }, 3000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.converter = new SmartCompressor();
});

export default SmartCompressor;
