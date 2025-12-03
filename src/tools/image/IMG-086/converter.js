/**
 * IMG-086 陰影效果
 * 為圖片添加投影陰影效果
 */

class ShadowTool {
  constructor() {
    this.sourceImage = null;
    this.offsetX = 5;
    this.offsetY = 5;
    this.blur = 15;
    this.spread = 0;
    this.opacity = 40;
    this.shadowColor = '#000000';

    // Presets
    this.presets = {
      soft: { offsetX: 5, offsetY: 5, blur: 15, spread: 0, opacity: 30 },
      medium: { offsetX: 8, offsetY: 8, blur: 20, spread: 0, opacity: 45 },
      strong: { offsetX: 12, offsetY: 12, blur: 30, spread: 5, opacity: 60 },
      float: { offsetX: 0, offsetY: 20, blur: 40, spread: -5, opacity: 35 },
      flat: { offsetX: 5, offsetY: 5, blur: 0, spread: 0, opacity: 100 }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.offsetXSlider = document.getElementById('offsetXSlider');
    this.offsetXValue = document.getElementById('offsetXValue');
    this.offsetYSlider = document.getElementById('offsetYSlider');
    this.offsetYValue = document.getElementById('offsetYValue');
    this.blurSlider = document.getElementById('blurSlider');
    this.blurValue = document.getElementById('blurValue');
    this.spreadSlider = document.getElementById('spreadSlider');
    this.spreadValue = document.getElementById('spreadValue');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.opacityValue = document.getElementById('opacityValue');
    this.colorPicker = document.getElementById('colorPicker');

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

    // Preset buttons
    document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = this.presets[btn.dataset.preset];
        if (preset) {
          this.applyPreset(preset);
          document.querySelectorAll('.preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    // Sliders
    this.offsetXSlider.addEventListener('input', () => {
      this.offsetX = parseInt(this.offsetXSlider.value);
      this.offsetXValue.textContent = this.offsetX + ' px';
      this.clearPresetActive();
      if (this.sourceImage) this.processImage();
    });

    this.offsetYSlider.addEventListener('input', () => {
      this.offsetY = parseInt(this.offsetYSlider.value);
      this.offsetYValue.textContent = this.offsetY + ' px';
      this.clearPresetActive();
      if (this.sourceImage) this.processImage();
    });

    this.blurSlider.addEventListener('input', () => {
      this.blur = parseInt(this.blurSlider.value);
      this.blurValue.textContent = this.blur + ' px';
      this.clearPresetActive();
      if (this.sourceImage) this.processImage();
    });

    this.spreadSlider.addEventListener('input', () => {
      this.spread = parseInt(this.spreadSlider.value);
      this.spreadValue.textContent = this.spread + ' px';
      this.clearPresetActive();
      if (this.sourceImage) this.processImage();
    });

    this.opacitySlider.addEventListener('input', () => {
      this.opacity = parseInt(this.opacitySlider.value);
      this.opacityValue.textContent = this.opacity + '%';
      this.clearPresetActive();
      if (this.sourceImage) this.processImage();
    });

    this.colorPicker.addEventListener('input', () => {
      this.shadowColor = this.colorPicker.value;
      if (this.sourceImage) this.processImage();
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    this.offsetX = preset.offsetX;
    this.offsetY = preset.offsetY;
    this.blur = preset.blur;
    this.spread = preset.spread;
    this.opacity = preset.opacity;

    this.offsetXSlider.value = this.offsetX;
    this.offsetXValue.textContent = this.offsetX + ' px';
    this.offsetYSlider.value = this.offsetY;
    this.offsetYValue.textContent = this.offsetY + ' px';
    this.blurSlider.value = this.blur;
    this.blurValue.textContent = this.blur + ' px';
    this.spreadSlider.value = this.spread;
    this.spreadValue.textContent = this.spread + ' px';
    this.opacitySlider.value = this.opacity;
    this.opacityValue.textContent = this.opacity + '%';

    if (this.sourceImage) this.processImage();
  }

  clearPresetActive() {
    document.querySelectorAll('.preset-btn[data-preset]').forEach(b => b.classList.remove('active'));
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
        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.downloadBtn.disabled = false;

        this.processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  processImage() {
    if (!this.sourceImage) return;

    const imgW = this.sourceImage.width;
    const imgH = this.sourceImage.height;

    // Calculate canvas size to accommodate shadow
    const padding = Math.max(
      Math.abs(this.offsetX) + this.blur + this.spread,
      Math.abs(this.offsetY) + this.blur + this.spread
    ) + 20;

    const canvasW = imgW + padding * 2;
    const canvasH = imgH + padding * 2;

    this.resultCanvas.width = canvasW;
    this.resultCanvas.height = canvasH;

    const ctx = this.resultCtx;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Calculate shadow color with opacity
    const r = parseInt(this.shadowColor.slice(1, 3), 16);
    const g = parseInt(this.shadowColor.slice(3, 5), 16);
    const b = parseInt(this.shadowColor.slice(5, 7), 16);
    const shadowColorRgba = `rgba(${r}, ${g}, ${b}, ${this.opacity / 100})`;

    // Draw shadow
    ctx.save();

    // For spread, we scale the shadow image
    if (this.spread !== 0) {
      const spreadScale = 1 + (this.spread / Math.max(imgW, imgH)) * 2;
      const spreadW = imgW * spreadScale;
      const spreadH = imgH * spreadScale;
      const spreadOffsetX = (imgW - spreadW) / 2;
      const spreadOffsetY = (imgH - spreadH) / 2;

      // Create shadow canvas
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = canvasW;
      shadowCanvas.height = canvasH;
      const shadowCtx = shadowCanvas.getContext('2d');

      // Draw scaled image for shadow shape
      shadowCtx.drawImage(
        this.sourceImage,
        padding + this.offsetX + spreadOffsetX,
        padding + this.offsetY + spreadOffsetY,
        spreadW,
        spreadH
      );

      // Get image data and colorize
      const imageData = shadowCtx.getImageData(0, 0, canvasW, canvasH);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = Math.round(data[i + 3] * (this.opacity / 100));
        }
      }

      shadowCtx.putImageData(imageData, 0, 0);

      // Apply blur using filter
      ctx.filter = `blur(${this.blur}px)`;
      ctx.drawImage(shadowCanvas, 0, 0);
      ctx.filter = 'none';
    } else {
      // Simple shadow using canvas shadow API
      ctx.shadowColor = shadowColorRgba;
      ctx.shadowBlur = this.blur;
      ctx.shadowOffsetX = this.offsetX;
      ctx.shadowOffsetY = this.offsetY;
      ctx.drawImage(this.sourceImage, padding, padding);
      ctx.shadowColor = 'transparent';
    }

    ctx.restore();

    // Draw original image on top
    ctx.drawImage(this.sourceImage, padding, padding);

    this.previewInfo.textContent = `${canvasW} × ${canvasH} px | 偏移: (${this.offsetX}, ${this.offsetY}) | 模糊: ${this.blur}px`;
    this.showStatus('success', '陰影效果添加完成');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `shadow_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.offsetX = 5;
    this.offsetY = 5;
    this.blur = 15;
    this.spread = 0;
    this.opacity = 40;
    this.shadowColor = '#000000';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === 'soft');
    });

    this.offsetXSlider.value = 5;
    this.offsetXValue.textContent = '5 px';
    this.offsetYSlider.value = 5;
    this.offsetYValue.textContent = '5 px';
    this.blurSlider.value = 15;
    this.blurValue.textContent = '15 px';
    this.spreadSlider.value = 0;
    this.spreadValue.textContent = '0 px';
    this.opacitySlider.value = 40;
    this.opacityValue.textContent = '40%';
    this.colorPicker.value = '#000000';

    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
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
  new ShadowTool();
});
