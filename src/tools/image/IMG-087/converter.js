/**
 * IMG-087 文字添加
 * 在圖片上添加自訂文字標註
 */

class TextAddTool {
  constructor() {
    this.sourceImage = null;

    // Text settings
    this.text = 'Hello World';
    this.fontFamily = 'Arial';
    this.fontSize = 48;
    this.fontWeight = 'normal';
    this.fontStyle = 'normal';
    this.fillColor = '#ffffff';
    this.strokeColor = '#000000';
    this.strokeWidth = 0;
    this.textAlign = 'center';
    this.posX = 50;
    this.posY = 50;
    this.rotation = 0;
    this.opacity = 100;
    this.enableShadow = false;
    this.shadowBlur = 5;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.editorLayout = document.getElementById('editorLayout');

    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    // Text input
    this.textInput = document.getElementById('textInput');

    // Font settings
    this.fontFamilySelect = document.getElementById('fontFamily');
    this.fontSizeSlider = document.getElementById('fontSize');
    this.fontSizeValue = document.getElementById('fontSizeValue');
    this.fontWeightSelect = document.getElementById('fontWeight');
    this.fontStyleSelect = document.getElementById('fontStyle');

    // Color settings
    this.fillColorPicker = document.getElementById('fillColor');
    this.strokeColorPicker = document.getElementById('strokeColor');
    this.strokeWidthSlider = document.getElementById('strokeWidth');
    this.strokeWidthValue = document.getElementById('strokeWidthValue');

    // Position settings
    this.posXSlider = document.getElementById('posX');
    this.posXValue = document.getElementById('posXValue');
    this.posYSlider = document.getElementById('posY');
    this.posYValue = document.getElementById('posYValue');
    this.rotationSlider = document.getElementById('rotation');
    this.rotationValue = document.getElementById('rotationValue');

    // Effect settings
    this.opacitySlider = document.getElementById('opacity');
    this.opacityValue = document.getElementById('opacityValue');
    this.enableShadowCheckbox = document.getElementById('enableShadow');
    this.shadowOptions = document.getElementById('shadowOptions');
    this.shadowBlurSlider = document.getElementById('shadowBlur');
    this.shadowBlurValue = document.getElementById('shadowBlurValue');

    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Upload events
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
      if (file) this.loadImage(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Text input
    this.textInput.addEventListener('input', () => {
      this.text = this.textInput.value;
      if (this.sourceImage) this.render();
    });

    // Font settings
    this.fontFamilySelect.addEventListener('change', () => {
      this.fontFamily = this.fontFamilySelect.value;
      if (this.sourceImage) this.render();
    });

    this.fontSizeSlider.addEventListener('input', () => {
      this.fontSize = parseInt(this.fontSizeSlider.value);
      this.fontSizeValue.textContent = this.fontSize + ' px';
      if (this.sourceImage) this.render();
    });

    this.fontWeightSelect.addEventListener('change', () => {
      this.fontWeight = this.fontWeightSelect.value;
      if (this.sourceImage) this.render();
    });

    this.fontStyleSelect.addEventListener('change', () => {
      this.fontStyle = this.fontStyleSelect.value;
      if (this.sourceImage) this.render();
    });

    // Color settings
    this.fillColorPicker.addEventListener('input', () => {
      this.fillColor = this.fillColorPicker.value;
      if (this.sourceImage) this.render();
    });

    this.strokeColorPicker.addEventListener('input', () => {
      this.strokeColor = this.strokeColorPicker.value;
      if (this.sourceImage) this.render();
    });

    this.strokeWidthSlider.addEventListener('input', () => {
      this.strokeWidth = parseInt(this.strokeWidthSlider.value);
      this.strokeWidthValue.textContent = this.strokeWidth + ' px';
      if (this.sourceImage) this.render();
    });

    // Align buttons
    document.querySelectorAll('.align-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.textAlign = btn.dataset.align;
        if (this.sourceImage) this.render();
      });
    });

    // Position settings
    this.posXSlider.addEventListener('input', () => {
      this.posX = parseInt(this.posXSlider.value);
      this.posXValue.textContent = this.posX + '%';
      if (this.sourceImage) this.render();
    });

    this.posYSlider.addEventListener('input', () => {
      this.posY = parseInt(this.posYSlider.value);
      this.posYValue.textContent = this.posY + '%';
      if (this.sourceImage) this.render();
    });

    this.rotationSlider.addEventListener('input', () => {
      this.rotation = parseInt(this.rotationSlider.value);
      this.rotationValue.textContent = this.rotation + '°';
      if (this.sourceImage) this.render();
    });

    // Effect settings
    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = this.opacity + '%';
      if (this.sourceImage) this.render();
    });

    this.enableShadowCheckbox.addEventListener('change', () => {
      this.enableShadow = this.enableShadowCheckbox.checked;
      this.shadowOptions.style.display = this.enableShadow ? 'block' : 'none';
      if (this.sourceImage) this.render();
    });

    this.shadowBlurSlider.addEventListener('input', () => {
      this.shadowBlur = parseInt(this.shadowBlurSlider.value);
      this.shadowBlurValue.textContent = this.shadowBlur + ' px';
      if (this.sourceImage) this.render();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.uploadArea.style.display = 'none';
        this.editorLayout.classList.add('active');
        this.downloadBtn.disabled = false;

        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    const ctx = this.previewCtx;

    // Draw source image
    ctx.drawImage(this.sourceImage, 0, 0);

    // Don't draw if text is empty
    if (!this.text.trim()) {
      this.previewInfo.textContent = `${width} × ${height} px`;
      return;
    }

    // Calculate position
    const x = (this.posX / 100) * width;
    const y = (this.posY / 100) * height;

    // Set text properties
    ctx.save();

    // Translate to position and rotate
    ctx.translate(x, y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    // Set font
    ctx.font = `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px "${this.fontFamily}"`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = 'middle';

    // Set opacity
    ctx.globalAlpha = this.opacity / 100;

    // Handle multiline text
    const lines = this.text.split('\n');
    const lineHeight = this.fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = -totalHeight / 2 + lineHeight / 2;

    // Draw shadow if enabled
    if (this.enableShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = this.shadowBlur;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Draw each line
    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;

      // Draw stroke first (if any)
      if (this.strokeWidth > 0) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(line, 0, lineY);
      }

      // Draw fill
      ctx.fillStyle = this.fillColor;
      ctx.fillText(line, 0, lineY);
    });

    ctx.restore();

    this.previewInfo.textContent = `${width} × ${height} px | 字型: ${this.fontFamily} ${this.fontSize}px`;
    this.showStatus('success', '文字添加完成');
  }

  download() {
    this.previewCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `text_added_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    // Reset all values
    this.text = 'Hello World';
    this.fontFamily = 'Arial';
    this.fontSize = 48;
    this.fontWeight = 'normal';
    this.fontStyle = 'normal';
    this.fillColor = '#ffffff';
    this.strokeColor = '#000000';
    this.strokeWidth = 0;
    this.textAlign = 'center';
    this.posX = 50;
    this.posY = 50;
    this.rotation = 0;
    this.opacity = 100;
    this.enableShadow = false;
    this.shadowBlur = 5;

    // Reset UI
    this.uploadArea.style.display = 'block';
    this.editorLayout.classList.remove('active');
    this.downloadBtn.disabled = true;

    this.textInput.value = 'Hello World';
    this.fontFamilySelect.value = 'Arial';
    this.fontSizeSlider.value = 48;
    this.fontSizeValue.textContent = '48 px';
    this.fontWeightSelect.value = 'normal';
    this.fontStyleSelect.value = 'normal';
    this.fillColorPicker.value = '#ffffff';
    this.strokeColorPicker.value = '#000000';
    this.strokeWidthSlider.value = 0;
    this.strokeWidthValue.textContent = '0 px';

    document.querySelectorAll('.align-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === 'center');
    });

    this.posXSlider.value = 50;
    this.posXValue.textContent = '50%';
    this.posYSlider.value = 50;
    this.posYValue.textContent = '50%';
    this.rotationSlider.value = 0;
    this.rotationValue.textContent = '0°';

    this.opacitySlider.value = 100;
    this.opacityValue.textContent = '100%';
    this.enableShadowCheckbox.checked = false;
    this.shadowOptions.style.display = 'none';
    this.shadowBlurSlider.value = 5;
    this.shadowBlurValue.textContent = '5 px';

    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewInfo.textContent = '';
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
  new TextAddTool();
});
