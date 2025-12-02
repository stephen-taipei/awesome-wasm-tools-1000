/**
 * IMG-008: TIFF Converter
 *
 * Converts TIFF (Tagged Image File Format) images to other formats.
 * Supports multi-page TIFF files with page selection.
 *
 * Technical Implementation:
 * 1. Use UTIF.js library to decode TIFF files (handles compression, multi-page)
 * 2. Render decoded pages to Canvas
 * 3. Export to target format (PNG, JPG, WebP)
 *
 * TIFF Format Features:
 * - Supports multiple pages in a single file
 * - Various compression methods (LZW, ZIP, JPEG, etc.)
 * - High color depth (8/16/32 bit)
 * - Multiple color spaces (RGB, CMYK, Grayscale)
 *
 * Performance Characteristics:
 * - Memory: page count × image size
 * - Processing time: 2-5 seconds per page
 * - Uses UTIF.js (~50KB) for TIFF decoding
 */

class TiffConverter {
  constructor() {
    this.originalFile = null;
    this.convertedBlobs = [];
    this.quality = 0.92;
    this.outputFormat = 'png';
    this.tiffPages = [];
    this.selectedPage = 'all';

    this.init();
  }

  init() {
    // DOM Elements
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.qualitySlider = document.getElementById('qualitySlider');
    this.qualityValue = document.getElementById('qualityValue');
    this.qualityRow = document.getElementById('qualityRow');
    this.pageSelectRow = document.getElementById('pageSelectRow');
    this.pageSelect = document.getElementById('pageSelect');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.downloadBtnText = document.getElementById('downloadBtnText');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.multiPagePreview = document.getElementById('multiPagePreview');
    this.pageList = document.getElementById('pageList');
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
    this.compressionRatio = document.getElementById('compressionRatio');
    this.imageResolution = document.getElementById('imageResolution');
    this.pageCount = document.getElementById('pageCount');

    this.bindEvents();
    this.updateQualityVisibility();
  }

  bindEvents() {
    // File upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop events
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

    // Output format selection
    this.outputFormatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.updateQualityVisibility();
      this.updateDownloadButtonText();
    });

    // Page selection
    this.pageSelect.addEventListener('change', (e) => {
      this.selectedPage = e.target.value;
    });

    // Quality slider
    this.qualitySlider.addEventListener('input', (e) => {
      this.quality = e.target.value / 100;
      this.qualityValue.textContent = `${e.target.value}%`;
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateQualityVisibility() {
    if (this.outputFormat === 'png') {
      this.qualityRow.style.display = 'none';
    } else {
      this.qualityRow.style.display = 'flex';
    }
  }

  updateDownloadButtonText() {
    const formatNames = {
      'png': 'PNG',
      'jpg': 'JPG',
      'webp': 'WebP'
    };
    this.downloadBtnText.textContent = `下載 ${formatNames[this.outputFormat]}`;
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    // Validate file type
    const isTiff = file.type === 'image/tiff' ||
                   file.name.toLowerCase().endsWith('.tiff') ||
                   file.name.toLowerCase().endsWith('.tif');

    if (!isTiff) {
      this.showStatus('error', '請選擇 TIFF/TIF 格式的圖片');
      return;
    }

    this.originalFile = file;
    this.originalSize.textContent = this.formatFileSize(file.size);
    this.loadTiff(file);
  }

  async loadTiff(file) {
    this.showStatus('info', '正在解析 TIFF 檔案...');
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取檔案...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.updateProgress(30, '解碼 TIFF...');

      // Check if UTIF is loaded
      if (typeof UTIF === 'undefined') {
        throw new Error('UTIF 函式庫尚未載入，請重新整理頁面');
      }

      // Decode TIFF
      const ifds = UTIF.decode(arrayBuffer);
      this.updateProgress(50, '處理頁面...');

      if (ifds.length === 0) {
        throw new Error('無法解析 TIFF 檔案，檔案可能已損壞');
      }

      // Process each page
      this.tiffPages = [];
      for (let i = 0; i < ifds.length; i++) {
        UTIF.decodeImage(arrayBuffer, ifds[i]);
        const rgba = UTIF.toRGBA8(ifds[i]);

        this.tiffPages.push({
          width: ifds[i].width,
          height: ifds[i].height,
          rgba: rgba,
          ifd: ifds[i]
        });

        this.updateProgress(50 + (i / ifds.length) * 40, `處理頁面 ${i + 1}/${ifds.length}...`);
      }

      this.updateProgress(95, '準備預覽...');

      // Update page selector if multi-page
      this.updatePageSelector();

      // Show preview of first page
      this.showTiffPreview();

      this.updateProgress(100, '載入完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.convertBtn.disabled = false;
        this.showStatus('success', `已載入: ${file.name} (${this.tiffPages.length} 頁)`);
      }, 500);

    } catch (error) {
      console.error('TIFF loading error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', error.message || '載入 TIFF 失敗，請確認檔案格式正確');
    }
  }

  updatePageSelector() {
    // Clear existing options
    this.pageSelect.innerHTML = '';

    if (this.tiffPages.length > 1) {
      // Add "all pages" option
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = `全部頁面 (${this.tiffPages.length} 頁)`;
      this.pageSelect.appendChild(allOption);

      // Add individual page options
      for (let i = 0; i < this.tiffPages.length; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = `第 ${i + 1} 頁 (${this.tiffPages[i].width}×${this.tiffPages[i].height})`;
        this.pageSelect.appendChild(option);
      }

      this.pageSelectRow.style.display = 'flex';
    } else {
      this.pageSelectRow.style.display = 'none';
    }
  }

  showTiffPreview() {
    if (this.tiffPages.length === 0) return;

    // Show first page as preview
    const firstPage = this.tiffPages[0];
    const canvas = this.createCanvasFromPage(firstPage);
    this.originalImage.src = canvas.toDataURL('image/png');

    // Update info
    this.imageResolution.textContent = `${firstPage.width} × ${firstPage.height} px`;
    this.pageCount.textContent = `${this.tiffPages.length} 頁`;

    this.previewArea.style.display = 'grid';

    // Show multi-page preview if more than 1 page
    if (this.tiffPages.length > 1) {
      this.showMultiPagePreview();
    }
  }

  showMultiPagePreview() {
    this.pageList.innerHTML = '';

    for (let i = 0; i < this.tiffPages.length; i++) {
      const page = this.tiffPages[i];
      const canvas = this.createCanvasFromPage(page, 150); // Thumbnail size

      const pageItem = document.createElement('div');
      pageItem.className = 'page-item';
      pageItem.innerHTML = `
        <img src="${canvas.toDataURL('image/png')}" alt="Page ${i + 1}">
        <span>第 ${i + 1} 頁</span>
        <span class="page-size">${page.width}×${page.height}</span>
      `;

      pageItem.addEventListener('click', () => {
        this.pageSelect.value = i.toString();
        this.selectedPage = i.toString();
        // Update main preview
        const fullCanvas = this.createCanvasFromPage(page);
        this.originalImage.src = fullCanvas.toDataURL('image/png');
        this.imageResolution.textContent = `${page.width} × ${page.height} px`;
      });

      this.pageList.appendChild(pageItem);
    }

    this.multiPagePreview.style.display = 'block';
  }

  createCanvasFromPage(page, maxSize = null) {
    let width = page.width;
    let height = page.height;

    // Scale down for thumbnails
    if (maxSize && (width > maxSize || height > maxSize)) {
      const scale = maxSize / Math.max(width, height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext('2d');

    // Create ImageData from RGBA array
    const imageData = new ImageData(
      new Uint8ClampedArray(page.rgba),
      page.width,
      page.height
    );
    ctx.putImageData(imageData, 0, 0);

    // If we need to scale, create a new canvas
    if (maxSize && (page.width > maxSize || page.height > maxSize)) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = width;
      scaledCanvas.height = height;
      const scaledCtx = scaledCanvas.getContext('2d');
      scaledCtx.drawImage(canvas, 0, 0, width, height);
      return scaledCanvas;
    }

    return canvas;
  }

  async convert() {
    if (this.tiffPages.length === 0) {
      this.showStatus('error', '請先選擇 TIFF 圖片');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;
    this.convertedBlobs = [];

    try {
      const pagesToConvert = this.selectedPage === 'all'
        ? this.tiffPages
        : [this.tiffPages[parseInt(this.selectedPage)]];

      const totalPages = pagesToConvert.length;

      for (let i = 0; i < pagesToConvert.length; i++) {
        const page = pagesToConvert[i];
        const progress = (i / totalPages) * 80 + 10;
        this.updateProgress(progress, `轉換頁面 ${i + 1}/${totalPages}...`);

        const canvas = this.createCanvasFromPage(page);

        // For JPG, fill white background
        if (this.outputFormat === 'jpg') {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.fillStyle = '#FFFFFF';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvas, 0, 0);

          const blob = await this.canvasToBlob(tempCanvas);
          this.convertedBlobs.push(blob);
        } else {
          const blob = await this.canvasToBlob(canvas);
          this.convertedBlobs.push(blob);
        }
      }

      this.updateProgress(95, '完成中...');

      // Show preview of first converted image
      if (this.convertedBlobs.length > 0) {
        const convertedUrl = URL.createObjectURL(this.convertedBlobs[0]);
        this.convertedImage.src = convertedUrl;

        const totalSize = this.convertedBlobs.reduce((sum, blob) => sum + blob.size, 0);
        this.convertedSize.textContent = this.formatFileSize(totalSize);

        // Performance info
        const endTime = performance.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);
        const sizeChange = ((1 - totalSize / this.originalFile.size) * 100).toFixed(1);

        this.processTime.textContent = `${processingTime} 秒`;
        this.compressionRatio.textContent = sizeChange > 0
          ? `${sizeChange}% 減少`
          : `${Math.abs(sizeChange)}% 增加`;
        this.performanceInfo.style.display = 'block';
      }

      this.updateProgress(100, '轉換完成！');
      this.updateDownloadButtonText();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `轉換完成！共 ${this.convertedBlobs.length} 張圖片`);
        this.downloadBtn.style.display = 'inline-flex';

        // Show download all button for multi-page
        if (this.convertedBlobs.length > 1) {
          this.downloadAllBtn.style.display = 'inline-flex';
        }

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

  canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      const mimeType = this.getMimeType(this.outputFormat);
      const quality = this.outputFormat === 'png' ? undefined : this.quality;

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        mimeType,
        quality
      );
    });
  }

  getMimeType(format) {
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'webp': 'image/webp'
    };
    return mimeTypes[format] || 'image/png';
  }

  getFileExtension(format) {
    return format === 'jpg' ? 'jpg' : format;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (this.convertedBlobs.length === 0) return;

    const originalName = this.originalFile.name.replace(/\.(tiff?|tif)$/i, '');
    const extension = this.getFileExtension(this.outputFormat);

    // Download first or selected page
    const pageIndex = this.selectedPage === 'all' ? 0 : parseInt(this.selectedPage);
    const suffix = this.convertedBlobs.length > 1 ? `_page${pageIndex + 1}` : '';
    const filename = `${originalName}${suffix}.${extension}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlobs[0]);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  async downloadAll() {
    if (this.convertedBlobs.length <= 1) {
      this.download();
      return;
    }

    // For multi-page, download as individual files
    // In a real implementation, you'd use JSZip to create a ZIP file
    const originalName = this.originalFile.name.replace(/\.(tiff?|tif)$/i, '');
    const extension = this.getFileExtension(this.outputFormat);

    for (let i = 0; i < this.convertedBlobs.length; i++) {
      const filename = `${originalName}_page${i + 1}.${extension}`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(this.convertedBlobs[i]);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.showStatus('success', `已下載 ${this.convertedBlobs.length} 張圖片`);
  }

  reset() {
    // Clear state
    this.fileInput.value = '';
    this.originalFile = null;
    this.convertedBlobs = [];
    this.tiffPages = [];
    this.selectedPage = 'all';

    // Reset UI
    this.originalImage.src = '';
    this.convertedImage.src = '';
    this.originalSize.textContent = '-';
    this.convertedSize.textContent = '-';
    this.previewArea.style.display = 'none';
    this.multiPagePreview.style.display = 'none';
    this.pageList.innerHTML = '';
    this.downloadBtn.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.pageSelectRow.style.display = 'none';

    // Reset settings
    this.outputFormatSelect.value = 'png';
    this.outputFormat = 'png';
    this.qualitySlider.value = 92;
    this.qualityValue.textContent = '92%';
    this.quality = 0.92;
    this.updateQualityVisibility();
    this.pageCount.textContent = '-';
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

// Initialize converter when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.converter = new TiffConverter();
});

export default TiffConverter;
