/**
 * IMG-033 文字浮水印
 * 在圖片上添加文字浮水印
 */

class TextWatermarkTool {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    this.watermarkText = '© 2024 Your Name';
    this.fontFamily = 'Arial';
    this.fontStyle = 'normal';
    this.fontSize = 48;
    this.textColor = '#ffffff';
    this.strokeColor = '#000000';
    this.strokeWidth = 2;
    this.opacity = 50;
    this.rotation = 0;
    this.position = 'center';
    this.offsetX = 0;
    this.offsetY = 0;
    this.enableShadow = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.watermarkPanel = document.getElementById('watermarkPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');

    // Controls
    this.watermarkTextEl = document.getElementById('watermarkText');
    this.fontFamilySelect = document.getElementById('fontFamily');
    this.fontStyleSelect = document.getElementById('fontStyle');
    this.textColorInput = document.getElementById('textColor');
    this.strokeColorInput = document.getElementById('strokeColor');

    this.fontSizeSlider = document.getElementById('fontSizeSlider');
    this.fontSizeValue = document.getElementById('fontSizeValue');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');
    this.rotationSlider = document.getElementById('rotationSlider');
    this.rotationValue = document.getElementById('rotationValue');
    this.strokeWidthSlider = document.getElementById('strokeWidthSlider');
    this.strokeWidthValue = document.getElementById('strokeWidthValue');
    this.offsetXSlider = document.getElementById('offsetXSlider');
    this.offsetXValue = document.getElementById('offsetXValue');
    this.offsetYSlider = document.getElementById('offsetYSlider');
    this.offsetYValue = document.getElementById('offsetYValue');

    this.enableShadowCheckbox = document.getElementById('enableShadow');
    this.outputFormatSelect = document.getElementById('outputFormat');

    this.bindEvents();
  }

  bindEvents() {
    // File upload
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

    // Text input
    this.watermarkTextEl.addEventListener('input', () => {
      this.watermarkText = this.watermarkTextEl.value;
      this.updatePreview();
    });

    // Style selects
    this.fontFamilySelect.addEventListener('change', () => {
      this.fontFamily = this.fontFamilySelect.value;
      this.updatePreview();
    });

    this.fontStyleSelect.addEventListener('change', () => {
      this.fontStyle = this.fontStyleSelect.value;
      this.updatePreview();
    });

    // Color inputs
    this.textColorInput.addEventListener('input', () => {
      this.textColor = this.textColorInput.value;
      this.updatePreview();
    });

    this.strokeColorInput.addEventListener('input', () => {
      this.strokeColor = this.strokeColorInput.value;
      this.updatePreview();
    });

    // Sliders
    this.fontSizeSlider.addEventListener('input', () => {
      this.fontSize = parseInt(this.fontSizeSlider.value);
      this.fontSizeValue.textContent = `${this.fontSize}px`;
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

    this.strokeWidthSlider.addEventListener('input', () => {
      this.strokeWidth = parseInt(this.strokeWidthSlider.value);
      this.strokeWidthValue.textContent = `${this.strokeWidth}px`;
      this.updatePreview();
    });

    this.offsetXSlider.addEventListener('input', () => {
      this.offsetX = parseInt(this.offsetXSlider.value);
      this.offsetXValue.textContent = `${this.offsetX}px`;
      this.updatePreview();
    });

    this.offsetYSlider.addEventListener('input', () => {
      this.offsetY = parseInt(this.offsetYSlider.value);
      this.offsetYValue.textContent = `${this.offsetY}px`;
      this.updatePreview();
    });

    // Position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.position = btn.dataset.pos;
        this.updatePreview();
      });
    });

    // Shadow checkbox
    this.enableShadowCheckbox.addEventListener('change', () => {
      this.enableShadow = this.enableShadowCheckbox.checked;
      this.updatePreview();
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

        this.watermarkPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請設定浮水印');
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

    // Scale font size for preview
    const scale = width / this.originalImage.naturalWidth;
    this.drawWatermark(ctx, width, height, scale);

    this.previewImage.src = canvas.toDataURL();
  }

  drawWatermark(ctx, width, height, scale = 1) {
    if (!this.watermarkText.trim()) return;

    const fontSize = this.fontSize * scale;

    ctx.save();

    // Set font
    let fontString = '';
    if (this.fontStyle.includes('italic')) fontString += 'italic ';
    if (this.fontStyle.includes('bold')) fontString += 'bold ';
    fontString += `${fontSize}px ${this.fontFamily}`;
    ctx.font = fontString;

    // Measure text
    const lines = this.watermarkText.split('\n');
    let maxWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    });
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;

    // Calculate position
    let x, y;
    const padding = 20 * scale;

    switch (this.position) {
      case 'top-left':
        x = padding;
        y = padding + fontSize;
        break;
      case 'top-center':
        x = width / 2;
        y = padding + fontSize;
        break;
      case 'top-right':
        x = width - padding;
        y = padding + fontSize;
        break;
      case 'center-left':
        x = padding;
        y = height / 2 - totalHeight / 2 + fontSize;
        break;
      case 'center':
        x = width / 2;
        y = height / 2 - totalHeight / 2 + fontSize;
        break;
      case 'center-right':
        x = width - padding;
        y = height / 2 - totalHeight / 2 + fontSize;
        break;
      case 'bottom-left':
        x = padding;
        y = height - padding - totalHeight + fontSize;
        break;
      case 'bottom-center':
        x = width / 2;
        y = height - padding - totalHeight + fontSize;
        break;
      case 'bottom-right':
        x = width - padding;
        y = height - padding - totalHeight + fontSize;
        break;
      default:
        x = width / 2;
        y = height / 2;
    }

    // Apply offset
    x += this.offsetX * scale;
    y += this.offsetY * scale;

    // Set text alignment based on position
    if (this.position.includes('left')) {
      ctx.textAlign = 'left';
    } else if (this.position.includes('right')) {
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'center';
    }

    ctx.textBaseline = 'top';

    // Apply rotation
    ctx.translate(x, y - fontSize);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.translate(-x, -(y - fontSize));

    // Set opacity
    ctx.globalAlpha = this.opacity / 100;

    // Draw shadow if enabled
    if (this.enableShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;
    }

    // Draw each line
    lines.forEach((line, index) => {
      const lineY = y + index * lineHeight - fontSize;

      // Draw stroke
      if (this.strokeWidth > 0) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth * scale;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, x, lineY);
      }

      // Draw fill
      ctx.fillStyle = this.textColor;
      ctx.fillText(line, x, lineY);
    });

    ctx.restore();
  }

  async applyWatermark() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用浮水印...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '添加浮水印...');
      this.drawWatermark(ctx, canvas.width, canvas.height, 1);

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
      this.showStatus('success', '浮水印添加完成！');

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
    link.download = `${originalName}_watermarked.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;

    // Reset values
    this.watermarkText = '© 2024 Your Name';
    this.watermarkTextEl.value = this.watermarkText;
    this.fontFamily = 'Arial';
    this.fontFamilySelect.value = 'Arial';
    this.fontStyle = 'normal';
    this.fontStyleSelect.value = 'normal';
    this.fontSize = 48;
    this.fontSizeSlider.value = 48;
    this.fontSizeValue.textContent = '48px';
    this.textColor = '#ffffff';
    this.textColorInput.value = '#ffffff';
    this.strokeColor = '#000000';
    this.strokeColorInput.value = '#000000';
    this.strokeWidth = 2;
    this.strokeWidthSlider.value = 2;
    this.strokeWidthValue.textContent = '2px';
    this.opacity = 50;
    this.opacitySlider.value = 50;
    this.opacityValue.textContent = '50%';
    this.rotation = 0;
    this.rotationSlider.value = 0;
    this.rotationValue.textContent = '0°';
    this.position = 'center';
    document.querySelectorAll('.position-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pos === 'center');
    });
    this.offsetX = 0;
    this.offsetXSlider.value = 0;
    this.offsetXValue.textContent = '0px';
    this.offsetY = 0;
    this.offsetYSlider.value = 0;
    this.offsetYValue.textContent = '0px';
    this.enableShadow = false;
    this.enableShadowCheckbox.checked = false;

    this.fileInput.value = '';
    this.watermarkPanel.style.display = 'none';
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
  new TextWatermarkTool();
});
