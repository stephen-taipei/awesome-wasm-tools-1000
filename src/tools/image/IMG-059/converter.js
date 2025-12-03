/**
 * IMG-059 圖片比較滑桿
 * 建立前後對比滑桿效果圖 (Before/After)
 */

class ImageCompareTool {
  constructor() {
    this.beforeImage = null;
    this.afterImage = null;
    this.sliderStyle = 'vertical';
    this.sliderWidth = 4;
    this.sliderPosition = 50;
    this.isDragging = false;

    this.init();
  }

  init() {
    this.beforeUpload = document.getElementById('beforeUpload');
    this.afterUpload = document.getElementById('afterUpload');
    this.beforeInput = document.getElementById('beforeInput');
    this.afterInput = document.getElementById('afterInput');

    this.compareSection = document.getElementById('compareSection');
    this.compareContainer = document.getElementById('compareContainer');
    this.compareOverlay = document.getElementById('compareOverlay');
    this.compareSlider = document.getElementById('compareSlider');
    this.beforeImg = document.getElementById('beforeImage');
    this.afterImg = document.getElementById('afterImage');
    this.outputInfo = document.getElementById('outputInfo');

    this.optionsPanel = document.getElementById('optionsPanel');
    this.sliderWidthInput = document.getElementById('sliderWidth');
    this.sliderWidthValue = document.getElementById('sliderWidthValue');
    this.initialPosInput = document.getElementById('initialPos');
    this.initialPosValue = document.getElementById('initialPosValue');

    this.downloadImageBtn = document.getElementById('downloadImageBtn');
    this.downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusMessage = document.getElementById('statusMessage');

    this.bindEvents();
  }

  bindEvents() {
    // Before upload
    this.beforeUpload.addEventListener('click', () => this.beforeInput.click());
    this.beforeUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.beforeUpload.classList.add('drag-over');
    });
    this.beforeUpload.addEventListener('dragleave', () => {
      this.beforeUpload.classList.remove('drag-over');
    });
    this.beforeUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.beforeUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file, 'before');
    });
    this.beforeInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file, 'before');
    });

    // After upload
    this.afterUpload.addEventListener('click', () => this.afterInput.click());
    this.afterUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.afterUpload.classList.add('drag-over');
    });
    this.afterUpload.addEventListener('dragleave', () => {
      this.afterUpload.classList.remove('drag-over');
    });
    this.afterUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      this.afterUpload.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file, 'after');
    });
    this.afterInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file, 'after');
    });

    // Style options
    document.querySelectorAll('.style-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.style-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        this.sliderStyle = el.dataset.style;
        this.updateSliderStyle();
      });
    });

    // Slider options
    this.sliderWidthInput.addEventListener('input', () => {
      this.sliderWidth = parseInt(this.sliderWidthInput.value);
      this.sliderWidthValue.textContent = `${this.sliderWidth}px`;
      this.compareSlider.style.width = `${this.sliderWidth}px`;
    });

    this.initialPosInput.addEventListener('input', () => {
      this.sliderPosition = parseInt(this.initialPosInput.value);
      this.initialPosValue.textContent = `${this.sliderPosition}%`;
      this.updateSliderPosition();
    });

    // Slider drag
    this.compareSlider.addEventListener('mousedown', (e) => this.startDrag(e));
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', () => this.endDrag());

    // Touch support
    this.compareSlider.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrag(e.touches[0]);
    });
    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        this.onDrag(e.touches[0]);
      }
    });
    document.addEventListener('touchend', () => this.endDrag());

    // Container click/drag
    this.compareContainer.addEventListener('click', (e) => {
      if (e.target !== this.compareSlider && !this.compareSlider.contains(e.target)) {
        this.setPositionFromEvent(e);
      }
    });

    // Buttons
    this.downloadImageBtn.addEventListener('click', () => this.downloadImage());
    this.downloadHtmlBtn.addEventListener('click', () => this.downloadHtml());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  loadImage(file, type) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (type === 'before') {
          this.beforeImage = { img, dataUrl: e.target.result };
          this.beforeUpload.classList.add('has-image');
          this.beforeUpload.innerHTML = `
            <span class="upload-label before">Before</span>
            <img src="${e.target.result}" alt="Before">
          `;
        } else {
          this.afterImage = { img, dataUrl: e.target.result };
          this.afterUpload.classList.add('has-image');
          this.afterUpload.innerHTML = `
            <span class="upload-label after">After</span>
            <img src="${e.target.result}" alt="After">
          `;
        }
        this.checkReady();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    if (this.beforeImage && this.afterImage) {
      // Check dimension match
      if (this.beforeImage.img.width !== this.afterImage.img.width ||
          this.beforeImage.img.height !== this.afterImage.img.height) {
        this.showStatus('info', '圖片尺寸不同，將自動調整至相同大小');
      }

      this.beforeImg.src = this.beforeImage.dataUrl;
      this.afterImg.src = this.afterImage.dataUrl;

      this.beforeImg.onload = () => {
        this.compareSection.style.display = 'block';
        this.optionsPanel.style.display = 'block';
        this.downloadImageBtn.disabled = false;
        this.downloadHtmlBtn.disabled = false;

        // Set initial position
        this.updateSliderPosition();

        const width = this.afterImg.naturalWidth;
        const height = this.afterImg.naturalHeight;
        this.outputInfo.textContent = `${width} × ${height} px`;
      };
    }
  }

  updateSliderStyle() {
    // Currently only vertical is implemented
    // Horizontal mode would require different CSS and logic
    this.updateSliderPosition();
  }

  updateSliderPosition() {
    const containerRect = this.compareContainer.getBoundingClientRect();
    const imgRect = this.afterImg.getBoundingClientRect();

    const imgLeft = imgRect.left - containerRect.left;
    const imgWidth = imgRect.width;

    const position = imgLeft + (imgWidth * this.sliderPosition / 100);

    this.compareSlider.style.left = `${position}px`;
    this.compareOverlay.style.width = `${position}px`;
  }

  startDrag(e) {
    this.isDragging = true;
    this.compareContainer.style.cursor = 'ew-resize';
  }

  onDrag(e) {
    if (!this.isDragging) return;
    this.setPositionFromEvent(e);
  }

  setPositionFromEvent(e) {
    const containerRect = this.compareContainer.getBoundingClientRect();
    const imgRect = this.afterImg.getBoundingClientRect();

    const imgLeft = imgRect.left - containerRect.left;
    const imgWidth = imgRect.width;

    let x = e.clientX - containerRect.left;
    x = Math.max(imgLeft, Math.min(imgLeft + imgWidth, x));

    const percent = ((x - imgLeft) / imgWidth) * 100;
    this.sliderPosition = Math.round(percent);

    this.initialPosInput.value = this.sliderPosition;
    this.initialPosValue.textContent = `${this.sliderPosition}%`;

    this.compareSlider.style.left = `${x}px`;
    this.compareOverlay.style.width = `${x}px`;
  }

  endDrag() {
    this.isDragging = false;
    this.compareContainer.style.cursor = '';
  }

  downloadImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = this.afterImage.img.width;
    const height = this.afterImage.img.height;
    const splitX = Math.round(width * this.sliderPosition / 100);

    canvas.width = width;
    canvas.height = height;

    // Draw after image (right side)
    ctx.drawImage(this.afterImage.img, 0, 0);

    // Draw before image (left side)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, height);
    ctx.clip();
    ctx.drawImage(this.beforeImage.img, 0, 0);
    ctx.restore();

    // Draw slider line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = this.sliderWidth;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, height);
    ctx.stroke();

    // Draw labels
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    this.roundRect(ctx, 10, 10, 60, 24, 12);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('Before', 18, 27);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    this.roundRect(ctx, width - 70, 10, 60, 24, 12);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('After', width - 55, 27);

    canvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `compare_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '靜態比較圖已下載');
    }, 'image/png');
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  downloadHtml() {
    const html = this.generateInteractiveHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compare_interactive_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showStatus('success', '互動式 HTML 已下載');
  }

  generateInteractiveHtml() {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Before/After 比較</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1a1a2e;
      padding: 20px;
    }
    .compare-container {
      position: relative;
      max-width: 100%;
      user-select: none;
      border-radius: 8px;
      overflow: hidden;
    }
    .compare-image {
      display: block;
      max-width: 100%;
    }
    .compare-overlay {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${this.sliderPosition}%;
      overflow: hidden;
    }
    .compare-overlay img {
      display: block;
      max-width: none;
      height: 100%;
    }
    .compare-slider {
      position: absolute;
      top: 0;
      left: ${this.sliderPosition}%;
      bottom: 0;
      width: ${this.sliderWidth}px;
      background: white;
      cursor: ew-resize;
      transform: translateX(-50%);
    }
    .slider-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    .slider-handle::before, .slider-handle::after {
      content: '';
      position: absolute;
      border-style: solid;
    }
    .slider-handle::before {
      left: 6px;
      border-width: 6px 8px 6px 0;
      border-color: transparent #333 transparent transparent;
    }
    .slider-handle::after {
      right: 6px;
      border-width: 6px 0 6px 8px;
      border-color: transparent transparent transparent #333;
    }
    .label {
      position: absolute;
      top: 10px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .label.before { left: 10px; background: rgba(239,68,68,0.8); }
    .label.after { right: 10px; background: rgba(34,197,94,0.8); }
  </style>
</head>
<body>
  <div class="compare-container" id="container">
    <img class="compare-image" src="${this.afterImage.dataUrl}" alt="After">
    <div class="compare-overlay" id="overlay">
      <img src="${this.beforeImage.dataUrl}" alt="Before">
    </div>
    <div class="compare-slider" id="slider">
      <div class="slider-handle"></div>
    </div>
    <span class="label before">Before</span>
    <span class="label after">After</span>
  </div>
  <script>
    const container = document.getElementById('container');
    const overlay = document.getElementById('overlay');
    const slider = document.getElementById('slider');
    let isDragging = false;

    function updatePosition(e) {
      const rect = container.getBoundingClientRect();
      let x = (e.clientX || e.touches[0].clientX) - rect.left;
      x = Math.max(0, Math.min(rect.width, x));
      const percent = (x / rect.width) * 100;
      overlay.style.width = percent + '%';
      slider.style.left = percent + '%';
    }

    slider.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mousemove', (e) => isDragging && updatePosition(e));
    document.addEventListener('mouseup', () => isDragging = false);

    slider.addEventListener('touchstart', () => isDragging = true);
    document.addEventListener('touchmove', (e) => isDragging && updatePosition(e));
    document.addEventListener('touchend', () => isDragging = false);

    container.addEventListener('click', (e) => {
      if (!slider.contains(e.target)) updatePosition(e);
    });
  </script>
</body>
</html>`;
  }

  reset() {
    this.beforeImage = null;
    this.afterImage = null;
    this.sliderPosition = 50;

    this.beforeInput.value = '';
    this.afterInput.value = '';

    this.beforeUpload.classList.remove('has-image');
    this.beforeUpload.innerHTML = `
      <span class="upload-label before">Before</span>
      <div class="upload-icon">🖼️</div>
      <div class="upload-text">點擊或拖放「處理前」圖片</div>
      <div class="upload-hint">支援 PNG、JPG、WebP</div>
    `;

    this.afterUpload.classList.remove('has-image');
    this.afterUpload.innerHTML = `
      <span class="upload-label after">After</span>
      <div class="upload-icon">🖼️</div>
      <div class="upload-text">點擊或拖放「處理後」圖片</div>
      <div class="upload-hint">支援 PNG、JPG、WebP</div>
    `;

    this.compareSection.style.display = 'none';
    this.optionsPanel.style.display = 'none';
    this.downloadImageBtn.disabled = true;
    this.downloadHtmlBtn.disabled = true;

    this.initialPosInput.value = 50;
    this.initialPosValue.textContent = '50%';

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
  new ImageCompareTool();
});
