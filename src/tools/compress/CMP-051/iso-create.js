/**
 * CMP-051: ISO Image Creation
 *
 * Creates ISO 9660 format disk images.
 * All processing is done locally in the browser.
 */

class ISOCreator {
  constructor() {
    this.files = [];
    this.isoBlob = null;
    this.volumeName = 'UNTITLED';
    this.isoLevel = 2;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.fileList = document.getElementById('fileList');
    this.selectedFiles = document.getElementById('selectedFiles');
    this.totalSize = document.getElementById('totalSize');
    this.volumeNameInput = document.getElementById('volumeName');
    this.isoLevelSelect = document.getElementById('isoLevel');
    this.outputFilename = document.getElementById('outputFilename');
    this.createBtn = document.getElementById('createBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');
    this.processTime = document.getElementById('processTime');
    this.fileCount = document.getElementById('fileCount');
    this.isoSize = document.getElementById('isoSize');

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
      this.addFiles(e.dataTransfer.files);
    });

    this.volumeNameInput.addEventListener('change', (e) => {
      this.volumeName = e.target.value.toUpperCase().slice(0, 32);
      this.volumeNameInput.value = this.volumeName;
    });

    this.isoLevelSelect.addEventListener('change', (e) => {
      this.isoLevel = parseInt(e.target.value);
    });

    this.createBtn.addEventListener('click', () => this.createISO());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    this.addFiles(event.target.files);
  }

  addFiles(fileList) {
    for (const file of fileList) {
      this.files.push(file);
    }
    this.updateFileList();
    this.createBtn.disabled = this.files.length === 0;
  }

  updateFileList() {
    this.selectedFiles.innerHTML = '';
    let total = 0;

    this.files.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-size">${this.formatFileSize(file.size)}</span>
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.selectedFiles.appendChild(li);
      total += file.size;
    });

    this.selectedFiles.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.files.splice(index, 1);
        this.updateFileList();
        this.createBtn.disabled = this.files.length === 0;
      });
    });

    this.totalSize.textContent = `總大小: ${this.formatFileSize(total)}`;
    this.fileList.style.display = this.files.length > 0 ? 'block' : 'none';
  }

  async createISO() {
    if (this.files.length === 0) {
      this.showStatus('error', '請先選擇檔案');
      return;
    }

    const startTime = performance.now();
    this.progressContainer.classList.add('active');
    this.progressFill.style.width = '0%';
    this.createBtn.disabled = true;

    try {
      this.updateProgress(10, '準備檔案...');

      // Read all files
      const fileData = [];
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        const buffer = await file.arrayBuffer();
        fileData.push({
          name: this.formatFileName(file.name),
          data: new Uint8Array(buffer),
          size: file.size
        });
        this.updateProgress(10 + (i / this.files.length) * 30, `讀取檔案: ${file.name}`);
      }

      this.updateProgress(50, '建立 ISO 結構...');

      // Create ISO 9660 image
      const iso = this.buildISO9660(fileData);

      this.updateProgress(90, '生成 ISO 檔案...');
      this.isoBlob = new Blob([iso], { type: 'application/x-iso9660-image' });

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      this.processTime.textContent = `${processingTime} 秒`;
      this.fileCount.textContent = `${this.files.length} 個`;
      this.isoSize.textContent = this.formatFileSize(this.isoBlob.size);
      this.performanceInfo.style.display = 'block';

      this.updateProgress(100, '建立完成！');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'ISO 映像檔建立完成！');
        this.downloadBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
        this.createBtn.disabled = false;
      }, 500);

    } catch (error) {
      console.error('ISO creation error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '建立失敗，請重試');
      this.createBtn.disabled = false;
    }
  }

  formatFileName(name) {
    // Format filename based on ISO level
    let formatted = name.toUpperCase();
    if (this.isoLevel === 1) {
      // 8.3 format
      const parts = formatted.split('.');
      const base = parts[0].slice(0, 8).replace(/[^A-Z0-9_]/g, '_');
      const ext = parts[1] ? parts[1].slice(0, 3).replace(/[^A-Z0-9_]/g, '_') : '';
      formatted = ext ? `${base}.${ext}` : base;
    } else if (this.isoLevel === 2) {
      // 31 characters
      formatted = formatted.slice(0, 31).replace(/[^A-Z0-9._]/g, '_');
    }
    return formatted;
  }

  buildISO9660(files) {
    const SECTOR_SIZE = 2048;

    // Calculate required sectors
    let totalDataSize = 0;
    for (const file of files) {
      totalDataSize += Math.ceil(file.size / SECTOR_SIZE) * SECTOR_SIZE;
    }

    // ISO structure: 16 system sectors + volume descriptors + path table + directory + files
    const systemSectors = 16;
    const volumeDescriptorSectors = 2;
    const pathTableSectors = 1;
    const rootDirSectors = 1;
    const dataSectors = Math.ceil(totalDataSize / SECTOR_SIZE);
    const totalSectors = systemSectors + volumeDescriptorSectors + pathTableSectors + rootDirSectors + dataSectors + files.length;

    const iso = new Uint8Array(totalSectors * SECTOR_SIZE);

    // Primary Volume Descriptor (sector 16)
    const pvd = new Uint8Array(SECTOR_SIZE);
    pvd[0] = 1; // Type: Primary
    pvd.set(this.stringToBytes('CD001'), 1); // Standard identifier
    pvd[6] = 1; // Version

    // System and volume identifiers
    this.setStrD(pvd, 8, 32, 'SYSTEM');
    this.setStrD(pvd, 40, 32, this.volumeName);

    // Volume space size
    const volumeSize = totalSectors;
    this.setBothEndian32(pvd, 80, volumeSize);

    // Volume set size and sequence
    this.setBothEndian16(pvd, 120, 1);
    this.setBothEndian16(pvd, 124, 1);

    // Logical block size
    this.setBothEndian16(pvd, 128, SECTOR_SIZE);

    // Path table size and locations
    const pathTableSize = 10 + this.volumeName.length;
    this.setBothEndian32(pvd, 132, pathTableSize);
    this.setLittleEndian32(pvd, 140, systemSectors + volumeDescriptorSectors);
    this.setBigEndian32(pvd, 148, systemSectors + volumeDescriptorSectors);

    // Root directory record
    const rootDirLocation = systemSectors + volumeDescriptorSectors + pathTableSectors;
    this.setDirectoryRecord(pvd, 156, rootDirLocation, SECTOR_SIZE, '\x00');

    // Volume identifiers
    this.setStrA(pvd, 190, 128, '');
    this.setStrA(pvd, 318, 128, '');
    this.setStrA(pvd, 446, 128, '');
    this.setStrA(pvd, 574, 37, '');

    // Date fields
    const now = new Date();
    const dateStr = this.formatISODate(now);
    this.setStrA(pvd, 813, 17, dateStr);
    this.setStrA(pvd, 830, 17, dateStr);
    this.setStrA(pvd, 847, 17, '0000000000000000\x00');
    this.setStrA(pvd, 864, 17, '0000000000000000\x00');

    pvd[881] = 1; // File structure version

    iso.set(pvd, systemSectors * SECTOR_SIZE);

    // Volume Descriptor Set Terminator (sector 17)
    const terminator = new Uint8Array(SECTOR_SIZE);
    terminator[0] = 255; // Type: Terminator
    terminator.set(this.stringToBytes('CD001'), 1);
    terminator[6] = 1;
    iso.set(terminator, (systemSectors + 1) * SECTOR_SIZE);

    // Path Table
    const pathTable = new Uint8Array(SECTOR_SIZE);
    pathTable[0] = 1; // Directory name length
    pathTable[1] = 0; // Extended attribute length
    this.setLittleEndian32(pathTable, 2, rootDirLocation);
    this.setLittleEndian16(pathTable, 6, 1); // Parent directory number
    pathTable[8] = 0; // Root directory name
    iso.set(pathTable, (systemSectors + volumeDescriptorSectors) * SECTOR_SIZE);

    // Root Directory
    const rootDir = new Uint8Array(SECTOR_SIZE);
    let dirOffset = 0;

    // "." entry
    dirOffset += this.writeDirectoryRecord(rootDir, dirOffset, rootDirLocation, SECTOR_SIZE, '\x00', true);

    // ".." entry
    dirOffset += this.writeDirectoryRecord(rootDir, dirOffset, rootDirLocation, SECTOR_SIZE, '\x01', true);

    // File entries
    let currentSector = rootDirLocation + rootDirSectors;
    for (const file of files) {
      const fileSectors = Math.ceil(file.size / SECTOR_SIZE);
      dirOffset += this.writeDirectoryRecord(rootDir, dirOffset, currentSector, file.size, file.name, false);
      currentSector += fileSectors;
    }

    iso.set(rootDir, rootDirLocation * SECTOR_SIZE);

    // File data
    currentSector = rootDirLocation + rootDirSectors;
    for (const file of files) {
      iso.set(file.data, currentSector * SECTOR_SIZE);
      currentSector += Math.ceil(file.size / SECTOR_SIZE);
    }

    return iso;
  }

  writeDirectoryRecord(buffer, offset, location, size, name, isDir) {
    const nameBytes = typeof name === 'string' ? this.stringToBytes(name) : [name.charCodeAt(0)];
    const recordLength = 33 + nameBytes.length + (nameBytes.length % 2 === 0 ? 1 : 0);

    buffer[offset] = recordLength;
    buffer[offset + 1] = 0; // Extended attribute length
    this.setBothEndian32(buffer, offset + 2, location);
    this.setBothEndian32(buffer, offset + 10, size);

    // Recording date/time
    const now = new Date();
    buffer[offset + 18] = now.getFullYear() - 1900;
    buffer[offset + 19] = now.getMonth() + 1;
    buffer[offset + 20] = now.getDate();
    buffer[offset + 21] = now.getHours();
    buffer[offset + 22] = now.getMinutes();
    buffer[offset + 23] = now.getSeconds();
    buffer[offset + 24] = 0; // GMT offset

    buffer[offset + 25] = isDir ? 2 : 0; // File flags
    buffer[offset + 26] = 0; // Interleave
    buffer[offset + 27] = 0; // Interleave gap
    this.setBothEndian16(buffer, offset + 28, 1); // Volume sequence
    buffer[offset + 32] = nameBytes.length;

    for (let i = 0; i < nameBytes.length; i++) {
      buffer[offset + 33 + i] = nameBytes[i];
    }

    return recordLength;
  }

  setDirectoryRecord(buffer, offset, location, size, name) {
    this.writeDirectoryRecord(buffer, offset, location, size, name, true);
  }

  stringToBytes(str) {
    return Array.from(str).map(c => c.charCodeAt(0));
  }

  setStrD(buffer, offset, length, value) {
    const bytes = this.stringToBytes(value.toUpperCase().padEnd(length, ' '));
    for (let i = 0; i < length; i++) {
      buffer[offset + i] = bytes[i] || 0x20;
    }
  }

  setStrA(buffer, offset, length, value) {
    const bytes = this.stringToBytes(value.padEnd(length, ' '));
    for (let i = 0; i < length; i++) {
      buffer[offset + i] = bytes[i] || 0x20;
    }
  }

  setLittleEndian16(buffer, offset, value) {
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
  }

  setBigEndian16(buffer, offset, value) {
    buffer[offset] = (value >> 8) & 0xFF;
    buffer[offset + 1] = value & 0xFF;
  }

  setBothEndian16(buffer, offset, value) {
    this.setLittleEndian16(buffer, offset, value);
    this.setBigEndian16(buffer, offset + 2, value);
  }

  setLittleEndian32(buffer, offset, value) {
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
    buffer[offset + 2] = (value >> 16) & 0xFF;
    buffer[offset + 3] = (value >> 24) & 0xFF;
  }

  setBigEndian32(buffer, offset, value) {
    buffer[offset] = (value >> 24) & 0xFF;
    buffer[offset + 1] = (value >> 16) & 0xFF;
    buffer[offset + 2] = (value >> 8) & 0xFF;
    buffer[offset + 3] = value & 0xFF;
  }

  setBothEndian32(buffer, offset, value) {
    this.setLittleEndian32(buffer, offset, value);
    this.setBigEndian32(buffer, offset + 4, value);
  }

  formatISODate(date) {
    return date.getFullYear().toString().padStart(4, '0') +
           (date.getMonth() + 1).toString().padStart(2, '0') +
           date.getDate().toString().padStart(2, '0') +
           date.getHours().toString().padStart(2, '0') +
           date.getMinutes().toString().padStart(2, '0') +
           date.getSeconds().toString().padStart(2, '0') +
           '00\x00';
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  download() {
    if (!this.isoBlob) return;

    const filename = `${this.outputFilename.value || 'image'}.iso`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.isoBlob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.fileInput.value = '';
    this.files = [];
    this.isoBlob = null;
    this.selectedFiles.innerHTML = '';
    this.fileList.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.createBtn.disabled = true;
    this.progressContainer.classList.remove('active');
    this.statusMessage.classList.remove('active');
    this.volumeNameInput.value = 'UNTITLED';
    this.outputFilename.value = 'image';
    this.isoLevelSelect.value = '2';
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
  window.creator = new ISOCreator();
});

export default ISOCreator;
