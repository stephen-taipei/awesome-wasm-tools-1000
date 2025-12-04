/**
 * IMG-107 Favicon 生成器
 * 生成網站所需的各種尺寸 Favicon
 */

class FaviconGenerator {
  constructor() {
    this.file = null;
    this.imageData = null;
    this.generatedIcons = [];

    // Define all favicon sizes
    this.sizes = [
      { size: 16, name: 'favicon-16x16.png', desc: '瀏覽器標籤', common: true },
      { size: 32, name: 'favicon-32x32.png', desc: '瀏覽器標籤', common: true },
      { size: 48, name: 'favicon-48x48.png', desc: 'Windows 桌面', common: false },
      { size: 64, name: 'favicon-64x64.png', desc: 'Safari 閱讀列表', common: false },
      { size: 96, name: 'favicon-96x96.png', desc: 'Google TV', common: false },
      { size: 128, name: 'favicon-128x128.png', desc: 'Chrome Web Store', common: false },
      { size: 180, name: 'apple-touch-icon.png', desc: 'Apple Touch Icon', common: true },
      { size: 192, name: 'android-chrome-192x192.png', desc: 'Android Chrome', common: true },
      { size: 256, name: 'favicon-256x256.png', desc: 'Windows 8/10', common: false },
      { size: 384, name: 'android-chrome-384x384.png', desc: 'Android Chrome', common: false },
      { size: 512, name: 'android-chrome-512x512.png', desc: 'PWA 啟動畫面', common: true },
      { size: 144, name: 'mstile-144x144.png', desc: 'Windows 8 磚塊', common: false },
      { size: 150, name: 'mstile-150x150.png', desc: 'Windows 10 磚塊', common: false },
      { size: 310, name: 'mstile-310x310.png', desc: 'Windows 10 大磚塊', common: false },
    ];

    this.init();
  }

  init() {
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.fileInfo = document.getElementById('fileInfo');
    this.previewSection = document.getElementById('previewSection');
    this.previewImage = document.getElementById('previewImage');
    this.sizesGrid = document.getElementById('sizesGrid');

    this.statusMessage = document.getElementById('statusMessage');
    this.resultSection = document.getElementById('resultSection');
    this.resultGrid = document.getElementById('resultGrid');

    this.generateBtn = document.getElementById('generateBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.selectAllBtn = document.getElementById('selectAll');
    this.selectNoneBtn = document.getElementById('selectNone');
    this.selectCommonBtn = document.getElementById('selectCommon');

    this.bindEvents();
    this.renderSizesGrid();
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

    // Quick select buttons
    this.selectAllBtn.addEventListener('click', () => this.selectSizes('all'));
    this.selectNoneBtn.addEventListener('click', () => this.selectSizes('none'));
    this.selectCommonBtn.addEventListener('click', () => this.selectSizes('common'));

    // Buttons
    this.generateBtn.addEventListener('click', () => this.generate());
    this.downloadBtn.addEventListener('click', () => this.downloadZip());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  renderSizesGrid() {
    this.sizesGrid.innerHTML = '';

    this.sizes.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'size-option';
      div.innerHTML = `
        <input type="checkbox" id="size_${index}" data-index="${index}" ${item.common ? 'checked' : ''}>
        <label for="size_${index}">
          ${item.size}x${item.size}
          <div class="size-desc">${item.desc}</div>
        </label>
      `;
      this.sizesGrid.appendChild(div);
    });
  }

  selectSizes(mode) {
    const checkboxes = this.sizesGrid.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((cb, index) => {
      if (mode === 'all') {
        cb.checked = true;
      } else if (mode === 'none') {
        cb.checked = false;
      } else if (mode === 'common') {
        cb.checked = this.sizes[index].common;
      }
    });
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
        this.previewSection.classList.add('active');
        this.generateBtn.disabled = false;

        if (img.width !== img.height) {
          this.showStatus('error', '建議使用正方形圖片以獲得最佳效果');
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

    // Get selected sizes
    const checkboxes = this.sizesGrid.querySelectorAll('input[type="checkbox"]:checked');
    const selectedSizes = Array.from(checkboxes).map(cb => this.sizes[parseInt(cb.dataset.index)]);

    if (selectedSizes.length === 0) {
      this.showStatus('error', '請至少選擇一個尺寸');
      return;
    }

    this.showStatus('processing', '正在生成 Favicon...');
    this.generatedIcons = [];
    this.resultGrid.innerHTML = '';

    const { img } = this.imageData;

    try {
      for (const sizeInfo of selectedSizes) {
        const canvas = document.createElement('canvas');
        canvas.width = sizeInfo.size;
        canvas.height = sizeInfo.size;
        const ctx = canvas.getContext('2d');

        // Draw image centered and scaled
        const sourceSize = Math.min(img.width, img.height);
        const sx = (img.width - sourceSize) / 2;
        const sy = (img.height - sourceSize) / 2;

        ctx.drawImage(
          img,
          sx, sy, sourceSize, sourceSize,
          0, 0, sizeInfo.size, sizeInfo.size
        );

        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });

        const dataUrl = canvas.toDataURL('image/png');

        this.generatedIcons.push({
          name: sizeInfo.name,
          size: sizeInfo.size,
          desc: sizeInfo.desc,
          blob,
          dataUrl
        });
      }

      // Also generate ICO file (16, 32, 48 combined)
      const icoBlob = await this.generateIco();
      if (icoBlob) {
        this.generatedIcons.unshift({
          name: 'favicon.ico',
          size: 'multi',
          desc: 'ICO 格式 (16, 32, 48)',
          blob: icoBlob,
          dataUrl: URL.createObjectURL(icoBlob)
        });
      }

      // Display results
      this.generatedIcons.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
          <div class="result-thumb">
            <img src="${item.dataUrl}" alt="${item.name}">
          </div>
          <div class="result-name">${item.name}</div>
          <div class="result-size">${item.size === 'multi' ? 'ICO' : item.size + 'x' + item.size}</div>
        `;
        this.resultGrid.appendChild(div);
      });

      this.resultSection.classList.add('active');
      this.downloadBtn.disabled = false;
      this.showStatus('success', `成功生成 ${this.generatedIcons.length} 個 Favicon`);

    } catch (error) {
      this.showStatus('error', '生成失敗: ' + error.message);
    }
  }

  async generateIco() {
    const sizes = [16, 32, 48];
    const images = [];

    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const { img } = this.imageData;
      const sourceSize = Math.min(img.width, img.height);
      const sx = (img.width - sourceSize) / 2;
      const sy = (img.height - sourceSize) / 2;

      ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      images.push({ size, data: imageData });
    }

    // Create ICO file
    return this.createIcoBlob(images);
  }

  createIcoBlob(images) {
    // ICO file format:
    // Header: 6 bytes
    // Directory entries: 16 bytes each
    // Image data: PNG or BMP format

    const numImages = images.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * numImages;

    // Calculate image data offsets
    let offset = headerSize + dirSize;
    const imageBuffers = [];

    for (const img of images) {
      // Create BMP data (no file header, just DIB header + pixels)
      const bmpData = this.createBmpData(img.data, img.size);
      imageBuffers.push(bmpData);
    }

    // Calculate total size
    const totalSize = headerSize + dirSize + imageBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write header
    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // Type: 1 = ICO
    view.setUint16(4, numImages, true); // Number of images

    // Write directory entries
    let dataOffset = headerSize + dirSize;
    for (let i = 0; i < numImages; i++) {
      const img = images[i];
      const entryOffset = headerSize + i * dirEntrySize;

      view.setUint8(entryOffset + 0, img.size === 256 ? 0 : img.size); // Width
      view.setUint8(entryOffset + 1, img.size === 256 ? 0 : img.size); // Height
      view.setUint8(entryOffset + 2, 0); // Color palette
      view.setUint8(entryOffset + 3, 0); // Reserved
      view.setUint16(entryOffset + 4, 1, true); // Color planes
      view.setUint16(entryOffset + 6, 32, true); // Bits per pixel
      view.setUint32(entryOffset + 8, imageBuffers[i].length, true); // Image size
      view.setUint32(entryOffset + 12, dataOffset, true); // Image offset

      dataOffset += imageBuffers[i].length;
    }

    // Write image data
    let writeOffset = headerSize + dirSize;
    for (const imgBuffer of imageBuffers) {
      const bytes = new Uint8Array(buffer, writeOffset, imgBuffer.length);
      bytes.set(imgBuffer);
      writeOffset += imgBuffer.length;
    }

    return new Blob([buffer], { type: 'image/x-icon' });
  }

  createBmpData(imageData, size) {
    // BITMAPINFOHEADER (40 bytes) + pixel data
    const headerSize = 40;
    const rowSize = size * 4; // BGRA
    const pixelDataSize = rowSize * size;
    const maskRowSize = Math.ceil(size / 8);
    const maskPadding = (4 - (maskRowSize % 4)) % 4;
    const maskSize = (maskRowSize + maskPadding) * size;

    const totalSize = headerSize + pixelDataSize + maskSize;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // BITMAPINFOHEADER
    view.setUint32(0, 40, true); // Header size
    view.setInt32(4, size, true); // Width
    view.setInt32(8, size * 2, true); // Height (doubled for AND mask)
    view.setUint16(12, 1, true); // Planes
    view.setUint16(14, 32, true); // Bits per pixel
    view.setUint32(16, 0, true); // Compression (none)
    view.setUint32(20, pixelDataSize + maskSize, true); // Image size
    view.setInt32(24, 0, true); // X pixels per meter
    view.setInt32(28, 0, true); // Y pixels per meter
    view.setUint32(32, 0, true); // Colors used
    view.setUint32(36, 0, true); // Important colors

    // Pixel data (bottom-up, BGRA format)
    const pixels = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIdx = ((size - 1 - y) * size + x) * 4;
        const dstIdx = headerSize + (y * size + x) * 4;

        buffer[dstIdx + 0] = pixels[srcIdx + 2]; // B
        buffer[dstIdx + 1] = pixels[srcIdx + 1]; // G
        buffer[dstIdx + 2] = pixels[srcIdx + 0]; // R
        buffer[dstIdx + 3] = pixels[srcIdx + 3]; // A
      }
    }

    // AND mask (all zeros for fully opaque)
    // Already initialized to 0

    return buffer;
  }

  async downloadZip() {
    if (this.generatedIcons.length === 0) return;

    this.showStatus('processing', '正在打包 ZIP...');

    try {
      const zip = new JSZip();

      for (const icon of this.generatedIcons) {
        zip.file(icon.name, icon.blob);
      }

      // Add HTML snippet
      const htmlSnippet = this.generateHtmlSnippet();
      zip.file('favicon-snippet.html', htmlSnippet);

      // Add manifest.json for PWA
      const manifest = this.generateManifest();
      zip.file('site.webmanifest', manifest);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `favicons_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      this.showStatus('success', 'ZIP 檔案已下載');
    } catch (error) {
      this.showStatus('error', '打包失敗: ' + error.message);
    }
  }

  generateHtmlSnippet() {
    let html = '<!-- Favicon HTML Snippet -->\n';
    html += '<!-- 將以下程式碼加入 <head> 區塊 -->\n\n';

    html += '<link rel="icon" type="image/x-icon" href="/favicon.ico">\n';
    html += '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n';
    html += '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n';
    html += '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n';
    html += '<link rel="manifest" href="/site.webmanifest">\n';
    html += '<meta name="msapplication-TileColor" content="#667eea">\n';
    html += '<meta name="theme-color" content="#667eea">\n';

    return html;
  }

  generateManifest() {
    const manifest = {
      name: 'My Website',
      short_name: 'Website',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
      ],
      theme_color: '#667eea',
      background_color: '#ffffff',
      display: 'standalone'
    };

    return JSON.stringify(manifest, null, 2);
  }

  reset() {
    this.file = null;
    this.imageData = null;
    this.generatedIcons = [];

    this.uploadZone.classList.remove('has-file');
    this.fileInfo.classList.remove('active');
    this.fileInfo.innerHTML = '';
    this.previewSection.classList.remove('active');
    this.resultSection.classList.remove('active');

    this.previewImage.src = '';
    this.resultGrid.innerHTML = '';

    this.fileInput.value = '';
    this.selectSizes('common');

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
  new FaviconGenerator();
});
