/**
 * IMG-010: SVG to PNG Converter
 *
 * Converts SVG vector graphics to PNG raster images.
 * Supports custom output size and background color.
 *
 * Technical Implementation:
 * 1. Load SVG as Image element
 * 2. Render to Canvas at specified scale
 * 3. Export Canvas as PNG
 *
 * Features:
 * - Scale options: 1x, 2x, 3x, 4x, custom
 * - Background: transparent, white, black, custom color
 * - Preserves aspect ratio
 *
 * Performance: <2 seconds for most SVGs
 */

class SvgToPngConverter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.svgDimensions = { width: 0, height: 0 };
    this.scale = 2;
    this.customWidth = 1024;
    this.bgColor = 'transparent';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.scaleSelect = document.getElementById('scaleSelect');
    this.customSizeRow = document.getElementById('customSizeRow');
    this.customWidth = document.getElementById('customWidth');
    this.bgSelect = document.getElementById('bgSelect');
    this.customBgRow = document.getElementById('customBgRow');
    this.customBgColor = document.getElementById('customBgColor');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.originalImage = document.getElementById('originalImage');
    this.convertedImage = document.getElementById('convertedImage');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.svgDimensionsEl = document.getElementById('svgDimensions');
    this.outputDimensions = document.getElementById('outputDimensions');

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

    this.scaleSelect.addEventListener('change', (e) => {
      this.scale = e.target.value;
      this.customSizeRow.style.display = this.scale === 'custom' ? 'flex' : 'none';
    });

    this.bgSelect.addEventListener('change', (e) => {
      this.bgColor = e.target.value;
      this.customBgRow.style.display = this.bgColor === 'custom' ? 'flex' : 'none';
    });

    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

    if (!isSvg) {
      this.showStatus('error', '請選擇 SVG 格式的檔案');
      return;
    }

    this.originalFile = file;
    this.loadSvg(file);
  }

  async loadSvg(file) {
    this.showStatus('info', '正在載入 SVG...');

    try {
      const text = await file.text();

      // Parse SVG to get dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(text, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (!svgElement) {
        throw new Error('無效的 SVG 檔案');
      }

      // Get dimensions from viewBox or width/height attributes
      let width = 300, height = 150; // Default SVG size

      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/);
        if (parts.length >= 4) {
          width = parseFloat(parts[2]);
          height = parseFloat(parts[3]);
        }
      }

      const svgWidth = svgElement.getAttribute('width');
      const svgHeight = svgElement.getAttribute('height');

      if (svgWidth && !svgWidth.includes('%')) {
        width = parseFloat(svgWidth);
      }
      if (svgHeight && !svgHeight.includes('%')) {
        height = parseFloat(svgHeight);
      }

      this.svgDimensions = { width, height };

      // Show preview
      const blob = new Blob([text], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      this.originalImage.src = url;
      this.originalSize.textContent = this.formatFileSize(file.size);
      this.svgDimensionsEl.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
      this.previewArea.style.display = 'grid';

      this.convertBtn.disabled = false;
      this.showStatus('success', `已載入: ${file.name}`);

    } catch (error) {
      console.error('SVG loading error:', error);
      this.showStatus('error', error.message || '載入 SVG 失敗');
    }
  }

  async convert() {
    if (!this.originalFile) {
      this.showStatus('error', '請先選擇 SVG 檔案');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;

    try {
      this.updateProgress(20, '載入 SVG...');

      // Calculate output dimensions
      let outputWidth, outputHeight;

      if (this.scale === 'custom') {
        const customW = parseInt(this.customWidth.value) || 1024;
        const aspectRatio = this.svgDimensions.height / this.svgDimensions.width;
        outputWidth = customW;
        outputHeight = Math.round(customW * aspectRatio);
      } else {
        const scaleNum = parseFloat(this.scale);
        outputWidth = Math.round(this.svgDimensions.width * scaleNum);
        outputHeight = Math.round(this.svgDimensions.height * scaleNum);
      }

      this.updateProgress(40, '渲染圖片...');

      // Load SVG as image
      const svgText = await this.originalFile.text();
      const img = await this.loadSvgAsImage(svgText, outputWidth, outputHeight);

      this.updateProgress(60, '轉換為 PNG...');

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      // Fill background
      const bg = this.getBgColor();
      if (bg !== 'transparent') {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, outputWidth, outputHeight);
      }

      // Draw SVG
      ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

      this.updateProgress(80, '生成 PNG...');

      // Export as PNG
      this.convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      // Show preview
      const convertedUrl = URL.createObjectURL(this.convertedBlob);
      this.convertedImage.src = convertedUrl;
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);
      this.outputDimensions.textContent = `${outputWidth} × ${outputHeight} px`;

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '轉換完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.convertBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗，請重試');
      this.convertBtn.disabled = false;
    }
  }

  loadSvgAsImage(svgText, width, height) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load SVG as image'));

      // Create a blob URL for the SVG
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(blob);
    });
  }

  getBgColor() {
    switch (this.bgSelect.value) {
      case 'transparent': return 'transparent';
      case 'white': return '#ffffff';
      case 'black': return '#000000';
      case 'custom': return this.customBgColor.value;
      default: return 'transparent';
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.svg$/i, '');
    const filename = `${originalName}.png`;

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
    this.svgDimensions = { width: 0, height: 0 };

    this.originalImage.src = '';
    this.convertedImage.src = '';
    this.originalSize.textContent = '-';
    this.convertedSize.textContent = '-';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    this.scaleSelect.value = '2';
    this.scale = 2;
    this.customSizeRow.style.display = 'none';
    this.bgSelect.value = 'transparent';
    this.customBgRow.style.display = 'none';
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
  window.converter = new SvgToPngConverter();
});

export default SvgToPngConverter;
