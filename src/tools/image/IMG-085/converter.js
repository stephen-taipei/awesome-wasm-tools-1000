/**
 * IMG-085 圓角處理
 * 將圖片轉為圓角矩形
 */

class RoundCornerTool {
  constructor() {
    this.sourceImage = null;
    this.radius = 20;
    this.cornerMode = 'all';

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

    this.radiusSlider = document.getElementById('radiusSlider');
    this.radiusValue = document.getElementById('radiusValue');

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
    document.querySelectorAll('.preset-btn[data-radius]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.radius = parseInt(btn.dataset.radius);
        this.radiusSlider.value = this.radius;
        this.radiusValue.textContent = this.radius + '%';
        document.querySelectorAll('.preset-btn[data-radius]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Corner mode buttons
    document.querySelectorAll('.corner-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cornerMode = btn.dataset.corner;
        document.querySelectorAll('.corner-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sourceImage) this.processImage();
      });
    });

    // Slider
    this.radiusSlider.addEventListener('input', () => {
      this.radius = parseInt(this.radiusSlider.value);
      this.radiusValue.textContent = this.radius + '%';
      document.querySelectorAll('.preset-btn[data-radius]').forEach(b => b.classList.remove('active'));
      if (this.sourceImage) this.processImage();
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

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    const ctx = this.resultCtx;
    ctx.clearRect(0, 0, width, height);

    // Calculate actual radius based on percentage
    const maxRadius = Math.min(width, height) / 2;
    const actualRadius = maxRadius * (this.radius / 50);

    // Get corner radii based on mode
    let tl, tr, br, bl;
    switch (this.cornerMode) {
      case 'all':
        tl = tr = br = bl = actualRadius;
        break;
      case 'top':
        tl = tr = actualRadius;
        br = bl = 0;
        break;
      case 'bottom':
        tl = tr = 0;
        br = bl = actualRadius;
        break;
      case 'left':
        tl = bl = actualRadius;
        tr = br = 0;
        break;
      case 'right':
        tr = br = actualRadius;
        tl = bl = 0;
        break;
      default:
        tl = tr = br = bl = actualRadius;
    }

    // Draw rounded rectangle path
    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.lineTo(width - tr, 0);
    ctx.arcTo(width, 0, width, tr, tr);
    ctx.lineTo(width, height - br);
    ctx.arcTo(width, height, width - br, height, br);
    ctx.lineTo(bl, height);
    ctx.arcTo(0, height, 0, height - bl, bl);
    ctx.lineTo(0, tl);
    ctx.arcTo(0, 0, tl, 0, tl);
    ctx.closePath();

    // Clip and draw image
    ctx.clip();
    ctx.drawImage(this.sourceImage, 0, 0);

    const cornerModeNames = {
      all: '全部圓角',
      top: '上方圓角',
      bottom: '下方圓角',
      left: '左側圓角',
      right: '右側圓角'
    };

    this.previewInfo.textContent = `${width} × ${height} px | ${cornerModeNames[this.cornerMode]} ${this.radius}% (${Math.round(actualRadius)}px)`;
    this.showStatus('success', '圓角處理完成');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rounded_${this.radius}pct_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';
    this.radius = 20;
    this.cornerMode = 'all';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    document.querySelectorAll('.preset-btn[data-radius]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.radius === '20');
    });
    document.querySelectorAll('.corner-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.corner === 'all');
    });

    this.radiusSlider.value = 20;
    this.radiusValue.textContent = '20%';

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
  new RoundCornerTool();
});
