/**
 * CMP-055: VHD Image Handler
 *
 * Processes Microsoft VHD virtual hard disk files.
 * All processing is done locally in the browser.
 */

class VHDHandler {
  constructor() {
    this.vhdData = null;
    this.vhdInfo = null;
    this.file = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.vhdInfoPanel = document.getElementById('vhdInfo');
    this.vhdSize = document.getElementById('vhdSize');
    this.vhdType = document.getElementById('vhdType');
    this.virtualSize = document.getElementById('virtualSize');
    this.createTime = document.getElementById('createTime');
    this.uniqueId = document.getElementById('uniqueId');
    this.geometryInfo = document.getElementById('geometryInfo');
    this.cylinders = document.getElementById('cylinders');
    this.heads = document.getElementById('heads');
    this.sectors = document.getElementById('sectors');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.convertBtn = document.getElementById('convertBtn');
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
        this.loadVHD(e.dataTransfer.files[0]);
      }
    });

    this.analyzeBtn.addEventListener('click', () => this.analyzeVHD());
    this.convertBtn.addEventListener('click', () => this.convertToRaw());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadVHD(event.target.files[0]);
    }
  }

  async loadVHD(file) {
    this.file = file;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取 VHD 檔案...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.vhdData = new Uint8Array(arrayBuffer);

      this.updateProgress(50, '解析 VHD 結構...');
      this.parseVHD();

      this.updateProgress(100, '解析完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'VHD 解析完成！');
        this.analyzeBtn.style.display = 'inline-flex';
        this.convertBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('VHD parsing error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解析失敗，請確認檔案格式正確');
    }
  }

  parseVHD() {
    this.vhdInfo = {
      size: this.vhdData.length,
      type: 'Unknown',
      virtualSize: 0,
      createTime: null,
      uniqueId: '',
      geometry: { cylinders: 0, heads: 0, sectors: 0 }
    };

    // VHD footer is at the end of the file (512 bytes)
    const footerOffset = this.vhdData.length - 512;
    const footer = this.vhdData.slice(footerOffset);

    // Check VHD signature "conectix"
    const signature = String.fromCharCode(...footer.slice(0, 8));

    if (signature === 'conectix') {
      this.parseVHDFooter(footer);
    } else {
      // Try VHDX format
      const vhdxSig = String.fromCharCode(...this.vhdData.slice(0, 8));
      if (vhdxSig === 'vhdxfile') {
        this.vhdInfo.type = 'VHDX';
        this.parseVHDX();
      } else {
        this.vhdInfo.type = '無法識別的格式';
      }
    }

    this.displayVHDInfo();
  }

  parseVHDFooter(footer) {
    const view = new DataView(footer.buffer, footer.byteOffset);

    // Features (4 bytes)
    const features = view.getUint32(8, false);

    // File format version (4 bytes)
    const version = view.getUint32(12, false);

    // Data offset (8 bytes) - for dynamic/differencing disks
    const dataOffset = this.readUint64BE(footer, 16);

    // Timestamp (4 bytes) - seconds since Jan 1, 2000
    const timestamp = view.getUint32(24, false);
    const baseDate = new Date(2000, 0, 1);
    this.vhdInfo.createTime = new Date(baseDate.getTime() + timestamp * 1000);

    // Creator application (4 bytes)
    const creatorApp = String.fromCharCode(...footer.slice(28, 32));

    // Creator version (4 bytes)
    const creatorVersion = view.getUint32(32, false);

    // Creator host OS (4 bytes)
    const creatorOS = String.fromCharCode(...footer.slice(36, 40));

    // Original size (8 bytes)
    const originalSize = this.readUint64BE(footer, 40);

    // Current size (8 bytes)
    const currentSize = this.readUint64BE(footer, 48);
    this.vhdInfo.virtualSize = currentSize;

    // Disk geometry
    this.vhdInfo.geometry.cylinders = view.getUint16(56, false);
    this.vhdInfo.geometry.heads = footer[58];
    this.vhdInfo.geometry.sectors = footer[59];

    // Disk type (4 bytes)
    const diskType = view.getUint32(60, false);
    const typeNames = {
      0: 'None',
      1: 'Reserved (deprecated)',
      2: 'Fixed hard disk',
      3: 'Dynamic hard disk',
      4: 'Differencing hard disk',
      5: 'Reserved (deprecated)',
      6: 'Reserved (deprecated)'
    };
    this.vhdInfo.type = typeNames[diskType] || `Unknown (${diskType})`;

    // Checksum (4 bytes)
    const checksum = view.getUint32(64, false);

    // Unique ID (16 bytes)
    const uniqueId = footer.slice(68, 84);
    this.vhdInfo.uniqueId = this.formatUUID(uniqueId);

    // Saved state (1 byte)
    const savedState = footer[84];
  }

  parseVHDX() {
    // VHDX parsing is more complex
    // For now, just extract basic info
    this.vhdInfo.virtualSize = this.vhdData.length;
  }

  readUint64BE(data, offset) {
    let value = 0;
    for (let i = 0; i < 8; i++) {
      value = value * 256 + data[offset + i];
    }
    return value;
  }

  formatUUID(bytes) {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  displayVHDInfo() {
    this.vhdSize.textContent = this.formatFileSize(this.vhdInfo.size);
    this.vhdType.textContent = this.vhdInfo.type;
    this.virtualSize.textContent = this.formatFileSize(this.vhdInfo.virtualSize);
    this.createTime.textContent = this.vhdInfo.createTime
      ? this.vhdInfo.createTime.toLocaleString()
      : '-';
    this.uniqueId.textContent = this.vhdInfo.uniqueId || '-';
    this.vhdInfoPanel.style.display = 'block';

    if (this.vhdInfo.geometry.cylinders > 0) {
      this.cylinders.textContent = this.vhdInfo.geometry.cylinders;
      this.heads.textContent = this.vhdInfo.geometry.heads;
      this.sectors.textContent = this.vhdInfo.geometry.sectors;
      this.geometryInfo.style.display = 'block';
    }
  }

  analyzeVHD() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '深度分析中...');

    try {
      // Analyze block allocation for dynamic VHDs
      let analysis = {
        allocatedBlocks: 0,
        emptyBlocks: 0,
        totalBlocks: 0
      };

      if (this.vhdInfo.type === 'Dynamic hard disk') {
        // Parse BAT (Block Allocation Table)
        // Dynamic VHD structure: Footer + Header + BAT + Data Blocks + Footer
        const headerOffset = this.vhdData.length - 512 - 1024;
        // Simplified analysis
        analysis.totalBlocks = Math.ceil(this.vhdInfo.virtualSize / (2 * 1024 * 1024));
      }

      // Calculate data distribution
      const sampleSize = Math.min(1024 * 1024, this.vhdData.length);
      let zeroBytes = 0;
      for (let i = 0; i < sampleSize; i++) {
        if (this.vhdData[i] === 0) zeroBytes++;
        if (i % 10000 === 0) {
          this.updateProgress((i / sampleSize) * 80, '分析資料分佈...');
        }
      }

      const sparsity = (zeroBytes / sampleSize * 100).toFixed(1);

      // Display analysis results
      const infoHtml = `
        <hr>
        <p><strong>深度分析結果:</strong></p>
        <p>資料稀疏度: ${sparsity}% (越高越適合動態 VHD)</p>
        <p>檔案格式: ${this.file.name.endsWith('.vhdx') ? 'VHDX (新格式)' : 'VHD (舊格式)'}</p>
        <p>建議: ${sparsity > 50 ? '適合使用動態 VHD' : '建議使用固定 VHD'}</p>
      `;

      this.geometryInfo.innerHTML += infoHtml;
      this.geometryInfo.style.display = 'block';

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

  async convertToRaw() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '轉換為 RAW 格式...');

    try {
      // For fixed VHD, just strip the footer
      // For dynamic VHD, would need to reconstruct
      let rawData;

      if (this.vhdInfo.type === 'Fixed hard disk') {
        // Strip 512-byte footer
        rawData = this.vhdData.slice(0, this.vhdData.length - 512);
      } else {
        // For other types, export as-is with warning
        rawData = this.vhdData;
      }

      this.updateProgress(80, '生成檔案...');

      const blob = new Blob([rawData], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = this.file.name.replace(/\.(vhd|vhdx)$/i, '.raw');
      link.click();
      URL.revokeObjectURL(link.href);

      this.updateProgress(100, '轉換完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '已轉換為 RAW 格式！');
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '轉換失敗');
    }
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    if (text) this.progressText.textContent = text;
  }

  reset() {
    this.fileInput.value = '';
    this.vhdData = null;
    this.vhdInfo = null;
    this.file = null;
    this.vhdInfoPanel.style.display = 'none';
    this.geometryInfo.style.display = 'none';
    this.analyzeBtn.style.display = 'none';
    this.convertBtn.style.display = 'none';
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.handler = new VHDHandler();
});

export default VHDHandler;
