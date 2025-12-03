/**
 * IMG-071 暈影效果
 * 為圖片添加邊緣暗角（暈影）效果
 */

class VignetteTool {
  constructor() {
    this.sourceImage = null;
    this.intensity = 50;
    this.size = 50;
    this.softness = 50;
    this.roundness = 50;
    this.color = '#000000';

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');
    this.previewInfo = document.getElementById('previewInfo');

    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.sizeSlider = document.getElementById('sizeSlider');
    this.sizeValue = document.getElementById('sizeValue');
    this.softnessSlider = document.getElementById('softnessSlider');
    this.softnessValue = document.getElementById('softnessValue');
    this.roundnessSlider = document.getElementById('roundnessSlider');
    this.roundnessValue = document.getElementById('roundnessValue');
    this.colorInput = document.getElementById('colorInput');

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

    // Sliders
    this.intensitySlider.addEventListener('input', () => {
      this.intensity = parseInt(this.intensitySlider.value);
      this.intensityValue.textContent = `${this.intensity}%`;
      this.updatePresets();
      this.processImage();
    });

    this.sizeSlider.addEventListener('input', () => {
      this.size = parseInt(this.sizeSlider.value);
      this.sizeValue.textContent = `${this.size}%`;
      this.updatePresets();
      this.processImage();
    });

    this.softnessSlider.addEventListener('input', () => {
      this.softness = parseInt(this.softnessSlider.value);
      this.softnessValue.textContent = `${this.softness}%`;
      this.updatePresets();
      this.processImage();
    });

    this.roundnessSlider.addEventListener('input', () => {
      this.roundness = parseInt(this.roundnessSlider.value);
      this.roundnessValue.textContent = `${this.roundness}%`;
      this.processImage();
    });

    // Color input
    this.colorInput.addEventListener('input', () => {
      this.color = this.colorInput.value;
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.intensity = parseInt(btn.dataset.intensity);
        this.size = parseInt(btn.dataset.size);
        this.softness = parseInt(btn.dataset.softness);
        this.intensitySlider.value = this.intensity;
        this.sizeSlider.value = this.size;
        this.softnessSlider.value = this.softness;
        this.intensityValue.textContent = `${this.intensity}%`;
        this.sizeValue.textContent = `${this.size}%`;
        this.softnessValue.textContent = `${this.softness}%`;
        this.updatePresets();
        this.processImage();
      });
    });

    // Buttons
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const i = parseInt(btn.dataset.intensity);
      const s = parseInt(btn.dataset.size);
      const sf = parseInt(btn.dataset.softness);
      btn.classList.toggle('active', i === this.intensity && s === this.size && sf === this.softness);
    });
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

        // Draw original
        this.originalCanvas.width = img.width;
        this.originalCanvas.height = img.height;
        this.originalCtx.drawImage(img, 0, 0);

        // Process
        this.processImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Draw original image
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Calculate vignette parameters
    const centerX = width / 2;
    const centerY = height / 2;

    // Size affects the inner radius where vignette starts
    const innerRadius = Math.min(width, height) * (this.size / 100) * 0.5;

    // Adjust outer radius based on roundness
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const outerRadius = maxDist * (1 + (100 - this.softness) / 100);

    // Get vignette color
    const color = this.hexToRgb(this.color);

    // Create radial gradient for vignette
    const gradient = this.resultCtx.createRadialGradient(
      centerX, centerY, innerRadius,
      centerX, centerY, outerRadius
    );

    // Gradient from transparent to vignette color
    const alpha = this.intensity / 100;
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);

    // Apply roundness by scaling the context
    this.resultCtx.save();

    if (this.roundness !== 50) {
      const scaleX = this.roundness < 50 ? 1 + (50 - this.roundness) / 100 : 1;
      const scaleY = this.roundness > 50 ? 1 + (this.roundness - 50) / 100 : 1;
      this.resultCtx.translate(centerX, centerY);
      this.resultCtx.scale(scaleX, scaleY);
      this.resultCtx.translate(-centerX, -centerY);
    }

    // Draw vignette overlay
    this.resultCtx.fillStyle = gradient;
    this.resultCtx.fillRect(0, 0, width, height);

    this.resultCtx.restore();

    this.previewInfo.textContent = `${width} × ${height} px | 強度: ${this.intensity}% | 範圍: ${this.size}%`;
    this.showStatus('success', '暈影效果已套用');
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vignette_${this.intensity}_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showStatus('success', '圖片已下載');
    }, 'image/png');
  }

  reset() {
    this.sourceImage = null;
    this.fileInput.value = '';

    this.uploadArea.style.display = 'block';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.disabled = true;

    this.intensity = 50;
    this.size = 50;
    this.softness = 50;
    this.roundness = 50;
    this.color = '#000000';

    this.intensitySlider.value = 50;
    this.sizeSlider.value = 50;
    this.softnessSlider.value = 50;
    this.roundnessSlider.value = 50;
    this.intensityValue.textContent = '50%';
    this.sizeValue.textContent = '50%';
    this.softnessValue.textContent = '50%';
    this.roundnessValue.textContent = '50%';
    this.colorInput.value = '#000000';
    this.updatePresets();

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
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
  new VignetteTool();
});
