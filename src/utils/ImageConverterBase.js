/** Shared image conversion with explicit resource ownership and stale-result protection. */
export class ImageConverterBase {
  constructor(config = {}) {
    this.config = { inputFormats: ['image/*'], outputFormat: 'image/png', outputExtension: 'png', defaultQuality: 0.92, showQuality: true, fillBackground: null, maxBytes: 50 * 1024 * 1024, maxPixels: 40_000_000, ...config };
    this.quality = this.config.defaultQuality;
    this.originalFile = null; this.convertedBlob = null;
    this.fileVersion = 0; this.operation = 0; this.busy = false;
    this.originalUrl = null; this.convertedUrl = null; this.downloadUrls = new Set();
    this.init();
  }
  init() {
    for (const id of ['uploadArea','fileInput','qualitySlider','qualityValue','convertBtn','downloadBtn','resetBtn','previewArea','originalImage','convertedImage','originalSize','convertedSize','progressContainer','progressFill','progressText','statusMessage','performanceInfo','processTime','compressionRatio','imageResolution']) this[id] = document.getElementById(id);
    if (!this.config.showQuality) this.qualitySlider?.closest('.setting-row')?.style.setProperty('display', 'none');
    this.bindEvents();
  }
  bindEvents() {
    this.uploadArea?.addEventListener('click', event => { if (event.target !== this.fileInput) this.fileInput?.click(); });
    this.fileInput?.addEventListener('change', event => this.handleFileSelect(event));
    this.uploadArea?.addEventListener('dragover', event => { event.preventDefault(); this.uploadArea.classList.add('dragover'); });
    this.uploadArea?.addEventListener('dragleave', () => this.uploadArea.classList.remove('dragover'));
    this.uploadArea?.addEventListener('drop', event => { event.preventDefault(); this.uploadArea.classList.remove('dragover'); const file = event.dataTransfer?.files[0]; if (file) this.processFile(file); });
    this.qualitySlider?.addEventListener('input', event => {
      this.quality = Math.min(1, Math.max(0, Number(event.target.value) / 100));
      if (this.qualityValue) this.qualityValue.textContent = `${Math.round(this.quality * 100)}%`;
      this.invalidateResult();
    });
    this.convertBtn?.addEventListener('click', () => this.convert());
    this.downloadBtn?.addEventListener('click', () => this.download());
    this.resetBtn?.addEventListener('click', () => this.reset());
    window.addEventListener('pagehide', () => { this.reset(); for (const url of this.downloadUrls) URL.revokeObjectURL(url); this.downloadUrls.clear(); });
  }
  handleFileSelect(event) { const file = event.target.files?.[0]; if (file) this.processFile(file); }
  validateFile(file) { return this.config.inputFormats.some(type => type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type); }
  revoke(property) { if (this[property]) URL.revokeObjectURL(this[property]); this[property] = null; }
  invalidateResult() {
    this.operation++; this.busy = false; this.convertedBlob = null; this.outputFilename = null;
    this.revoke('convertedUrl'); this.convertedImage?.removeAttribute('src');
    if (this.downloadBtn) this.downloadBtn.style.display = 'none';
    if (this.convertedSize) this.convertedSize.textContent = '-';
    if (this.performanceInfo) this.performanceInfo.style.display = 'none';
    if (this.convertBtn) this.convertBtn.disabled = !this.originalFile;
    this.progressContainer?.classList.remove('active');
  }
  async processFile(file) {
    this.reset();
    if (!this.validateFile(file) || !file.size || file.size > this.config.maxBytes) {
      this.showStatus('error', '檔案格式不符、空白或超過 50 MB / Invalid or oversized file'); return;
    }
    const version = this.fileVersion;
    try {
      const image = await this.loadImage(file);
      if (version !== this.fileVersion) return;
      this.checkDimensions(image);
      this.originalFile = file;
      this.originalUrl = URL.createObjectURL(file);
      if (this.originalImage) this.originalImage.src = this.originalUrl;
      if (this.originalSize) this.originalSize.textContent = this.formatFileSize(file.size);
      if (this.imageResolution) this.imageResolution.textContent = `${image.width} × ${image.height} px`;
      if (this.previewArea) this.previewArea.style.display = 'grid';
      if (this.convertBtn) this.convertBtn.disabled = false;
      if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
      this.showStatus('info', `已載入 / Loaded: ${file.name}`);
    } catch (error) { if (version === this.fileVersion) this.showStatus('error', error.message); }
  }
  checkDimensions(image) {
    if (!image.width || !image.height || image.width * image.height > this.config.maxPixels) throw new Error('圖片超過 40 百萬像素或無法解碼 / Invalid or oversized image');
  }
  async convert() {
    if (!this.originalFile || this.busy) return;
    this.invalidateResult();
    const operation = this.operation;
    const file = this.originalFile, config = { ...this.config }, quality = this.quality;
    const current = () => operation === this.operation && file === this.originalFile;
    this.busy = true;
    const start = performance.now();
    if (this.convertBtn) this.convertBtn.disabled = true;
    this.progressContainer?.classList.add('active');
    let canvas;
    try {
      this.updateProgress(15, '讀取圖片 / Decoding');
      const image = await this.loadImage(file);
      if (!current()) return;
      this.checkDimensions(image);
      canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is not available');
      if (config.fillBackground) { context.fillStyle = config.fillBackground; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(image, 0, 0); this.updateProgress(60, '編碼 / Encoding');
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image encoding failed')), config.outputFormat, config.showQuality ? quality : undefined));
      if (!current()) return;
      if (blob.type !== config.outputFormat) throw new Error(`瀏覽器不支援此輸出格式 / Unsupported encoder: ${config.outputFormat}`);
      this.convertedBlob = blob;
      this.outputFilename = `${file.name.replace(/\.[^.]+$/, '')}.${config.outputExtension}`;
      this.convertedUrl = URL.createObjectURL(blob);
      if (this.convertedImage) this.convertedImage.src = this.convertedUrl;
      if (this.convertedSize) this.convertedSize.textContent = this.formatFileSize(blob.size);
      if (this.processTime) this.processTime.textContent = `${((performance.now() - start) / 1000).toFixed(2)} s`;
      if (this.compressionRatio) this.compressionRatio.textContent = `${((blob.size / file.size - 1) * 100).toFixed(1)}%`;
      if (this.performanceInfo) this.performanceInfo.style.display = 'block';
      if (this.downloadBtn) this.downloadBtn.style.display = 'inline-flex';
      if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
      this.updateProgress(100, '完成 / Complete'); this.showStatus('success', '轉換完成 / Conversion complete');
    } catch (error) { if (current()) { this.convertedBlob = null; this.showStatus('error', error.message); } }
    finally {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      if (current()) { this.busy = false; if (this.convertBtn) this.convertBtn.disabled = false; this.progressContainer?.classList.remove('active'); }
    }
  }
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image(), url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('無法解碼圖片 / Cannot decode image')); };
      image.src = url;
    });
  }
  updateProgress(percent, message) { if (this.progressFill) this.progressFill.style.width = `${percent}%`; if (this.progressText) this.progressText.textContent = message; }
  download() {
    if (!this.convertedBlob || !this.outputFilename) return;
    const url = URL.createObjectURL(this.convertedBlob); this.downloadUrls.add(url);
    const link = document.createElement('a'); link.href = url; link.download = this.outputFilename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => { URL.revokeObjectURL(url); this.downloadUrls.delete(url); }, 1000);
  }
  reset() {
    this.fileVersion++; this.originalFile = null; this.invalidateResult(); this.revoke('originalUrl');
    if (this.fileInput) this.fileInput.value = '';
    this.originalImage?.removeAttribute('src');
    if (this.originalSize) this.originalSize.textContent = '-';
    if (this.previewArea) this.previewArea.style.display = 'none';
    if (this.resetBtn) this.resetBtn.style.display = 'none';
    if (this.imageResolution) this.imageResolution.textContent = '-';
    this.statusMessage?.classList.remove('active');
    this.quality = this.config.defaultQuality;
    if (this.qualitySlider) this.qualitySlider.value = String(this.quality * 100);
    if (this.qualityValue) this.qualityValue.textContent = `${Math.round(this.quality * 100)}%`;
  }
  showStatus(type, message) { if (this.statusMessage) { this.statusMessage.className = `status-message active ${type}`; this.statusMessage.textContent = message; } }
  formatFileSize(bytes) { if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'; const units = ['B','KB','MB','GB']; const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024))); return `${Number((bytes / 1024 ** i).toFixed(2))} ${units[i]}`; }
}
export default ImageConverterBase;
