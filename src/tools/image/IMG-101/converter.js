/**
 * IMG-101 圖片轉 Base64
 * 將圖片轉換為 Base64 編碼字串
 */

class ImageToBase64 {
  constructor() {
    this.imageData = null;
    this.dataUrl = '';
    this.base64 = '';
    this.mimeType = '';
    this.currentTab = 'dataurl';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.resultSection = document.getElementById('resultSection');

    this.previewImage = document.getElementById('previewImage');
    this.fileName = document.getElementById('fileName');
    this.dimensions = document.getElementById('dimensions');
    this.format = document.getElementById('format');
    this.fileSize = document.getElementById('fileSize');
    this.base64Size = document.getElementById('base64Size');
    this.sizeIncrease = document.getElementById('sizeIncrease');

    this.outputText = document.getElementById('outputText');
    this.charCount = document.getElementById('charCount');

    this.copyBtn = document.getElementById('copyBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Tab switching
    document.querySelectorAll('.output-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.updateOutput();
      });
    });

    // Actions
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadBtn.addEventListener('click', () => this.downloadAsText());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP、GIF 格式');
      return;
    }

    this.imageData = {
      name: file.name,
      size: file.size,
      type: file.type
    };
    this.mimeType = file.type;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.dataUrl = e.target.result;
      this.base64 = this.dataUrl.split(',')[1];

      const img = new Image();
      img.onload = () => {
        this.imageData.width = img.width;
        this.imageData.height = img.height;

        this.previewImage.src = this.dataUrl;
        this.updateInfo();
        this.updateOutput();

        this.uploadArea.style.display = 'none';
        this.resultSection.classList.add('active');

        this.showStatus('success', '圖片轉換成功');
      };
      img.src = this.dataUrl;
    };
    reader.readAsDataURL(file);
  }

  updateInfo() {
    this.fileName.textContent = this.truncateName(this.imageData.name);
    this.dimensions.textContent = `${this.imageData.width} x ${this.imageData.height}`;

    const formatMap = {
      'image/png': 'PNG',
      'image/jpeg': 'JPEG',
      'image/webp': 'WebP',
      'image/gif': 'GIF'
    };
    this.format.textContent = formatMap[this.imageData.type] || 'Unknown';

    this.fileSize.textContent = this.formatSize(this.imageData.size);

    const base64Bytes = this.dataUrl.length;
    this.base64Size.textContent = this.formatSize(base64Bytes);

    const increase = ((base64Bytes - this.imageData.size) / this.imageData.size * 100).toFixed(1);
    this.sizeIncrease.textContent = `+${increase}%`;
  }

  truncateName(name) {
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    return name;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  updateOutput() {
    let output = '';

    switch (this.currentTab) {
      case 'dataurl':
        output = this.dataUrl;
        break;
      case 'base64':
        output = this.base64;
        break;
      case 'css':
        output = `.element {\n  background-image: url('${this.dataUrl}');\n  background-size: contain;\n  background-repeat: no-repeat;\n}`;
        break;
      case 'html':
        output = `<img src="${this.dataUrl}" alt="${this.imageData.name}" width="${this.imageData.width}" height="${this.imageData.height}" />`;
        break;
    }

    this.outputText.value = output;
    this.charCount.textContent = `${output.length.toLocaleString()} 字元`;
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.outputText.value).then(() => {
      this.copyBtn.classList.add('copied');
      this.copyBtn.innerHTML = '<span>✓</span> 已複製';
      this.showStatus('success', '已複製到剪貼簿');

      setTimeout(() => {
        this.copyBtn.classList.remove('copied');
        this.copyBtn.innerHTML = '<span>📋</span> 複製到剪貼簿';
      }, 2000);
    });
  }

  downloadAsText() {
    const tabNames = {
      'dataurl': 'dataurl',
      'base64': 'base64',
      'css': 'css',
      'html': 'html'
    };

    const baseName = this.imageData.name.replace(/\.[^.]+$/, '');
    const fileName = `${baseName}_${tabNames[this.currentTab]}.txt`;

    const blob = new Blob([this.outputText.value], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '檔案已下載');
  }

  reset() {
    this.imageData = null;
    this.dataUrl = '';
    this.base64 = '';
    this.currentTab = 'dataurl';
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.resultSection.classList.remove('active');

    this.previewImage.src = '';
    this.outputText.value = '';
    this.charCount.textContent = '0 字元';

    document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="dataurl"]').classList.add('active');

    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        this.statusMessage.style.display = 'none';
      }, 2000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageToBase64();
});
