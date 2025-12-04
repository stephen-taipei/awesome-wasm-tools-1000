/**
 * IMG-103 ASCII 藝術轉換器
 * 將圖片轉換為 ASCII 字元畫
 */

class ImageToAscii {
  constructor() {
    this.file = null;
    this.imageData = null;
    this.asciiText = '';
    this.asciiHtml = '';

    this.charSets = {
      standard: '@%#*+=-:. ',
      detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
      simple: '@#*:. ',
      blocks: '█▓▒░ '
    };

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.settingsSection = document.getElementById('settingsSection');

    this.widthRange = document.getElementById('widthRange');
    this.widthValue = document.getElementById('widthValue');
    this.charSetSelect = document.getElementById('charSet');
    this.charSetPreview = document.getElementById('charSetPreview');
    this.invertBrightness = document.getElementById('invertBrightness');
    this.colorMode = document.getElementById('colorMode');
    this.customCharItem = document.getElementById('customCharItem');
    this.customChars = document.getElementById('customChars');

    this.statusMessage = document.getElementById('statusMessage');
    this.resultSection = document.getElementById('resultSection');
    this.asciiOutput = document.getElementById('asciiOutput');
    this.outputStats = document.getElementById('outputStats');

    this.convertBtn = document.getElementById('convertBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.downloadTxtBtn = document.getElementById('downloadTxtBtn');
    this.downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('dragover');
    });
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('dragover');
    });
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Settings events
    this.widthRange.addEventListener('input', () => {
      this.widthValue.textContent = this.widthRange.value;
    });

    this.charSetSelect.addEventListener('change', () => {
      this.updateCharSetPreview();
    });

    this.customChars.addEventListener('input', () => {
      this.updateCharSetPreview();
    });

    // Buttons
    this.convertBtn.addEventListener('click', () => this.convert());
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.downloadTxtBtn.addEventListener('click', () => this.downloadTxt());
    this.downloadHtmlBtn.addEventListener('click', () => this.downloadHtml());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('error', '請選擇圖片檔案');
      return;
    }

    this.file = file;
    this.uploadZone.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.imageData = { img, width: img.width, height: img.height };
        this.fileInfo.innerHTML = `
          <strong>${file.name}</strong><br>
          尺寸: ${img.width} x ${img.height} px |
          大小: ${this.formatSize(file.size)}
        `;
        this.fileInfo.classList.add('active');
        this.settingsSection.classList.add('active');
        this.convertBtn.disabled = false;
        this.showStatus('success', '圖片載入成功');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateCharSetPreview() {
    const value = this.charSetSelect.value;
    if (value === 'custom') {
      this.customCharItem.style.display = 'block';
      this.charSetPreview.textContent = this.customChars.value || '請輸入自訂字元';
    } else {
      this.customCharItem.style.display = 'none';
      this.charSetPreview.textContent = this.charSets[value];
    }
  }

  convert() {
    if (!this.imageData) return;

    this.showStatus('processing', '正在轉換...');

    requestAnimationFrame(() => {
      try {
        const { img, width: origWidth, height: origHeight } = this.imageData;

        // Calculate dimensions
        const targetWidth = parseInt(this.widthRange.value);
        const aspectRatio = origHeight / origWidth;
        const targetHeight = Math.round(targetWidth * aspectRatio * 0.5); // 0.5 for char aspect ratio

        // Create canvas and get pixel data
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imageData.data;

        // Get char set
        let charSet = this.charSetSelect.value === 'custom'
          ? this.customChars.value
          : this.charSets[this.charSetSelect.value];

        if (!charSet || charSet.length === 0) {
          charSet = this.charSets.standard;
        }

        const invert = this.invertBrightness.value === 'yes';
        const colored = this.colorMode.value === 'colored';

        let asciiLines = [];
        let htmlLines = [];

        for (let y = 0; y < targetHeight; y++) {
          let line = '';
          let htmlLine = '';

          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];

            // Calculate brightness (0-255)
            let brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            if (invert) brightness = 255 - brightness;

            // Map brightness to character
            const charIndex = Math.floor((brightness / 255) * (charSet.length - 1));
            const char = charSet[charIndex] || ' ';

            line += char;

            if (colored) {
              htmlLine += `<span style="color:rgb(${r},${g},${b})">${this.escapeHtml(char)}</span>`;
            } else {
              htmlLine += this.escapeHtml(char);
            }
          }

          asciiLines.push(line);
          htmlLines.push(htmlLine);
        }

        this.asciiText = asciiLines.join('\n');
        this.asciiHtml = htmlLines.join('\n');

        // Display result
        if (colored) {
          this.asciiOutput.innerHTML = this.asciiHtml;
          this.asciiOutput.classList.add('colored');
        } else {
          this.asciiOutput.textContent = this.asciiText;
          this.asciiOutput.classList.remove('colored');

          // Apply color mode
          if (this.colorMode.value === 'white') {
            this.asciiOutput.style.color = '#ffffff';
          } else {
            this.asciiOutput.style.color = '#22c55e';
          }
        }

        // Update stats
        this.outputStats.innerHTML = `
          <div class="stat-item">
            <div class="stat-label">輸出尺寸</div>
            <div class="stat-value">${targetWidth} x ${targetHeight}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">字元數</div>
            <div class="stat-value">${(targetWidth * targetHeight).toLocaleString()}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">文字大小</div>
            <div class="stat-value">${this.formatSize(this.asciiText.length)}</div>
          </div>
        `;

        this.resultSection.classList.add('active');
        this.copyBtn.disabled = false;
        this.downloadTxtBtn.disabled = false;
        this.downloadHtmlBtn.disabled = false;

        this.showStatus('success', '轉換完成');
      } catch (error) {
        this.showStatus('error', '轉換失敗: ' + error.message);
      }
    });
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      ' ': '&nbsp;'
    };
    return text.replace(/[&<>"' ]/g, m => map[m]);
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.asciiText);
      this.showStatus('success', '已複製到剪貼簿');
    } catch (error) {
      this.showStatus('error', '複製失敗');
    }
  }

  downloadTxt() {
    const blob = new Blob([this.asciiText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ascii_art_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showStatus('success', 'TXT 檔案已下載');
  }

  downloadHtml() {
    const bgColor = this.invertBrightness.value === 'yes' ? '#ffffff' : '#0a0a0a';
    const textColor = this.colorMode.value === 'white' ? '#ffffff' :
                     this.colorMode.value === 'mono' ? '#22c55e' : 'inherit';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ASCII Art</title>
  <style>
    body {
      background: ${bgColor};
      display: flex;
      justify-content: center;
      padding: 20px;
    }
    pre {
      font-family: 'Courier New', monospace;
      font-size: 6px;
      line-height: 1.0;
      letter-spacing: 1px;
      color: ${textColor};
    }
  </style>
</head>
<body>
  <pre>${this.colorMode.value === 'colored' ? this.asciiHtml : this.escapeHtml(this.asciiText).replace(/\n/g, '<br>')}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ascii_art_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showStatus('success', 'HTML 檔案已下載');
  }

  reset() {
    this.file = null;
    this.imageData = null;
    this.asciiText = '';
    this.asciiHtml = '';

    this.uploadZone.classList.remove('has-file');
    this.fileInfo.classList.remove('active');
    this.fileInfo.innerHTML = '';
    this.settingsSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.asciiOutput.textContent = '';
    this.asciiOutput.innerHTML = '';
    this.outputStats.innerHTML = '';

    this.fileInput.value = '';
    this.widthRange.value = 80;
    this.widthValue.textContent = '80';
    this.charSetSelect.value = 'standard';
    this.updateCharSetPreview();
    this.invertBrightness.value = 'no';
    this.colorMode.value = 'mono';

    this.convertBtn.disabled = true;
    this.copyBtn.disabled = true;
    this.downloadTxtBtn.disabled = true;
    this.downloadHtmlBtn.disabled = true;

    this.hideStatus();
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    if (type === 'success') {
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  hideStatus() {
    this.statusMessage.className = 'status-message';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageToAscii();
});
