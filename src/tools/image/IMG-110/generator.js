/**
 * IMG-110 縮圖生成器
 * 批量生成多種尺寸縮圖
 */

class ThumbnailGenerator {
  constructor() {
    this.sourceImage = null;
    this.fileName = '';
    this.generatedImages = [];

    this.presets = {
      social: [
        { width: 1200, height: 630, name: 'Facebook/OG' },
        { width: 1200, height: 675, name: 'Twitter' },
        { width: 1080, height: 1080, name: 'Instagram 正方形' },
        { width: 1080, height: 1350, name: 'Instagram 直式' },
        { width: 1080, height: 1920, name: 'IG Stories' },
        { width: 820, height: 312, name: 'Facebook 封面' }
      ],
      web: [
        { width: 1920, height: 1080, name: 'Full HD' },
        { width: 1280, height: 720, name: 'HD' },
        { width: 800, height: 600, name: '大縮圖' },
        { width: 400, height: 300, name: '中縮圖' },
        { width: 200, height: 150, name: '小縮圖' },
        { width: 100, height: 100, name: '頭像' }
      ],
      ecommerce: [
        { width: 1000, height: 1000, name: '產品主圖' },
        { width: 500, height: 500, name: '產品縮圖' },
        { width: 300, height: 300, name: '列表圖' },
        { width: 150, height: 150, name: '購物車圖' },
        { width: 75, height: 75, name: '小圖示' }
      ],
      blog: [
        { width: 1200, height: 628, name: '文章封面' },
        { width: 800, height: 420, name: '內文圖' },
        { width: 400, height: 210, name: '列表縮圖' },
        { width: 150, height: 150, name: '作者頭像' }
      ]
    };

    this.sizes = [...this.presets.web];

    this.init();
  }

  init() {
    this.renderSizes();
    this.bindEvents();
  }

  renderSizes() {
    const container = document.getElementById('sizeList');
    container.innerHTML = this.sizes.map((size, index) => `
      <div class="size-item">
        <input type="checkbox" id="size-${index}" data-index="${index}" checked>
        <span class="size-dims">${size.width} × ${size.height}</span>
        <span class="size-name">${size.name || ''}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sizes = [...this.presets[btn.dataset.preset]];
        this.renderSizes();
      });
    });

    // Add custom size
    document.getElementById('addSizeBtn').addEventListener('click', () => {
      const width = parseInt(document.getElementById('customWidth').value);
      const height = parseInt(document.getElementById('customHeight').value);

      if (width > 0 && height > 0) {
        this.sizes.push({ width, height, name: '自訂' });
        this.renderSizes();
        document.getElementById('customWidth').value = '';
        document.getElementById('customHeight').value = '';
      }
    });

    // Generate
    document.getElementById('generateBtn').addEventListener('click', () => this.generate());

    // Download
    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadZip());

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  handleFile(file) {
    this.fileName = file.name.replace(/\.[^.]+$/, '');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.showPreview(e.target.result, file, img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showPreview(dataUrl, file, img) {
    const uploadZone = document.getElementById('uploadZone');
    uploadZone.classList.add('has-file');

    const fileInfo = document.getElementById('fileInfo');
    fileInfo.classList.add('active');
    fileInfo.innerHTML = `
      <strong>${file.name}</strong><br>
      尺寸：${img.width} × ${img.height} 像素<br>
      大小：${(file.size / 1024).toFixed(1)} KB
    `;

    document.getElementById('previewImage').src = dataUrl;
    document.getElementById('settingsSection').classList.add('active');
    document.getElementById('generateBtn').disabled = false;
  }

  getSelectedSizes() {
    const checkboxes = document.querySelectorAll('#sizeList input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => this.sizes[parseInt(cb.dataset.index)]);
  }

  async generate() {
    const selectedSizes = this.getSelectedSizes();
    if (selectedSizes.length === 0) {
      this.showStatus('error', '請至少選擇一個尺寸');
      return;
    }

    this.showStatus('processing', '正在生成縮圖...');
    this.generatedImages = [];

    const format = document.getElementById('formatSelect').value;
    const quality = parseFloat(document.getElementById('qualitySelect').value);
    const fit = document.getElementById('fitSelect').value;

    const mimeType = format === 'jpg' ? 'image/jpeg' :
                     format === 'webp' ? 'image/webp' : 'image/png';

    for (const size of selectedSizes) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = size.width;
      canvas.height = size.height;

      // Fill background (for transparent images)
      if (format === 'jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw image based on fit mode
      this.drawImage(ctx, this.sourceImage, canvas.width, canvas.height, fit);

      const dataUrl = canvas.toDataURL(mimeType, quality);
      const blob = await this.dataURLtoBlob(dataUrl);

      this.generatedImages.push({
        width: size.width,
        height: size.height,
        name: size.name,
        dataUrl,
        blob,
        fileName: `${this.fileName}_${size.width}x${size.height}.${format}`
      });
    }

    this.showResults();
    this.showStatus('success', `已生成 ${this.generatedImages.length} 張縮圖`);
    document.getElementById('downloadBtn').disabled = false;
  }

  drawImage(ctx, img, targetWidth, targetHeight, fit) {
    const imgRatio = img.width / img.height;
    const targetRatio = targetWidth / targetHeight;

    let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight;

    if (fit === 'cover') {
      if (imgRatio > targetRatio) {
        sHeight = img.height;
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.width;
        sHeight = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
      }
      dx = 0;
      dy = 0;
      dWidth = targetWidth;
      dHeight = targetHeight;
    } else if (fit === 'contain') {
      sx = 0;
      sy = 0;
      sWidth = img.width;
      sHeight = img.height;

      if (imgRatio > targetRatio) {
        dWidth = targetWidth;
        dHeight = targetWidth / imgRatio;
        dx = 0;
        dy = (targetHeight - dHeight) / 2;
      } else {
        dHeight = targetHeight;
        dWidth = targetHeight * imgRatio;
        dx = (targetWidth - dWidth) / 2;
        dy = 0;
      }

      // Fill transparent areas
      ctx.fillStyle = 'transparent';
    } else {
      // Stretch
      sx = 0;
      sy = 0;
      sWidth = img.width;
      sHeight = img.height;
      dx = 0;
      dy = 0;
      dWidth = targetWidth;
      dHeight = targetHeight;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }

  dataURLtoBlob(dataURL) {
    return new Promise((resolve) => {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      resolve(new Blob([u8arr], { type: mime }));
    });
  }

  showResults() {
    const container = document.getElementById('resultGrid');
    container.innerHTML = this.generatedImages.map(img => `
      <div class="result-item">
        <div class="result-thumb">
          <img src="${img.dataUrl}" alt="${img.width}x${img.height}">
        </div>
        <div class="result-name">${img.width} × ${img.height}</div>
        <div class="result-size">${img.name || ''} | ${(img.blob.size / 1024).toFixed(1)} KB</div>
      </div>
    `).join('');

    document.getElementById('resultSection').classList.add('active');
  }

  async downloadZip() {
    if (this.generatedImages.length === 0) return;

    this.showStatus('processing', '正在打包 ZIP...');

    const zip = new JSZip();
    const folder = zip.folder('thumbnails');

    for (const img of this.generatedImages) {
      folder.file(img.fileName, img.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.fileName}_thumbnails.zip`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', 'ZIP 下載完成！');
  }

  reset() {
    this.sourceImage = null;
    this.fileName = '';
    this.generatedImages = [];
    this.sizes = [...this.presets.web];

    document.getElementById('uploadZone').classList.remove('has-file');
    document.getElementById('fileInfo').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('settingsSection').classList.remove('active');
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('statusMessage').className = 'status-message';

    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    this.renderSizes();
  }

  showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.className = `status-message ${type}`;
    statusEl.textContent = message;

    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ThumbnailGenerator();
});
