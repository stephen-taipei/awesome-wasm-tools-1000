/**
 * IMG-025 模糊濾鏡
 * 高斯模糊、動態模糊、徑向模糊效果
 */

class BlurFilter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedType = 'gaussian';
    this.radius = 10;
    this.angle = 0;

    this.blurTypes = {
      gaussian: { name: '高斯模糊', needsAngle: false },
      box: { name: '方框模糊', needsAngle: false },
      motion: { name: '動態模糊', needsAngle: true },
      radial: { name: '徑向模糊', needsAngle: false },
      zoom: { name: '縮放模糊', needsAngle: false },
      lens: { name: '鏡頭模糊', needsAngle: false }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.blurPanel = document.getElementById('blurPanel');
    this.adjustPanel = document.getElementById('adjustPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.blurCards = document.querySelectorAll('.blur-card');

    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');
    this.angleSlider = document.getElementById('angleSlider');
    this.angleValue = document.getElementById('angleValue');
    this.angleRow = document.getElementById('angleRow');
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

    // Blur type selection
    this.blurCards.forEach(card => {
      card.addEventListener('click', () => {
        this.blurCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedType = card.dataset.type;
        this.angleRow.style.display = this.blurTypes[this.selectedType].needsAngle ? 'flex' : 'none';
        this.updatePreview();
      });
    });

    // Sliders
    this.radiusSlider.addEventListener('input', () => {
      this.radius = parseInt(this.radiusSlider.value);
      this.radiusValue.textContent = `${this.radius}px`;
      this.updatePreview();
    });

    this.angleSlider.addEventListener('input', () => {
      this.angle = parseInt(this.angleSlider.value);
      this.angleValue.textContent = `${this.angle}°`;
      this.updatePreview();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.applyFilter());
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

        this.blurPanel.style.display = 'block';
        this.adjustPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請選擇模糊類型');
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

    // Scale radius for preview
    const previewRadius = Math.max(1, Math.round(this.radius * (width / this.originalImage.naturalWidth)));

    this.applyBlur(ctx, canvas, previewRadius);

    this.previewImage.src = canvas.toDataURL();
  }

  applyBlur(ctx, canvas, radius) {
    const width = canvas.width;
    const height = canvas.height;

    switch (this.selectedType) {
      case 'gaussian':
      case 'box':
        // Use CSS filter for gaussian/box blur
        ctx.filter = `blur(${radius}px)`;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
        break;

      case 'motion':
        this.applyMotionBlur(ctx, canvas, radius);
        break;

      case 'radial':
        this.applyRadialBlur(ctx, canvas, radius);
        break;

      case 'zoom':
        this.applyZoomBlur(ctx, canvas, radius);
        break;

      case 'lens':
        this.applyLensBlur(ctx, canvas, radius);
        break;
    }
  }

  applyMotionBlur(ctx, canvas, radius) {
    const width = canvas.width;
    const height = canvas.height;
    const angleRad = (this.angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * radius / 10;
    const dy = Math.sin(angleRad) * radius / 10;
    const steps = Math.min(radius, 15);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1 / steps;

    for (let i = 0; i < steps; i++) {
      const offset = (i - steps / 2);
      ctx.drawImage(tempCanvas, offset * dx, offset * dy);
    }
    ctx.globalAlpha = 1;
  }

  applyRadialBlur(ctx, canvas, radius) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const steps = Math.min(radius, 10);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1 / steps;

    for (let i = 0; i < steps; i++) {
      const angle = (i * radius * 0.002);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle - (steps * radius * 0.001));
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  applyZoomBlur(ctx, canvas, radius) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const steps = Math.min(radius, 10);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1 / steps;

    for (let i = 0; i < steps; i++) {
      const scale = 1 + (i - steps / 2) * (radius * 0.002);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  applyLensBlur(ctx, canvas, radius) {
    // Simulate lens blur with multiple offset gaussian blurs
    const width = canvas.width;
    const height = canvas.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.filter = `blur(${radius}px)`;
    tempCtx.drawImage(canvas, 0, 0);

    // Create hexagonal bokeh effect by layering
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);

    // Add slight glow to highlights
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.1;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  async applyFilter() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用模糊效果...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用模糊效果...');
      this.applyBlur(ctx, canvas, this.radius);

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
      this.showStatus('success', `模糊效果套用完成！類型：${this.blurTypes[this.selectedType].name}`);

    } catch (error) {
      this.showStatus('error', `套用失敗：${error.message}`);
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
    link.download = `${originalName}_blur_${this.selectedType}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedType = 'gaussian';
    this.radius = 10;
    this.angle = 0;

    this.fileInput.value = '';
    this.blurPanel.style.display = 'none';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    this.radiusSlider.value = 10;
    this.radiusValue.textContent = '10px';
    this.angleSlider.value = 0;
    this.angleValue.textContent = '0°';
    this.angleRow.style.display = 'none';

    this.blurCards.forEach(c => c.classList.remove('selected'));
    this.blurCards[0].classList.add('selected');
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
  new BlurFilter();
});
