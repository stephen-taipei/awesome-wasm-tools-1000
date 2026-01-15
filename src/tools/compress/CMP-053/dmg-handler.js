/**
 * CMP-053: DMG Image Handler
 *
 * Processes macOS DMG disk image files.
 * All processing is done locally in the browser.
 */

class DMGHandler {
  constructor() {
    this.dmgData = null;
    this.dmgInfo = null;
    this.file = null;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.dmgInfoPanel = document.getElementById('dmgInfo');
    this.dmgSize = document.getElementById('dmgSize');
    this.dmgFormat = document.getElementById('dmgFormat');
    this.compressionStatus = document.getElementById('compressionStatus');
    this.contentList = document.getElementById('contentList');
    this.contentTree = document.getElementById('contentTree');
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
        this.loadDMG(e.dataTransfer.files[0]);
      }
    });

    this.analyzeBtn.addEventListener('click', () => this.analyzeDMG());
    this.convertBtn.addEventListener('click', () => this.convertToZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFileSelect(event) {
    if (event.target.files.length > 0) {
      this.loadDMG(event.target.files[0]);
    }
  }

  async loadDMG(file) {
    this.file = file;
    this.progressContainer.classList.add('active');
    this.updateProgress(10, '讀取 DMG 檔案...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.dmgData = new Uint8Array(arrayBuffer);

      this.updateProgress(50, '解析 DMG 結構...');
      this.parseDMG();

      this.updateProgress(100, '解析完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', 'DMG 解析完成！');
        this.analyzeBtn.style.display = 'inline-flex';
        this.convertBtn.style.display = 'inline-flex';
        this.resetBtn.style.display = 'inline-flex';
      }, 500);

    } catch (error) {
      console.error('DMG parsing error:', error);
      this.progressContainer.classList.remove('active');
      this.showStatus('error', '解析失敗，請確認檔案格式正確');
    }
  }

  parseDMG() {
    // DMG files have a trailer at the end (koly block)
    const kolyOffset = this.dmgData.length - 512;
    const koly = this.dmgData.slice(kolyOffset);

    // Check for koly signature
    const signature = String.fromCharCode(...koly.slice(0, 4));

    this.dmgInfo = {
      size: this.dmgData.length,
      format: 'Unknown',
      compression: 'Unknown',
      hasKoly: signature === 'koly'
    };

    if (this.dmgInfo.hasKoly) {
      this.dmgInfo.format = 'UDIF (Universal Disk Image Format)';
      // Parse koly block for more info
      const view = new DataView(koly.buffer, koly.byteOffset);
      const flags = view.getUint32(12, false);

      if (flags & 1) {
        this.dmgInfo.compression = 'zlib 壓縮';
      } else if (flags & 2) {
        this.dmgInfo.compression = 'bzip2 壓縮';
      } else {
        this.dmgInfo.compression = '無壓縮';
      }
    } else {
      // Check for other DMG formats
      const headerSig = String.fromCharCode(...this.dmgData.slice(0, 4));
      if (headerSig === 'koly') {
        this.dmgInfo.format = 'UDIF (koly header)';
      } else {
        this.dmgInfo.format = 'Raw DMG 或未知格式';
        this.dmgInfo.compression = '無法判斷';
      }
    }

    this.displayDMGInfo();
  }

  displayDMGInfo() {
    this.dmgSize.textContent = this.formatFileSize(this.dmgInfo.size);
    this.dmgFormat.textContent = this.dmgInfo.format;
    this.compressionStatus.textContent = this.dmgInfo.compression;
    this.dmgInfoPanel.style.display = 'block';
  }

  analyzeDMG() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '深度分析 DMG 結構...');

    try {
      const analysis = this.performDeepAnalysis();
      this.displayAnalysis(analysis);

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

  performDeepAnalysis() {
    const analysis = {
      signatures: [],
      sections: [],
      possibleContent: []
    };

    // Look for common signatures
    const signatures = [
      { pattern: [0x78, 0x9C], name: 'zlib 壓縮資料' },
      { pattern: [0x78, 0xDA], name: 'zlib 壓縮資料 (最佳)' },
      { pattern: [0x1F, 0x8B], name: 'gzip 壓縮資料' },
      { pattern: [0x42, 0x5A], name: 'bzip2 壓縮資料' },
      { pattern: [0x50, 0x4B], name: 'ZIP 結構' },
      { pattern: [0x48, 0x2B], name: 'HFS+ 檔案系統' },
      { pattern: [0x00, 0x00, 0x01, 0x00], name: 'Apple 分區表' }
    ];

    for (let i = 0; i < Math.min(this.dmgData.length, 1000000); i += 512) {
      for (const sig of signatures) {
        let match = true;
        for (let j = 0; j < sig.pattern.length; j++) {
          if (this.dmgData[i + j] !== sig.pattern[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          analysis.signatures.push({
            name: sig.name,
            offset: i
          });
        }
      }
      this.updateProgress((i / Math.min(this.dmgData.length, 1000000)) * 80, '掃描資料結構...');
    }

    // Identify sections
    if (this.dmgInfo.hasKoly) {
      analysis.sections.push({
        name: 'UDIF Header',
        offset: this.dmgData.length - 512,
        size: 512
      });
    }

    return analysis;
  }

  displayAnalysis(analysis) {
    this.contentTree.innerHTML = '';

    if (analysis.signatures.length === 0 && analysis.sections.length === 0) {
      this.contentTree.innerHTML = '<p>無法識別具體內容結構</p>';
    } else {
      let html = '<ul class="analysis-list">';

      if (analysis.sections.length > 0) {
        html += '<li><strong>結構區段:</strong><ul>';
        for (const section of analysis.sections) {
          html += `<li>${section.name} @ 0x${section.offset.toString(16)}</li>`;
        }
        html += '</ul></li>';
      }

      if (analysis.signatures.length > 0) {
        html += '<li><strong>發現的簽名 (前 10 個):</strong><ul>';
        const unique = [...new Map(analysis.signatures.map(s => [s.name, s])).values()];
        for (const sig of unique.slice(0, 10)) {
          html += `<li>${sig.name} @ 0x${sig.offset.toString(16)}</li>`;
        }
        html += '</ul></li>';
      }

      html += '</ul>';
      this.contentTree.innerHTML = html;
    }

    this.contentList.style.display = 'block';
  }

  async convertToZip() {
    this.progressContainer.classList.add('active');
    this.updateProgress(0, '準備轉換...');

    try {
      const zip = new JSZip();

      // Add DMG as raw data
      zip.file('original.dmg', this.dmgData);

      // Add info file
      const info = `DMG Information
================
File: ${this.file.name}
Size: ${this.formatFileSize(this.dmgInfo.size)}
Format: ${this.dmgInfo.format}
Compression: ${this.dmgInfo.compression}

Note: This is the original DMG file packaged in ZIP format.
Full DMG extraction requires macOS-specific tools.
`;
      zip.file('info.txt', info);

      this.updateProgress(50, '生成 ZIP...');

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        this.updateProgress(50 + metadata.percent * 0.45, '壓縮中...');
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = this.file.name.replace('.dmg', '.zip');
      link.click();
      URL.revokeObjectURL(link.href);

      this.updateProgress(100, '轉換完成');

      setTimeout(() => {
        this.progressContainer.classList.remove('active');
        this.showStatus('success', '已轉換為 ZIP 格式！');
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
    this.dmgData = null;
    this.dmgInfo = null;
    this.file = null;
    this.dmgInfoPanel.style.display = 'none';
    this.contentList.style.display = 'none';
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.handler = new DMGHandler();
});

export default DMGHandler;
