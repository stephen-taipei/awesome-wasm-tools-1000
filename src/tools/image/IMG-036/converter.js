/**
 * IMG-036 平鋪浮水印
 * 在整張圖片上平鋪重複浮水印（防盜圖）
 */

class TileWatermarkTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.watermarkImage = null;
    this.convertedBlob = null;

    this.mode = 'text';
    this.watermarkText = '© 2024 Copyright';
    this.textColor = '#ffffff';
    this.fontSize = 24;
    this.wmSize = 60;
    this.opacity = 20;
    this.rotation = -30;
    this.spacingX = 150;
    this.spacingY = 100;
    this.pattern = 'grid';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.wmUploadArea = document.getElementById('wmUploadArea');
    this.wmFileInput = document.getElementById('wmFileInput');
    this.wmPreview = document.getElementById('wmPreview');

    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    this.watermarkTextInput = document.getElementById('watermarkText');
    this.textColorInput = document.getElementById('textColor');
    this.fontSizeSlider = document.getElementById('fontSizeSlider');
    this.fontSizeValue = document.getElementById('fontSizeValue');
    this.wmSizeSlider = document.getElementById('wmSizeSlider');
    this.wmSizeValue = document.getElementById('wmSizeValue');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');
    this.rotationSlider = document.getElementById('rotationSlider');
    this.rotationValue = document.getElementById('rotationValue');
    this.spacingXSlider = document.getElementById('spacingXSlider');
    this.spacingXValue = document.getElementById('spacingXValue');
    this.spacingYSlider = document.getElementById('spacingYSlider');
    this.spacingYValue = document.getElementById('spacingYValue');

    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
  }

  bindEvents() {
    // Main image upload
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('drag-over');
    });
    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('drag-over');
    });
    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Watermark image upload
    this.wmUploadArea.addEventListener('click', () => this.wmFileInput.click());
    this.wmFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processWatermarkFile(file);
    });

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;

        document.getElementById('textMode').classList.toggle('active', this.mode === 'text');
        document.getElementById('imageMode').classList.toggle('active', this.mode === 'image');

        this.updatePreview();
      });
    });

    // Text inputs
    this.watermarkTextInput.addEventListener('input', () => {
      this.watermarkText = this.watermarkTextInput.value;
      this.updatePreview();
    });

    this.textColorInput.addEventListener('input', () => {
      this.textColor = this.textColorInput.value;
      this.updatePreview();
    });

    // Sliders
    this.fontSizeSlider.addEventListener('input', () => {
      this.fontSize = parseInt(this.fontSizeSlider.value);
      this.fontSizeValue.textContent = `${this.fontSize}px`;
      this.updatePreview();
    });

    this.wmSizeSlider.addEventListener('input', () => {
      this.wmSize = parseInt(this.wmSizeSlider.value);
      this.wmSizeValue.textContent = `${this.wmSize}px`;
      this.updatePreview();
    });

    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = `${this.opacity}%`;
      this.updatePreview();
    });

    this.rotationSlider.addEventListener('input', () => {
      this.rotation = parseInt(this.rotationSlider.value);
      this.rotationValue.textContent = `${this.rotation}°`;
      this.updatePreview();
    });

    this.spacingXSlider.addEventListener('input', () => {
      this.spacingX = parseInt(this.spacingXSlider.value);
      this.spacingXValue.textContent = `${this.spacingX}px`;
      this.updatePreview();
    });

    this.spacingYSlider.addEventListener('input', () => {
      this.spacingY = parseInt(this.spacingYSlider.value);
      this.spacingYValue.textContent = `${this.spacingY}px`;
      this.updatePreview();
    });

    // Pattern buttons
    document.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.pattern = btn.dataset.pattern;
        this.updatePreview();
      });
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyWatermark());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  processFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.originalImageEl.src = e.target.result;

        this.settingsPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請設定平鋪浮水印');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  processWatermarkFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('error', '請上傳 PNG、JPG 或 WebP 格式的圖片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.watermarkImage = img;
        this.wmPreview.src = e.target.result;
        this.wmPreview.style.display = 'block';
        this.wmUploadArea.classList.add('has-image');
        this.updatePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 600);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const scale = width / this.originalImage.naturalWidth;
    this.drawTiledWatermark(ctx, width, height, scale);

    this.previewImage.src = canvas.toDataURL();
  }

  drawTiledWatermark(ctx, canvasWidth, canvasHeight, scale = 1) {
    ctx.save();
    ctx.globalAlpha = this.opacity / 100;

    const spacingX = this.spacingX * scale;
    const spacingY = this.spacingY * scale;
    const rotation = this.rotation * Math.PI / 180;

    // Calculate start positions to ensure coverage with rotation
    const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
    const startX = -diagonal / 2;
    const startY = -diagonal / 2;
    const endX = canvasWidth + diagonal / 2;
    const endY = canvasHeight + diagonal / 2;

    if (this.pattern === 'random') {
      // Random pattern - use seeded random for consistency
      const seed = 12345;
      const random = this.seededRandom(seed);
      const count = Math.floor((canvasWidth * canvasHeight) / (spacingX * spacingY));

      for (let i = 0; i < count; i++) {
        const x = random() * canvasWidth;
        const y = random() * canvasHeight;
        const r = (random() - 0.5) * Math.PI / 4 + rotation;
        this.drawSingleWatermark(ctx, x, y, r, scale);
      }
    } else {
      // Grid or diagonal pattern
      let row = 0;
      for (let y = startY; y < endY; y += spacingY) {
        const offsetX = (this.pattern === 'diagonal' && row % 2 === 1) ? spacingX / 2 : 0;

        for (let x = startX + offsetX; x < endX; x += spacingX) {
          // Transform coordinates
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;

          // Rotate around center
          const dx = x - centerX;
          const dy = y - centerY;
          const rx = dx * Math.cos(rotation) - dy * Math.sin(rotation) + centerX;
          const ry = dx * Math.sin(rotation) + dy * Math.cos(rotation) + centerY;

          if (rx > -100 && rx < canvasWidth + 100 && ry > -100 && ry < canvasHeight + 100) {
            this.drawSingleWatermark(ctx, rx, ry, rotation, scale);
          }
        }
        row++;
      }
    }

    ctx.restore();
  }

  drawSingleWatermark(ctx, x, y, rotation, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (this.mode === 'text') {
      const fontSize = this.fontSize * scale;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = this.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.watermarkText, 0, 0);
    } else if (this.watermarkImage) {
      const size = this.wmSize * scale;
      const aspectRatio = this.watermarkImage.naturalWidth / this.watermarkImage.naturalHeight;
      const width = size;
      const height = size / aspectRatio;
      ctx.drawImage(this.watermarkImage, -width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }

  seededRandom(seed) {
    let s = seed;
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  async applyWatermark() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用平鋪浮水印...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製原圖...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '添加平鋪浮水印...');
      this.drawTiledWatermark(ctx, canvas.width, canvas.height, 1);

      this.updateProgress(90, '輸出圖片...');

      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        mimeType = this.originalFile.type;
        ext = this.originalFile.name.split('.').pop();
      } else {
        mimeType = format === 'png' ? 'image/png' :
                   format === 'webp' ? 'image/webp' : 'image/jpeg';
        ext = format;
      }

      const quality = mimeType === 'image/png' ? undefined : 0.92;

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, mimeType, quality);
      });

      this.convertedBlob = blob;
      this.outputExt = ext;

      this.updateProgress(100, '完成！');

      this.previewImage.src = URL.createObjectURL(blob);
      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', '平鋪浮水印添加完成！');

    } catch (error) {
      this.showStatus('error', `處理失敗：${error.message}`);
    }

    this.progressContainer.style.display = 'none';
    this.convertBtn.disabled = false;
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  download() {
    if (!this.convertedBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_tiled.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.originalImage = null;
    this.watermarkImage = null;
    this.convertedBlob = null;

    this.mode = 'text';
    this.watermarkText = '© 2024 Copyright';
    this.watermarkTextInput.value = this.watermarkText;
    this.textColor = '#ffffff';
    this.textColorInput.value = '#ffffff';
    this.fontSize = 24;
    this.fontSizeSlider.value = 24;
    this.fontSizeValue.textContent = '24px';
    this.wmSize = 60;
    this.wmSizeSlider.value = 60;
    this.wmSizeValue.textContent = '60px';
    this.opacity = 20;
    this.opacitySlider.value = 20;
    this.opacityValue.textContent = '20%';
    this.rotation = -30;
    this.rotationSlider.value = -30;
    this.rotationValue.textContent = '-30°';
    this.spacingX = 150;
    this.spacingXSlider.value = 150;
    this.spacingXValue.textContent = '150px';
    this.spacingY = 100;
    this.spacingYSlider.value = 100;
    this.spacingYValue.textContent = '100px';
    this.pattern = 'grid';

    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === 'text');
    });
    document.getElementById('textMode').classList.add('active');
    document.getElementById('imageMode').classList.remove('active');

    document.querySelectorAll('.pattern-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pattern === 'grid');
    });

    this.wmPreview.style.display = 'none';
    this.wmUploadArea.classList.remove('has-image');
    this.wmFileInput.value = '';

    this.fileInput.value = '';
    this.settingsPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new TileWatermarkTool();
});
