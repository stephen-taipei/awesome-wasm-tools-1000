/**
 * IMG-072 光暈效果
 * 添加鏡頭光暈/光斑效果
 */

class LensFlareTool {
  constructor() {
    this.sourceImage = null;
    this.intensity = 70;
    this.size = 40;
    this.rays = 6;
    this.color = '#ffdd88';
    this.flareX = 0.5; // Position as percentage
    this.flareY = 0.3;

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

    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.sizeSlider = document.getElementById('sizeSlider');
    this.sizeValue = document.getElementById('sizeValue');
    this.raysSlider = document.getElementById('raysSlider');
    this.raysValue = document.getElementById('raysValue');
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

    // Canvas click for position
    this.resultCanvas.addEventListener('click', (e) => {
      const rect = this.resultCanvas.getBoundingClientRect();
      const scaleX = this.resultCanvas.width / rect.width;
      const scaleY = this.resultCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.flareX = x / this.resultCanvas.width;
      this.flareY = y / this.resultCanvas.height;
      this.processImage();
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

    this.raysSlider.addEventListener('input', () => {
      this.rays = parseInt(this.raysSlider.value);
      this.raysValue.textContent = this.rays;
      this.updatePresets();
      this.processImage();
    });

    // Color input
    this.colorInput.addEventListener('input', () => {
      this.color = this.colorInput.value;
      this.updatePresets();
      this.processImage();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.intensity = parseInt(btn.dataset.intensity);
        this.size = parseInt(btn.dataset.size);
        this.rays = parseInt(btn.dataset.rays);
        this.color = btn.dataset.color;

        this.intensitySlider.value = this.intensity;
        this.sizeSlider.value = this.size;
        this.raysSlider.value = this.rays;
        this.colorInput.value = this.color;

        this.intensityValue.textContent = `${this.intensity}%`;
        this.sizeValue.textContent = `${this.size}%`;
        this.raysValue.textContent = this.rays;

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
      const r = parseInt(btn.dataset.rays);
      const c = btn.dataset.color;
      btn.classList.toggle('active',
        i === this.intensity && s === this.size && r === this.rays && c === this.color
      );
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
    } : { r: 255, g: 221, b: 136 };
  }

  processImage() {
    if (!this.sourceImage) return;

    const width = this.sourceImage.width;
    const height = this.sourceImage.height;

    this.resultCanvas.width = width;
    this.resultCanvas.height = height;

    // Draw original image
    this.resultCtx.drawImage(this.sourceImage, 0, 0);

    // Calculate flare position
    const flareX = width * this.flareX;
    const flareY = height * this.flareY;
    const maxDim = Math.max(width, height);
    const flareSize = maxDim * (this.size / 100);
    const alpha = this.intensity / 100;
    const color = this.hexToRgb(this.color);

    // Set composite operation for additive blending
    this.resultCtx.globalCompositeOperation = 'screen';

    // Draw main glow
    this.drawMainGlow(flareX, flareY, flareSize, color, alpha);

    // Draw rays if enabled
    if (this.rays > 0) {
      this.drawRays(flareX, flareY, flareSize, color, alpha);
    }

    // Draw secondary flares (lens artifacts)
    this.drawSecondaryFlares(flareX, flareY, width, height, color, alpha);

    // Reset composite operation
    this.resultCtx.globalCompositeOperation = 'source-over';

    this.previewInfo.textContent = `${width} × ${height} px | 位置: (${Math.round(flareX)}, ${Math.round(flareY)})`;
    this.showStatus('success', '光暈效果已套用');
  }

  drawMainGlow(x, y, size, color, alpha) {
    // Outer glow
    const gradient1 = this.resultCtx.createRadialGradient(x, y, 0, x, y, size);
    gradient1.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
    gradient1.addColorStop(0.1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.7})`);
    gradient1.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
    gradient1.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    this.resultCtx.fillStyle = gradient1;
    this.resultCtx.beginPath();
    this.resultCtx.arc(x, y, size, 0, Math.PI * 2);
    this.resultCtx.fill();

    // Inner bright core
    const coreSize = size * 0.15;
    const gradient2 = this.resultCtx.createRadialGradient(x, y, 0, x, y, coreSize);
    gradient2.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient2.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
    gradient2.addColorStop(1, `rgba(255, 255, 255, 0)`);

    this.resultCtx.fillStyle = gradient2;
    this.resultCtx.beginPath();
    this.resultCtx.arc(x, y, coreSize, 0, Math.PI * 2);
    this.resultCtx.fill();
  }

  drawRays(x, y, size, color, alpha) {
    const rayLength = size * 1.5;
    const rayWidth = size * 0.02;

    this.resultCtx.save();
    this.resultCtx.translate(x, y);

    for (let i = 0; i < this.rays; i++) {
      const angle = (i / this.rays) * Math.PI * 2;
      this.resultCtx.save();
      this.resultCtx.rotate(angle);

      // Draw ray
      const rayGradient = this.resultCtx.createLinearGradient(0, 0, rayLength, 0);
      rayGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
      rayGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`);
      rayGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      this.resultCtx.fillStyle = rayGradient;
      this.resultCtx.beginPath();
      this.resultCtx.moveTo(0, -rayWidth);
      this.resultCtx.lineTo(rayLength, 0);
      this.resultCtx.lineTo(0, rayWidth);
      this.resultCtx.closePath();
      this.resultCtx.fill();

      this.resultCtx.restore();
    }

    this.resultCtx.restore();
  }

  drawSecondaryFlares(flareX, flareY, width, height, color, alpha) {
    // Calculate vector from center to flare
    const centerX = width / 2;
    const centerY = height / 2;
    const dx = flareX - centerX;
    const dy = flareY - centerY;

    // Draw multiple secondary flares along the opposite direction
    const flarePositions = [0.3, 0.5, 0.7, 1.2, 1.5];
    const flareSizes = [0.08, 0.12, 0.06, 0.15, 0.1];

    flarePositions.forEach((pos, idx) => {
      const fx = centerX - dx * pos;
      const fy = centerY - dy * pos;
      const fs = Math.max(width, height) * flareSizes[idx] * (this.size / 100);

      // Circular flare
      const gradient = this.resultCtx.createRadialGradient(fx, fy, 0, fx, fy, fs);

      // Alternate colors for variety
      const hueShift = idx * 30;
      const r = Math.min(255, color.r + hueShift);
      const g = Math.min(255, color.g + hueShift / 2);
      const b = Math.min(255, color.b);

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      this.resultCtx.fillStyle = gradient;
      this.resultCtx.beginPath();
      this.resultCtx.arc(fx, fy, fs, 0, Math.PI * 2);
      this.resultCtx.fill();

      // Add ring artifacts for some flares
      if (idx % 2 === 0) {
        this.resultCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`;
        this.resultCtx.lineWidth = 2;
        this.resultCtx.beginPath();
        this.resultCtx.arc(fx, fy, fs * 0.7, 0, Math.PI * 2);
        this.resultCtx.stroke();
      }
    });

    // Add hexagonal bokeh shape
    this.drawHexagonalBokeh(centerX - dx * 0.9, centerY - dy * 0.9,
      Math.max(width, height) * 0.05 * (this.size / 100), color, alpha * 0.25);
  }

  drawHexagonalBokeh(x, y, size, color, alpha) {
    this.resultCtx.save();
    this.resultCtx.translate(x, y);

    const gradient = this.resultCtx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

    this.resultCtx.fillStyle = gradient;
    this.resultCtx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) {
        this.resultCtx.moveTo(px, py);
      } else {
        this.resultCtx.lineTo(px, py);
      }
    }

    this.resultCtx.closePath();
    this.resultCtx.fill();

    this.resultCtx.restore();
  }

  download() {
    this.resultCanvas.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `lens_flare_${Date.now()}.png`;
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

    this.intensity = 70;
    this.size = 40;
    this.rays = 6;
    this.color = '#ffdd88';
    this.flareX = 0.5;
    this.flareY = 0.3;

    this.intensitySlider.value = 70;
    this.sizeSlider.value = 40;
    this.raysSlider.value = 6;
    this.colorInput.value = '#ffdd88';
    this.intensityValue.textContent = '70%';
    this.sizeValue.textContent = '40%';
    this.raysValue.textContent = '6';
    this.updatePresets();

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
  new LensFlareTool();
});
