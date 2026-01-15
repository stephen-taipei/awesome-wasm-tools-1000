/**
 * CMP-052: ISO Image Extraction
 *
 * Extracts files from ISO 9660 disk images.
 * All processing is done locally in the browser.
 */

class ISOExtractor {
  constructor() {
    this.isoData = null;
    this.files = [];
    this.volumeInfo = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.isoInfo = document.getElementById('isoInfo');
    this.volumeName = document.getElementById('volumeName');
    this.isoSize = document.getElementById('isoSize');
    this.fileCount = document.getElementById('fileCount');
    this.fileList = document.getElementById('fileList');
    this.fileTree = document.getElementById('fileTree');
    this.extractAllBtn = document.getElementById('extractAllBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
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
      if (e.dataTransfer.files.length > 0) {
        this.loadISO(e.dataTransfer.files[0]);
      }
    });

    this.extractAllBtn.addEventListener('click', () => this.extractAll());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadISO(event.target.files[0]);
    }
  }

  async loadISO(file) {
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取 ISO 檔案...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.isoData = new Uint8Array(arrayBuffer);

      this.updateProgress(30, '解析 ISO 結構...');
      this.parseISO();

      this.updateProgress(70, '建立檔案列表...');
      this.displayFileList();

      this.updateProgress(100, '解析完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'ISO 解析完成！');
      }, 500);

    } catch (error) {
      console.error('ISO parsing error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解析失敗，請確認檔案格式正確');
    }
  }

  parseISO() {
    const SECTOR_SIZE = 2048;

    // Read Primary Volume Descriptor (sector 16)
    const pvdOffset = 16 * SECTOR_SIZE;
    const pvd = this.isoData.slice(pvdOffset, pvdOffset + SECTOR_SIZE);

    // Verify ISO signature
    const signature = String.fromCharCode(...pvd.slice(1, 6));
    if (signature !== 'CD001') {
      throw new Error('Invalid ISO 9660 signature');
    }

    // Parse volume information
    this.volumeInfo = {
      volumeId: this.readString(pvd, 40, 32).trim(),
      volumeSize: this.readBothEndian32(pvd, 80),
      blockSize: this.readBothEndian16(pvd, 128),
      rootDirLocation: this.readBothEndian32(pvd, 158),
      rootDirSize: this.readBothEndian32(pvd, 166)
    };

    this.volumeName.textContent = this.volumeInfo.volumeId || 'UNTITLED';
    this.isoSize.textContent = this.formatFileSize(this.isoData.length);

    // Parse root directory
    this.files = [];
    this.parseDirectory(this.volumeInfo.rootDirLocation, this.volumeInfo.rootDirSize, '');

    this.fileCount.textContent = `${this.files.length} 個`;
    this.isoInfo.style.display = 'block';
  }

  parseDirectory(location, size, path) {
    const SECTOR_SIZE = 2048;
    const dirData = this.isoData.slice(location * SECTOR_SIZE, location * SECTOR_SIZE + size);

    let offset = 0;
    while (offset < size) {
      const recordLength = dirData[offset];
      if (recordLength === 0) {
        // Move to next sector
        offset = Math.ceil((offset + 1) / SECTOR_SIZE) * SECTOR_SIZE;
        if (offset >= size) break;
        continue;
      }

      const extAttrLength = dirData[offset + 1];
      const fileLocation = this.readBothEndian32(dirData, offset + 2);
      const fileSize = this.readBothEndian32(dirData, offset + 10);
      const flags = dirData[offset + 25];
      const nameLength = dirData[offset + 32];
      const name = this.readString(dirData, offset + 33, nameLength);

      // Skip "." and ".." entries
      if (name !== '\x00' && name !== '\x01') {
        const isDirectory = (flags & 2) !== 0;
        const fullPath = path ? `${path}/${name}` : name;

        // Remove version number (;1)
        const cleanName = name.replace(/;[0-9]+$/, '');

        if (isDirectory) {
          this.parseDirectory(fileLocation, fileSize, fullPath);
        } else {
          this.files.push({
            name: cleanName,
            path: fullPath.replace(/;[0-9]+$/, ''),
            location: fileLocation,
            size: fileSize
          });
        }
      }

      offset += recordLength;
    }
  }

  readString(buffer, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(buffer[offset + i]);
    }
    return str;
  }

  readBothEndian16(buffer, offset) {
    return buffer[offset] | (buffer[offset + 1] << 8);
  }

  readBothEndian32(buffer, offset) {
    return buffer[offset] |
           (buffer[offset + 1] << 8) |
           (buffer[offset + 2] << 16) |
           (buffer[offset + 3] << 24);
  }

  displayFileList() {
    this.fileTree.innerHTML = '';

    if (this.files.length === 0) {
      this.fileTree.innerHTML = '<p>ISO 中沒有檔案</p>';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'file-tree-list';

    for (const file of this.files) {
      const li = document.createElement('li');
      li.className = 'file-tree-item';
      li.innerHTML = `
        <span class="file-icon">📄</span>
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="extract-btn" data-path="${file.path}">提取</button>
      `;
      list.appendChild(li);
    }

    this.fileTree.appendChild(list);
    this.fileList.style.display = 'block';
    this.extractAllBtn.style.display = 'inline-flex';
    this.resetBtn.style.display = 'inline-flex';

    // Bind extract buttons
    this.fileTree.querySelectorAll('.extract-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = e.target.dataset.path;
        this.extractFile(path);
      });
    });
  }

  extractFile(path) {
    const file = this.files.find(f => f.path === path);
    if (!file) return;

    const SECTOR_SIZE = 2048;
    const data = this.isoData.slice(
      file.location * SECTOR_SIZE,
      file.location * SECTOR_SIZE + file.size
    );

    const blob = new Blob([data], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', `已提取: ${file.name}`);
  }

  async extractAll() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備提取...');

    try {
      const zip = new JSZip();
      const SECTOR_SIZE = 2048;

      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        const data = this.isoData.slice(
          file.location * SECTOR_SIZE,
          file.location * SECTOR_SIZE + file.size
        );

        zip.file(file.path, data);
        this.updateProgress((i / this.files.length) * 90, `提取: ${file.name}`);
      }

      this.updateProgress(95, '生成 ZIP...');
      const blob = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${this.volumeInfo.volumeId || 'iso_contents'}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.updateProgress(100, '提取完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '全部檔案已提取為 ZIP！');
      }, 500);

    } catch (error) {
      console.error('Extraction error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '提取失敗');
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.isoData = null;
    this.files = [];
    this.volumeInfo = null;
    this.isoInfo.style.display = 'none';
    this.fileList.style.display = 'none';
    this.extractAllBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
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
  window.extractor = new ISOExtractor();
});

export default ISOExtractor;
