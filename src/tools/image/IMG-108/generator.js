/**
 * IMG-108 App Icon 生成器
 * 生成 iOS/Android App 所需的各種圖示尺寸
 */

class AppIconGenerator {
  constructor() {
    this.file = null;
    this.imageData = null;
    this.generatedIcons = [];
    this.cornerRadius = 0;

    // iOS icon sizes
    this.iosSizes = [
      { size: 20, scale: 1, name: 'Icon-20.png', folder: 'ios' },
      { size: 20, scale: 2, name: 'Icon-20@2x.png', folder: 'ios' },
      { size: 20, scale: 3, name: 'Icon-20@3x.png', folder: 'ios' },
      { size: 29, scale: 1, name: 'Icon-29.png', folder: 'ios' },
      { size: 29, scale: 2, name: 'Icon-29@2x.png', folder: 'ios' },
      { size: 29, scale: 3, name: 'Icon-29@3x.png', folder: 'ios' },
      { size: 40, scale: 1, name: 'Icon-40.png', folder: 'ios' },
      { size: 40, scale: 2, name: 'Icon-40@2x.png', folder: 'ios' },
      { size: 40, scale: 3, name: 'Icon-40@3x.png', folder: 'ios' },
      { size: 60, scale: 2, name: 'Icon-60@2x.png', folder: 'ios' },
      { size: 60, scale: 3, name: 'Icon-60@3x.png', folder: 'ios' },
      { size: 76, scale: 1, name: 'Icon-76.png', folder: 'ios' },
      { size: 76, scale: 2, name: 'Icon-76@2x.png', folder: 'ios' },
      { size: 83.5, scale: 2, name: 'Icon-83.5@2x.png', folder: 'ios' },
      { size: 1024, scale: 1, name: 'Icon-1024.png', folder: 'ios' },
    ];

    // Android icon sizes
    this.androidSizes = [
      { size: 48, density: 'mdpi', name: 'ic_launcher.png', folder: 'android/mipmap-mdpi' },
      { size: 72, density: 'hdpi', name: 'ic_launcher.png', folder: 'android/mipmap-hdpi' },
      { size: 96, density: 'xhdpi', name: 'ic_launcher.png', folder: 'android/mipmap-xhdpi' },
      { size: 144, density: 'xxhdpi', name: 'ic_launcher.png', folder: 'android/mipmap-xxhdpi' },
      { size: 192, density: 'xxxhdpi', name: 'ic_launcher.png', folder: 'android/mipmap-xxxhdpi' },
      { size: 512, density: 'playstore', name: 'playstore-icon.png', folder: 'android' },
    ];

    // Web/PWA icon sizes
    this.webSizes = [
      { size: 72, name: 'icon-72x72.png', folder: 'web' },
      { size: 96, name: 'icon-96x96.png', folder: 'web' },
      { size: 128, name: 'icon-128x128.png', folder: 'web' },
      { size: 144, name: 'icon-144x144.png', folder: 'web' },
      { size: 152, name: 'icon-152x152.png', folder: 'web' },
      { size: 192, name: 'icon-192x192.png', folder: 'web' },
      { size: 384, name: 'icon-384x384.png', folder: 'web' },
      { size: 512, name: 'icon-512x512.png', folder: 'web' },
    ];

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.settingsSection = document.getElementById('settingsSection');
    this.previewImage = document.getElementById('previewImage');

    this.iosCheck = document.getElementById('iosCheck');
    this.androidCheck = document.getElementById('androidCheck');
    this.webCheck = document.getElementById('webCheck');

    this.statusMessage = document.getElementById('statusMessage');
    this.resultSection = document.getElementById('resultSection');
    this.resultContent = document.getElementById('resultContent');

    this.generateBtn = document.getElementById('generateBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
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
      if (e.dataTransfer.files.length > 0) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Platform cards
    document.querySelectorAll('.platform-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
          const checkbox = card.querySelector('.platform-checkbox');
          checkbox.checked = !checkbox.checked;
        }
        card.classList.toggle('selected', card.querySelector('.platform-checkbox').checked);
      });
    });

    // Corner radius buttons
    document.querySelectorAll('.radius-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.radius-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cornerRadius = btn.dataset.radius;
      });
    });

    // Buttons
    this.generateBtn.addEventListener('click', () => this.generate());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
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
        this.imageData = {
          img,
          width: img.width,
          height: img.height,
          dataUrl: e.target.result
        };

        this.fileInfo.innerHTML = `
          <strong>${file.name}</strong><br>
          尺寸: ${img.width} x ${img.height} px |
          大小: ${this.formatSize(file.size)}
        `;
        this.fileInfo.classList.add('active');
        this.previewImage.src = e.target.result;
        this.settingsSection.classList.add('active');
        this.generateBtn.disabled = false;

        if (img.width !== img.height) {
          this.showStatus('error', '建議使用正方形圖片（1024x1024）以獲得最佳效果');
        } else if (img.width < 1024) {
          this.showStatus('error', '建議使用 1024x1024 以上的圖片');
        } else {
          this.showStatus('success', '圖片載入成功');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async generate() {
    if (!this.imageData) return;

    const generateIos = this.iosCheck.checked;
    const generateAndroid = this.androidCheck.checked;
    const generateWeb = this.webCheck.checked;

    if (!generateIos && !generateAndroid && !generateWeb) {
      this.showStatus('error', '請至少選擇一個平台');
      return;
    }

    this.showStatus('processing', '正在生成 App 圖示...');
    this.generatedIcons = [];
    this.resultContent.innerHTML = '';

    const { img } = this.imageData;

    try {
      // Generate iOS icons
      if (generateIos) {
        for (const sizeInfo of this.iosSizes) {
          const actualSize = Math.round(sizeInfo.size * sizeInfo.scale);
          const icon = await this.createIcon(img, actualSize, false);
          this.generatedIcons.push({
            ...icon,
            folder: sizeInfo.folder,
            name: sizeInfo.name,
            displaySize: `${sizeInfo.size}pt @${sizeInfo.scale}x`
          });
        }
      }

      // Generate Android icons
      if (generateAndroid) {
        for (const sizeInfo of this.androidSizes) {
          const icon = await this.createIcon(img, sizeInfo.size, true);
          this.generatedIcons.push({
            ...icon,
            folder: sizeInfo.folder,
            name: sizeInfo.name,
            displaySize: `${sizeInfo.size}px (${sizeInfo.density})`
          });
        }
      }

      // Generate Web/PWA icons
      if (generateWeb) {
        for (const sizeInfo of this.webSizes) {
          const icon = await this.createIcon(img, sizeInfo.size, false);
          this.generatedIcons.push({
            ...icon,
            folder: sizeInfo.folder,
            name: sizeInfo.name,
            displaySize: `${sizeInfo.size}x${sizeInfo.size}`
          });
        }
      }

      // Display results by platform
      this.displayResults(generateIos, generateAndroid, generateWeb);

      this.resultSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('success', `成功生成 ${this.generatedIcons.length} 個圖示`);

    } catch (error) {
      this.showStatus('error', '生成失敗: ' + error.message);
    }
  }

  async createIcon(img, size, applyRadius) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw image centered and scaled
    const sourceSize = Math.min(img.width, img.height);
    const sx = (img.width - sourceSize) / 2;
    const sy = (img.height - sourceSize) / 2;

    // Apply corner radius for Android if selected
    if (applyRadius && this.cornerRadius !== '0') {
      ctx.beginPath();
      if (this.cornerRadius === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      } else {
        const radius = size * (parseInt(this.cornerRadius) / 100);
        this.roundRect(ctx, 0, 0, size, size, radius);
      }
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    return {
      size,
      blob,
      dataUrl: canvas.toDataURL('image/png')
    };
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  displayResults(showIos, showAndroid, showWeb) {
    let html = '';

    if (showIos) {
      const iosIcons = this.generatedIcons.filter(i => i.folder === 'ios');
      html += `
        <div class="result-platform">
          <h4>🍎 iOS / iPadOS (${iosIcons.length} 個圖示)</h4>
          <div class="result-grid">
            ${iosIcons.map(icon => `
              <div class="result-item">
                <div class="result-thumb">
                  <img src="${icon.dataUrl}" alt="${icon.name}">
                </div>
                <div class="result-size">${icon.displaySize}</div>
                <div class="result-name">${icon.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (showAndroid) {
      const androidIcons = this.generatedIcons.filter(i => i.folder.startsWith('android'));
      html += `
        <div class="result-platform">
          <h4>🤖 Android (${androidIcons.length} 個圖示)</h4>
          <div class="result-grid">
            ${androidIcons.map(icon => `
              <div class="result-item">
                <div class="result-thumb">
                  <img src="${icon.dataUrl}" alt="${icon.name}">
                </div>
                <div class="result-size">${icon.displaySize}</div>
                <div class="result-name">${icon.folder.split('/').pop()}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (showWeb) {
      const webIcons = this.generatedIcons.filter(i => i.folder === 'web');
      html += `
        <div class="result-platform">
          <h4>🌐 Web / PWA (${webIcons.length} 個圖示)</h4>
          <div class="result-grid">
            ${webIcons.map(icon => `
              <div class="result-item">
                <div class="result-thumb">
                  <img src="${icon.dataUrl}" alt="${icon.name}">
                </div>
                <div class="result-size">${icon.displaySize}</div>
                <div class="result-name">${icon.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.resultContent.innerHTML = html;
  }

  async downloadZip() {
    if (this.generatedIcons.length === 0) return;

    this.showStatus('processing', '正在打包 ZIP...');

    try {
      const zip = new JSZip();

      // Create folders and add icons
      for (const icon of this.generatedIcons) {
        const path = `${icon.folder}/${icon.name}`;
        zip.file(path, icon.blob);
      }

      // Add Contents.json for iOS
      if (this.iosCheck.checked) {
        const contentsJson = this.generateiOSContentsJson();
        zip.file('ios/Contents.json', contentsJson);
      }

      // Add README
      const readme = this.generateReadme();
      zip.file('README.txt', readme);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `app_icons_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', 'ZIP 檔案已下載');
    } catch (error) {
      this.showStatus('error', '打包失敗: ' + error.message);
    }
  }

  generateiOSContentsJson() {
    const images = this.iosSizes.map(size => ({
      size: `${size.size}x${size.size}`,
      idiom: size.size >= 76 ? 'ipad' : 'iphone',
      filename: size.name,
      scale: `${size.scale}x`
    }));

    return JSON.stringify({
      images,
      info: {
        version: 1,
        author: 'WASM Tools'
      }
    }, null, 2);
  }

  generateReadme() {
    return `App Icon 生成器 - 使用說明
============================

此 ZIP 包含以下平台的 App 圖示：

iOS / iPadOS
------------
將 ios 資料夾中的圖示複製到 Xcode 專案的 Assets.xcassets/AppIcon.appiconset 資料夾。
Contents.json 檔案已包含正確的設定。

Android
-------
將 android 資料夾中的 mipmap-* 子資料夾複製到專案的 res 資料夾。
確保每個密度資料夾中都有 ic_launcher.png。

Web / PWA
---------
將 web 資料夾中的圖示放置於網站根目錄或指定路徑。
在 manifest.json 中引用這些圖示。

生成時間: ${new Date().toLocaleString('zh-TW')}
生成工具: WASM Tools - App Icon 生成器
`;
  }

  reset() {
    this.file = null;
    this.imageData = null;
    this.generatedIcons = [];
    this.cornerRadius = 0;

    this.uploadZone.classList.remove('has-file');
    this.fileInfo.classList.remove('active');
    this.fileInfo.innerHTML = '';
    this.settingsSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.previewImage.src = '';
    this.resultContent.innerHTML = '';

    this.fileInput.value = '';

    // Reset platform selections
    this.iosCheck.checked = true;
    this.androidCheck.checked = true;
    this.webCheck.checked = false;
    document.querySelectorAll('.platform-card').forEach(card => {
      card.classList.toggle('selected', card.querySelector('.platform-checkbox').checked);
    });

    // Reset radius
    document.querySelectorAll('.radius-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.radius === '0');
    });

    this.generateBtn.disabled = true;
    this.downloadBtn.disabled = true;

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
  new AppIconGenerator();
});
