/**
 * CMP-054: IMG Image Handler
 *
 * Processes IMG disk image files.
 * All processing is done locally in the browser.
 */

class IMGHandler {
  constructor() {
    this.imgData = null;
    this.imgInfo = null;
    this.file = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.imgInfoPanel = document.getElementById('imgInfo');
    this.imgSize = document.getElementById('imgSize');
    this.imgType = document.getElementById('imgType');
    this.fileSystem = document.getElementById('fileSystem');
    this.sectorSize = document.getElementById('sectorSize');
    this.partitionInfo = document.getElementById('partitionInfo');
    this.partitionList = document.getElementById('partitionList');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.extractBtn = document.getElementById('extractBtn');
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
        this.loadIMG(e.dataTransfer.files[0]);
      }
    });

    this.analyzeBtn.addEventListener('click', () => this.analyzeIMG());
    this.extractBtn.addEventListener('click', () => this.extractData());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadIMG(event.target.files[0]);
    }
  }

  async loadIMG(file) {
    this.file = file;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取 IMG 檔案...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.imgData = new Uint8Array(arrayBuffer);

      this.updateProgress(50, '解析 IMG 結構...');
      this.parseIMG();

      this.updateProgress(100, '解析完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'IMG 解析完成！');
        this.analyzeBtn.style.display = 'inline-flex';
        this.extractBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('IMG parsing error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解析失敗，請確認檔案格式正確');
    }
  }

  parseIMG() {
    this.imgInfo = {
      size: this.imgData.length,
      type: 'Unknown',
      fileSystem: 'Unknown',
      sectorSize: 512,
      partitions: []
    };

    // Check for MBR signature
    if (this.imgData[510] === 0x55 && this.imgData[511] === 0xAA) {
      this.imgInfo.type = 'MBR 分區映像';
      this.parseMBR();
    }
    // Check for FAT boot sector
    else if (this.checkFATSignature()) {
      this.imgInfo.type = '軟碟/FAT 映像';
      this.parseFAT();
    }
    // Check for ISO signature
    else if (this.imgData.length > 32768 &&
             this.imgData[32769] === 0x43 && this.imgData[32770] === 0x44) {
      this.imgInfo.type = 'ISO 9660 映像';
      this.imgInfo.fileSystem = 'ISO 9660';
    }
    // Raw disk image
    else {
      this.imgInfo.type = 'Raw 磁碟映像';
      this.detectFileSystem();
    }

    this.displayIMGInfo();
  }

  checkFATSignature() {
    // Check for FAT boot sector markers
    if (this.imgData[0] === 0xEB || this.imgData[0] === 0xE9) {
      // Check for FAT12/16/32 signature
      const fatSig = String.fromCharCode(...this.imgData.slice(54, 62));
      const fat32Sig = String.fromCharCode(...this.imgData.slice(82, 90));
      return fatSig.includes('FAT') || fat32Sig.includes('FAT');
    }
    return false;
  }

  parseMBR() {
    // Parse partition table (4 entries starting at offset 446)
    for (let i = 0; i < 4; i++) {
      const offset = 446 + i * 16;
      const type = this.imgData[offset + 4];

      if (type !== 0) {
        const startLBA = this.readUint32LE(this.imgData, offset + 8);
        const sectors = this.readUint32LE(this.imgData, offset + 12);

        this.imgInfo.partitions.push({
          index: i + 1,
          type: this.getPartitionTypeName(type),
          typeCode: type,
          bootable: this.imgData[offset] === 0x80,
          startLBA: startLBA,
          sectors: sectors,
          size: sectors * 512
        });
      }
    }

    if (this.imgInfo.partitions.length > 0) {
      this.imgInfo.fileSystem = this.imgInfo.partitions[0].type;
    }
  }

  parseFAT() {
    // Parse FAT boot sector
    const bytesPerSector = this.readUint16LE(this.imgData, 11);
    const sectorsPerCluster = this.imgData[13];
    const totalSectors16 = this.readUint16LE(this.imgData, 19);
    const totalSectors32 = this.readUint32LE(this.imgData, 32);
    const totalSectors = totalSectors16 || totalSectors32;

    this.imgInfo.sectorSize = bytesPerSector;
    this.imgInfo.sectorsPerCluster = sectorsPerCluster;
    this.imgInfo.totalSectors = totalSectors;

    // Determine FAT type
    const fatSig = String.fromCharCode(...this.imgData.slice(54, 62));
    const fat32Sig = String.fromCharCode(...this.imgData.slice(82, 90));

    if (fat32Sig.includes('FAT32')) {
      this.imgInfo.fileSystem = 'FAT32';
    } else if (fatSig.includes('FAT16')) {
      this.imgInfo.fileSystem = 'FAT16';
    } else if (fatSig.includes('FAT12')) {
      this.imgInfo.fileSystem = 'FAT12';
    } else {
      this.imgInfo.fileSystem = 'FAT (未知版本)';
    }
  }

  detectFileSystem() {
    // Try to detect file system from data patterns
    if (this.imgData.length >= 512) {
      // Check various signatures
      if (this.imgData[0x36] === 0x46 && this.imgData[0x37] === 0x41) {
        this.imgInfo.fileSystem = 'FAT';
      } else if (this.imgData[0x52] === 0x46 && this.imgData[0x53] === 0x41) {
        this.imgInfo.fileSystem = 'FAT32';
      } else if (this.imgData[0x438] === 0x53 && this.imgData[0x439] === 0xEF) {
        this.imgInfo.fileSystem = 'ext2/ext3/ext4';
      } else if (this.imgData[3] === 0x4E && this.imgData[4] === 0x54 &&
                 this.imgData[5] === 0x46 && this.imgData[6] === 0x53) {
        this.imgInfo.fileSystem = 'NTFS';
      }
    }
  }

  getPartitionTypeName(type) {
    const types = {
      0x01: 'FAT12',
      0x04: 'FAT16 (<32MB)',
      0x06: 'FAT16',
      0x07: 'NTFS/exFAT',
      0x0B: 'FAT32 (CHS)',
      0x0C: 'FAT32 (LBA)',
      0x0E: 'FAT16 (LBA)',
      0x0F: 'Extended (LBA)',
      0x11: 'Hidden FAT12',
      0x14: 'Hidden FAT16',
      0x17: 'Hidden NTFS',
      0x1B: 'Hidden FAT32',
      0x82: 'Linux swap',
      0x83: 'Linux',
      0x85: 'Linux Extended',
      0x8E: 'Linux LVM',
      0xA5: 'FreeBSD',
      0xAF: 'HFS/HFS+',
      0xEE: 'GPT Protective',
      0xEF: 'EFI System'
    };
    return types[type] || `Unknown (0x${type.toString(16).toUpperCase()})`;
  }

  readUint16LE(data, offset) {
    return data[offset] | (data[offset + 1] << 8);
  }

  readUint32LE(data, offset) {
    return data[offset] |
           (data[offset + 1] << 8) |
           (data[offset + 2] << 16) |
           (data[offset + 3] << 24);
  }

  displayIMGInfo() {
    this.imgSize.textContent = this.formatFileSize(this.imgInfo.size);
    this.imgType.textContent = this.imgInfo.type;
    this.fileSystem.textContent = this.imgInfo.fileSystem;
    this.sectorSize.textContent = `${this.imgInfo.sectorSize} bytes`;
    this.imgInfoPanel.style.display = 'block';

    // Display partition info if available
    if (this.imgInfo.partitions.length > 0) {
      let html = '<table class="partition-table">';
      html += '<tr><th>#</th><th>類型</th><th>大小</th><th>開機</th></tr>';

      for (const part of this.imgInfo.partitions) {
        html += `<tr>
          <td>${part.index}</td>
          <td>${part.type}</td>
          <td>${this.formatFileSize(part.size)}</td>
          <td>${part.bootable ? '是' : '否'}</td>
        </tr>`;
      }

      html += '</table>';
      this.partitionList.innerHTML = html;
      this.partitionInfo.style.display = 'block';
    }
  }

  analyzeIMG() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '深度分析中...');

    try {
      // Perform additional analysis
      const analysis = {
        signatures: [],
        entropy: this.calculateEntropy(this.imgData.slice(0, Math.min(65536, this.imgData.length))),
        nullSectors: 0,
        usedSectors: 0
      };

      // Count null vs used sectors
      const sectorSize = this.imgInfo.sectorSize;
      const totalSectors = Math.floor(this.imgData.length / sectorSize);

      for (let i = 0; i < totalSectors; i++) {
        const sectorStart = i * sectorSize;
        let isNull = true;

        for (let j = 0; j < sectorSize; j++) {
          if (this.imgData[sectorStart + j] !== 0) {
            isNull = false;
            break;
          }
        }

        if (isNull) {
          analysis.nullSectors++;
        } else {
          analysis.usedSectors++;
        }

        if (i % 1000 === 0) {
          this.updateProgress((i / totalSectors) * 80, '掃描磁區...');
        }
      }

      // Update partition info with analysis
      let html = this.partitionList.innerHTML;
      html += `<hr><p><strong>深度分析結果:</strong></p>`;
      html += `<p>總磁區數: ${totalSectors}</p>`;
      html += `<p>已使用磁區: ${analysis.usedSectors} (${(analysis.usedSectors / totalSectors * 100).toFixed(1)}%)</p>`;
      html += `<p>空白磁區: ${analysis.nullSectors} (${(analysis.nullSectors / totalSectors * 100).toFixed(1)}%)</p>`;
      html += `<p>資料熵值: ${analysis.entropy.toFixed(4)} (1.0 = 完全隨機)</p>`;

      this.partitionList.innerHTML = html;
      this.partitionInfo.style.display = 'block';

      this.updateProgress(100, '分析完成');
      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '分析完成！');
      }, 500);

    } catch (error) {
      console.error('Analysis error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '分析失敗');
    }
  }

  calculateEntropy(data) {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      freq[data[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / data.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy / 8; // Normalize to 0-1
  }

  extractData() {
    // Download raw IMG as-is for now
    const blob = new Blob([this.imgData], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = this.file.name;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '已下載原始映像檔');
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.imgData = null;
    this.imgInfo = null;
    this.file = null;
    this.imgInfoPanel.style.display = 'none';
    this.partitionInfo.style.display = 'none';
    this.analyzeBtn.style.display = 'none';
    this.extractBtn.style.display = 'none';
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
  window.handler = new IMGHandler();
});

export default IMGHandler;
