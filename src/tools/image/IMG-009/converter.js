/**
 * IMG-009: ICO Converter
 *
 * Creates Windows ICO icon files from images.
 * Supports multiple sizes in a single ICO file.
 *
 * Technical Implementation:
 * 1. Load source image and resize to multiple dimensions
 * 2. Convert each size to PNG format
 * 3. Pack all sizes into ICO file format
 *
 * ICO File Structure:
 * - ICONDIR header (6 bytes)
 * - ICONDIRENTRY for each image (16 bytes each)
 * - Image data (PNG format for each size)
 *
 * Performance: ~1-2 seconds for typical icons
 */

class IcoConverter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.selectedSizes = [16, 32, 48, 256];

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.sizeOptions = document.getElementById('sizeOptions');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.originalImage = document.getElementById('originalImage');
    this.icoPreview = document.getElementById('icoPreview');
    this.originalSize = document.getElementById('originalSize');
    this.convertedSize = document.getElementById('convertedSize');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.imageResolution = document.getElementById('imageResolution');
    this.includedSizes = document.getElementById('includedSizes');

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

    // Size checkboxes
    this.sizeOptions.addEventListener('change', () => {
      this.updateSelectedSizes();
    });

    this.convertBtn.addEventListener('click', () => this.convert());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updateSelectedSizes() {
    const checkboxes = this.sizeOptions.querySelectorAll('input[type="checkbox"]:checked');
    this.selectedSizes = Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    if (!file.type.match('image/(png|jpeg|webp)')) {
      this.showStatus('error', '請選擇 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;
    this.showPreview(file);
    this.convertBtn.disabled = false;
    this.showStatus('info', `已載入: ${file.name}`);
  }

  showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImage.src = e.target.result;
      this.originalSize.textContent = this.formatFileSize(file.size);
      this.previewArea.style.display = 'grid';

      const img = new Image();
      img.onload = () => {
        this.imageResolution.textContent = `${img.width} × ${img.height} px`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async convert() {
    if (!this.originalFile) {
      this.showStatus('error', '請先選擇圖片');
      return;
    }

    if (this.selectedSizes.length === 0) {
      this.showStatus('error', '請至少選擇一個圖示尺寸');
      return;
    }

    const startTime = performance.now();

    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.convertBtn.disabled = true;

    try {
      this.updateProgress(10, '載入圖片...');

      const img = await this.loadImage(this.originalFile);
      const pngDataArray = [];

      // Generate each size
      for (let i = 0; i < this.selectedSizes.length; i++) {
        const size = this.selectedSizes[i];
        const progress = 10 + (i / this.selectedSizes.length) * 70;
        this.updateProgress(progress, `生成 ${size}×${size} 圖示...`);

        const pngData = await this.resizeToSize(img, size);
        pngDataArray.push({ size, data: pngData });
      }

      this.updateProgress(85, '打包 ICO 檔案...');

      // Create ICO file
      this.convertedBlob = this.createIcoBlob(pngDataArray);

      this.updateProgress(95, '生成預覽...');

      // Show preview
      this.showIcoPreview(pngDataArray);
      this.convertedSize.textContent = this.formatFileSize(this.convertedBlob.size);

      const endTime = performance.now();
      this.processTime.textContent = `${((endTime - startTime) / 1000).toFixed(2)} 秒`;
      this.includedSizes.textContent = this.selectedSizes.map(s => `${s}px`).join(', ');
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'ICO 圖示生成完成！');
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

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async resizeToSize(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image centered and scaled
    const scale = Math.min(size / img.width, size / img.height);
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;

    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    // Get PNG data
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }

  createIcoBlob(pngDataArray) {
    // Calculate total size
    const headerSize = 6;
    const dirEntrySize = 16;
    const totalDirSize = headerSize + (dirEntrySize * pngDataArray.length);

    let totalDataSize = 0;
    pngDataArray.forEach(item => {
      totalDataSize += item.data.length;
    });

    const buffer = new ArrayBuffer(totalDirSize + totalDataSize);
    const view = new DataView(buffer);

    // ICONDIR header
    view.setUint16(0, 0, true);  // Reserved
    view.setUint16(2, 1, true);  // Type (1 = ICO)
    view.setUint16(4, pngDataArray.length, true);  // Number of images

    // Write directory entries and image data
    let dataOffset = totalDirSize;

    pngDataArray.forEach((item, index) => {
      const entryOffset = headerSize + (index * dirEntrySize);

      // ICONDIRENTRY
      view.setUint8(entryOffset, item.size >= 256 ? 0 : item.size);  // Width
      view.setUint8(entryOffset + 1, item.size >= 256 ? 0 : item.size);  // Height
      view.setUint8(entryOffset + 2, 0);  // Color palette
      view.setUint8(entryOffset + 3, 0);  // Reserved
      view.setUint16(entryOffset + 4, 1, true);  // Color planes
      view.setUint16(entryOffset + 6, 32, true);  // Bits per pixel
      view.setUint32(entryOffset + 8, item.data.length, true);  // Size of image data
      view.setUint32(entryOffset + 12, dataOffset, true);  // Offset to image data

      // Copy PNG data
      const dataArray = new Uint8Array(buffer, dataOffset, item.data.length);
      dataArray.set(item.data);

      dataOffset += item.data.length;
    });

    return new Blob([buffer], { type: 'image/x-icon' });
  }

  showIcoPreview(pngDataArray) {
    this.icoPreview.innerHTML = '';

    pngDataArray.forEach(item => {
      const blob = new Blob([item.data], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      const previewItem = document.createElement('div');
      previewItem.className = 'ico-preview-item';
      previewItem.innerHTML = `
        <img src="${url}" alt="${item.size}×${item.size}" style="width: ${Math.min(item.size, 64)}px; height: ${Math.min(item.size, 64)}px;">
        <span>${item.size}×${item.size}</span>
      `;
      this.icoPreview.appendChild(previewItem);
    });
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^.]+$/, '');
    const filename = `${originalName}.ico`;

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

    this.originalImage.src = '';
    this.icoPreview.innerHTML = '';
    this.originalSize.textContent = '-';
    this.convertedSize.textContent = '-';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');

    // Reset checkboxes
    const checkboxes = this.sizeOptions.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = ['16', '32', '48', '256'].includes(cb.value);
    });
    this.updateSelectedSizes();
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
  window.converter = new IcoConverter();
});

export default IcoConverter;
