/**
 * IMG-148 批量重新命名工具
 * Batch Rename Tool
 */

class BatchRename {
  constructor() {
    this.files = [];
    this.previewData = [];

    this.settings = {
      template: 'IMG_{date}_{num}',
      startNumber: 1,
      numberPadding: 3,
      dateFormat: 'YYYYMMDD',
      caseTransform: 'none',
      spaceReplace: '_',
      extensionCase: 'lower'
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Upload elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');

    // Settings elements
    this.settingsSection = document.getElementById('settingsSection');
    this.templateInput = document.getElementById('templateInput');
    this.startNumberInput = document.getElementById('startNumber');
    this.numberPaddingSelect = document.getElementById('numberPadding');
    this.dateFormatSelect = document.getElementById('dateFormat');
    this.caseTransformSelect = document.getElementById('caseTransform');
    this.spaceReplaceSelect = document.getElementById('spaceReplace');
    this.extensionCaseSelect = document.getElementById('extensionCase');
    this.templateTags = document.querySelectorAll('.template-tag');

    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewTableBody = document.getElementById('previewTableBody');
    this.fileCount = document.getElementById('fileCount');

    // Buttons
    this.previewBtn = document.getElementById('previewBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    // Status
    this.statusMessage = document.getElementById('statusMessage');
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Settings events
    this.templateInput.addEventListener('input', (e) => {
      this.settings.template = e.target.value;
    });

    this.startNumberInput.addEventListener('change', (e) => {
      this.settings.startNumber = parseInt(e.target.value) || 1;
    });

    this.numberPaddingSelect.addEventListener('change', (e) => {
      this.settings.numberPadding = parseInt(e.target.value);
    });

    this.dateFormatSelect.addEventListener('change', (e) => {
      this.settings.dateFormat = e.target.value;
    });

    this.caseTransformSelect.addEventListener('change', (e) => {
      this.settings.caseTransform = e.target.value;
    });

    this.spaceReplaceSelect.addEventListener('change', (e) => {
      this.settings.spaceReplace = e.target.value;
    });

    this.extensionCaseSelect.addEventListener('change', (e) => {
      this.settings.extensionCase = e.target.value;
    });

    // Template tags
    this.templateTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const tagValue = tag.dataset.tag;
        const input = this.templateInput;
        const pos = input.selectionStart;
        const before = input.value.substring(0, pos);
        const after = input.value.substring(pos);
        input.value = before + tagValue + after;
        this.settings.template = input.value;
        input.focus();
        input.setSelectionRange(pos + tagValue.length, pos + tagValue.length);
      });
    });

    // Buttons
    this.previewBtn.addEventListener('click', () => this.generatePreview());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadZone.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      this.loadFiles(files);
    } else {
      this.showStatus('請選擇圖片檔案', 'error');
    }
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      this.loadFiles(files);
    }
  }

  async loadFiles(files) {
    this.files = [];

    // 載入所有檔案資訊
    for (const file of files) {
      const fileInfo = await this.getFileInfo(file);
      this.files.push(fileInfo);
    }

    // 更新 UI
    this.uploadZone.classList.add('has-files');
    this.settingsSection.classList.add('active');
    this.previewBtn.disabled = false;

    this.showStatus(`已載入 ${this.files.length} 個檔案`, 'success');
  }

  getFileInfo(file) {
    return new Promise((resolve) => {
      const info = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        width: 0,
        height: 0,
        dataUrl: null
      };

      // 讀取圖片尺寸
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          info.width = img.width;
          info.height = img.height;
          info.dataUrl = e.target.result;
          resolve(info);
        };
        img.onerror = () => {
          resolve(info);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  generatePreview() {
    if (this.files.length === 0) {
      this.showStatus('請先選擇檔案', 'error');
      return;
    }

    this.previewData = [];
    const now = new Date();

    this.files.forEach((fileInfo, index) => {
      const newName = this.generateNewName(fileInfo, index, now);
      this.previewData.push({
        fileInfo: fileInfo,
        originalName: fileInfo.name,
        newName: newName
      });
    });

    // 更新預覽表格
    this.renderPreviewTable();

    // 顯示預覽區域
    this.previewSection.classList.add('active');
    this.downloadBtn.disabled = false;
    this.fileCount.textContent = `${this.files.length} 個檔案`;

    this.showStatus('預覽已生成', 'success');
  }

  generateNewName(fileInfo, index, now) {
    const originalName = fileInfo.name;
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
    let extension = lastDot > 0 ? originalName.substring(lastDot) : '';

    // 處理副檔名大小寫
    switch (this.settings.extensionCase) {
      case 'lower':
        extension = extension.toLowerCase();
        break;
      case 'upper':
        extension = extension.toUpperCase();
        break;
    }

    // 生成新檔名
    let newName = this.settings.template;

    // 替換標籤
    const num = this.settings.startNumber + index;
    const paddedNum = String(num).padStart(this.settings.numberPadding, '0');
    newName = newName.replace(/\{num\}/g, paddedNum);

    // 日期
    const dateStr = this.formatDate(now, this.settings.dateFormat);
    newName = newName.replace(/\{date\}/g, dateStr);

    // 時間
    const timeStr = this.formatTime(now);
    newName = newName.replace(/\{time\}/g, timeStr);

    // 原始檔名
    newName = newName.replace(/\{original\}/g, baseName);

    // 寬度高度
    newName = newName.replace(/\{width\}/g, String(fileInfo.width));
    newName = newName.replace(/\{height\}/g, String(fileInfo.height));

    // 檔案大小
    const sizeStr = this.formatFileSize(fileInfo.size);
    newName = newName.replace(/\{size\}/g, sizeStr);

    // 空格替換
    if (this.settings.spaceReplace !== ' ') {
      newName = newName.replace(/ /g, this.settings.spaceReplace);
    }

    // 大小寫轉換
    switch (this.settings.caseTransform) {
      case 'lower':
        newName = newName.toLowerCase();
        break;
      case 'upper':
        newName = newName.toUpperCase();
        break;
    }

    return newName + extension;
  }

  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (format) {
      case 'YYYYMMDD':
        return `${year}${month}${day}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DDMMYYYY':
        return `${day}${month}${year}`;
      case 'MMDDYYYY':
        return `${month}${day}${year}`;
      default:
        return `${year}${month}${day}`;
    }
  }

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  renderPreviewTable() {
    this.previewTableBody.innerHTML = '';

    this.previewData.forEach(item => {
      const row = document.createElement('tr');

      // 縮圖
      const thumbCell = document.createElement('td');
      if (item.fileInfo.dataUrl) {
        const img = document.createElement('img');
        img.src = item.fileInfo.dataUrl;
        img.className = 'preview-thumb';
        thumbCell.appendChild(img);
      }
      row.appendChild(thumbCell);

      // 原始檔名
      const originalCell = document.createElement('td');
      originalCell.className = 'original-name';
      originalCell.textContent = item.originalName;
      row.appendChild(originalCell);

      // 新檔名
      const newCell = document.createElement('td');
      newCell.className = 'new-name';
      newCell.textContent = item.newName;
      row.appendChild(newCell);

      this.previewTableBody.appendChild(row);
    });
  }

  async downloadZip() {
    if (this.previewData.length === 0) {
      this.showStatus('請先生成預覽', 'error');
      return;
    }

    try {
      this.downloadBtn.disabled = true;
      this.downloadBtn.innerHTML = '<span>⏳</span> 打包中...';

      const zip = new JSZip();

      // 添加所有檔案到 ZIP
      for (const item of this.previewData) {
        const response = await fetch(item.fileInfo.dataUrl);
        const blob = await response.blob();
        zip.file(item.newName, blob);
      }

      // 生成 ZIP
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // 下載
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `renamed_images_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('ZIP 檔案已下載！', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showStatus('下載過程中發生錯誤', 'error');
    } finally {
      this.downloadBtn.disabled = false;
      this.downloadBtn.innerHTML = '<span>💾</span> 下載 ZIP';
    }
  }

  reset() {
    this.files = [];
    this.previewData = [];

    // 重置 UI
    this.uploadZone.classList.remove('has-files');
    this.settingsSection.classList.remove('active');
    this.previewSection.classList.remove('active');
    this.previewBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.fileInput.value = '';
    this.previewTableBody.innerHTML = '';

    // 重置設定
    this.settings = {
      template: 'IMG_{date}_{num}',
      startNumber: 1,
      numberPadding: 3,
      dateFormat: 'YYYYMMDD',
      caseTransform: 'none',
      spaceReplace: '_',
      extensionCase: 'lower'
    };

    this.templateInput.value = this.settings.template;
    this.startNumberInput.value = this.settings.startNumber;
    this.numberPaddingSelect.value = this.settings.numberPadding;
    this.dateFormatSelect.value = this.settings.dateFormat;
    this.caseTransformSelect.value = this.settings.caseTransform;
    this.spaceReplaceSelect.value = this.settings.spaceReplace;
    this.extensionCaseSelect.value = this.settings.extensionCase;

    this.showStatus('已重置', 'success');
  }

  showStatus(message, type) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
      this.statusMessage.className = 'status-message';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new BatchRename();
});
