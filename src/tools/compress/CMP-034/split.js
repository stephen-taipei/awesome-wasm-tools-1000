/**
 * CMP-034: Split Archive
 *
 * Compresses and splits files into multiple volumes.
 * All processing is done locally in the browser.
 */

class SplitArchive {
  constructor() {
    this.files = [];
    this.volumes = [];
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.splitBtn = document.getElementById('splitBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.volumeSize = document.getElementById('volumeSize');
    this.volumeUnit = document.getElementById('volumeUnit');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileCount = document.getElementById('fileCount');
    this.totalSize = document.getElementById('totalSize');
    this.estimatedVolumes = document.getElementById('estimatedVolumes');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.resultPanel = document.getElementById('resultPanel');
    this.resultList = document.getElementById('resultList');
    this.statusMessage = document.getElementById('statusMessage');

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
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) this.processFiles(files);
    });

    this.volumeSize.addEventListener('change', () => this.updateEstimate());
    this.volumeUnit.addEventListener('change', () => this.updateEstimate());

    this.splitBtn.addEventListener('click', () => this.split());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) this.processFiles(files);
  }

  processFiles(files) {
    this.files = files;
    this.splitBtn.disabled = false;

    const total = files.reduce((sum, f) => sum + f.size, 0);
    this.fileCount.textContent = `${files.length} 個`;
    this.totalSize.textContent = this.formatFileSize(total);
    this.fileInfo.style.display = 'block';

    this.updateEstimate();
    this.showStatus('info', `已載入 ${files.length} 個檔案`);
  }

  setVolumeSize(size, unit) {
    this.volumeSize.value = size;
    this.volumeUnit.value = unit;
    this.updateEstimate();
  }

  getVolumeSizeBytes() {
    const size = parseFloat(this.volumeSize.value);
    const unit = this.volumeUnit.value;

    switch (unit) {
      case 'kb': return size * 1024;
      case 'mb': return size * 1024 * 1024;
      case 'gb': return size * 1024 * 1024 * 1024;
      default: return size * 1024 * 1024;
    }
  }

  updateEstimate() {
    if (this.files.length === 0) return;

    const total = this.files.reduce((sum, f) => sum + f.size, 0);
    const volumeBytes = this.getVolumeSizeBytes();
    const estimated = Math.ceil(total / volumeBytes);

    this.estimatedVolumes.textContent = `約 ${estimated} 卷`;
  }

  async split() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.splitBtn.disabled = true;
    this.volumes = [];

    try {
      this.updateProgress(10, '壓縮檔案中...');

      // Create ZIP with all files
      const zip = new JSZip();
      for (const file of this.files) {
        const arrayBuffer = await file.arrayBuffer();
        zip.file(file.name, new Uint8Array(arrayBuffer));
      }

      this.updateProgress(40, '產生壓縮檔...');
      const compressedBlob = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      this.updateProgress(60, '分割分卷中...');

      const volumeBytes = this.getVolumeSizeBytes();
      const data = new Uint8Array(compressedBlob);
      const totalVolumes = Math.ceil(data.length / volumeBytes);

      for (let i = 0; i < totalVolumes; i++) {
        const start = i * volumeBytes;
        const end = Math.min(start + volumeBytes, data.length);
        const chunk = data.slice(start, end);

        // Add volume header
        const header = this.createVolumeHeader(i + 1, totalVolumes, data.length);
        const volumeData = new Uint8Array(header.length + chunk.length);
        volumeData.set(header, 0);
        volumeData.set(chunk, header.length);

        const volumeBlob = new Blob([volumeData], { type: 'application/octet-stream' });
        const volumeName = `archive.zip.${String(i + 1).padStart(3, '0')}`;

        this.volumes.push({
          name: volumeName,
          number: i + 1,
          size: volumeBlob.size,
          blob: volumeBlob
        });

        this.updateProgress(60 + (i / totalVolumes) * 35, `產生分卷 ${i + 1}/${totalVolumes}...`);
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.updateProgress(100, `分卷完成！耗時 ${processingTime} 秒`);
      this.displayResults();

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', `分卷壓縮完成！共 ${this.volumes.length} 卷`);
        this.downloadAllBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.splitBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Split error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '分卷壓縮失敗，請重試');
      this.splitBtn.disabled = false;
    }
  }

  createVolumeHeader(volumeNumber, totalVolumes, totalSize) {
    // Simple header: SPLIT\0 + volumeNumber(4) + totalVolumes(4) + totalSize(8)
    const header = new Uint8Array(22);
    const view = new DataView(header.buffer);

    // Magic bytes "SPLIT\0"
    header[0] = 0x53; // S
    header[1] = 0x50; // P
    header[2] = 0x4C; // L
    header[3] = 0x49; // I
    header[4] = 0x54; // T
    header[5] = 0x00; // null

    view.setUint32(6, volumeNumber, true);
    view.setUint32(10, totalVolumes, true);
    view.setBigUint64(14, BigInt(totalSize), true);

    return header;
  }

  displayResults() {
    let html = '';
    const totalSize = this.volumes.reduce((sum, v) => sum + v.size, 0);

    for (const volume of this.volumes) {
      html += `<div class="result-item">
        <div class="result-info">
          <span class="result-name">${volume.name}</span>
          <span class="result-details">
            分卷 ${volume.number}/${this.volumes.length} - ${this.formatFileSize(volume.size)}
          </span>
        </div>
        <button class="btn btn-small" onclick="window.splitArchive.downloadVolume(${volume.number - 1})">
          下載
        </button>
      </div>`;
    }

    html += `<div class="result-summary">
      總計: ${this.volumes.length} 個分卷，${this.formatFileSize(totalSize)}
    </div>`;

    this.resultList.innerHTML = html;
    this.resultPanel.style.display = 'block';
  }

  downloadVolume(index) {
    const volume = this.volumes[index];
    if (!volume) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(volume.blob);
    link.download = volume.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  downloadAll() {
    for (let i = 0; i < this.volumes.length; i++) {
      setTimeout(() => this.downloadVolume(i), i * 200);
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.volumes = [];
    this.fileInfo.style.display = 'none';
    this.resultPanel.style.display = 'none';
    this.downloadAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.splitBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
  }

  showStatus(type, message) {
    this.statusMessage.className = `status-message active ${type}`;
    this.statusMessage.textContent = message;
    if (type === 'success') {
      setTimeout(() => this.statusMessage.classList.remove('active'), 3000);
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
  window.splitArchive = new SplitArchive();
});

export default SplitArchive;
