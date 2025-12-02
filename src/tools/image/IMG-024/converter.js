/**
 * IMG-024 復古/懷舊濾鏡
 * 套用復古色調，模擬老照片效果
 */

class VintageFilter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedFilter = 'sepia';
    this.intensity = 100;
    this.grain = 10;
    this.vignette = 30;
    this.fade = 10;
    this.enableGrain = true;
    this.enableVignette = true;
    this.enableScratch = false;

    // Vintage filter presets
    this.filters = {
      sepia: {
        name: '懷舊褐色',
        // Sepia tone color matrix
        colorMatrix: [
          0.393, 0.769, 0.189, 0, 0,
          0.349, 0.686, 0.168, 0, 0,
          0.272, 0.534, 0.131, 0, 0,
          0, 0, 0, 1, 0
        ],
        contrast: 1.1,
        saturation: 0.8,
        warmth: 20
      },
      vintage: {
        name: '復古褪色',
        colorMatrix: [
          0.5, 0.5, 0.2, 0, 20,
          0.4, 0.5, 0.2, 0, 15,
          0.3, 0.4, 0.3, 0, 10,
          0, 0, 0, 1, 0
        ],
        contrast: 0.95,
        saturation: 0.6,
        warmth: 10
      },
      retro70s: {
        name: '70年代',
        colorMatrix: [
          1.2, 0.1, 0, 0, 15,
          0.1, 1.1, 0, 0, 10,
          0, 0.1, 0.9, 0, -10,
          0, 0, 0, 1, 0
        ],
        contrast: 1.15,
        saturation: 1.1,
        warmth: 30
      },
      faded: {
        name: '褪色膠片',
        colorMatrix: [
          0.9, 0.1, 0.1, 0, 10,
          0.1, 0.9, 0.1, 0, 10,
          0.1, 0.1, 1.0, 0, 15,
          0, 0, 0, 1, 0
        ],
        contrast: 0.9,
        saturation: 0.5,
        warmth: -10
      },
      polaroid: {
        name: '寶麗來',
        colorMatrix: [
          1.1, 0.1, 0, 0, 10,
          0, 1.05, 0.05, 0, 5,
          -0.05, 0.05, 1.1, 0, 0,
          0, 0, 0, 1, 0
        ],
        contrast: 1.05,
        saturation: 0.9,
        warmth: 15
      },
      lomo: {
        name: 'LOMO',
        colorMatrix: [
          1.3, 0, 0, 0, 0,
          0, 1.2, 0, 0, 0,
          0, 0, 0.8, 0, 0,
          0, 0, 0, 1, 0
        ],
        contrast: 1.4,
        saturation: 1.2,
        warmth: 5
      },
      nashville: {
        name: 'Nashville',
        colorMatrix: [
          1.2, 0.15, 0.05, 0, 10,
          0.1, 1.0, 0.1, 0, 5,
          0, 0.1, 0.9, 0, -5,
          0, 0, 0, 1, 0
        ],
        contrast: 1.1,
        saturation: 0.85,
        warmth: 25
      },
      toaster: {
        name: 'Toaster',
        colorMatrix: [
          1.3, 0.2, 0, 0, 20,
          0.1, 1.1, 0, 0, 10,
          -0.1, 0, 0.8, 0, -10,
          0, 0, 0, 1, 0
        ],
        contrast: 1.2,
        saturation: 1.0,
        warmth: 35
      }
    };

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.filterPanel = document.getElementById('filterPanel');
    this.adjustPanel = document.getElementById('adjustPanel');
    this.comparePanel = document.getElementById('comparePanel');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');

    this.originalImageEl = document.getElementById('originalImage');
    this.previewImage = document.getElementById('previewImage');
    this.filterCards = document.querySelectorAll('.filter-card');

    this.intensitySlider = document.getElementById('intensitySlider');
    this.intensityValue = document.getElementById('intensityValue');
    this.grainSlider = document.getElementById('grainSlider');
    this.grainValue = document.getElementById('grainValue');
    this.vignetteSlider = document.getElementById('vignetteSlider');
    this.vignetteValue = document.getElementById('vignetteValue');
    this.fadeSlider = document.getElementById('fadeSlider');
    this.fadeValue = document.getElementById('fadeValue');

    this.enableGrainCheck = document.getElementById('enableGrain');
    this.enableVignetteCheck = document.getElementById('enableVignette');
    this.enableScratchCheck = document.getElementById('enableScratch');
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

    // Filter selection
    this.filterCards.forEach(card => {
      card.addEventListener('click', () => {
        this.filterCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedFilter = card.dataset.filter;
        this.updatePreview();
      });
    });

    // Adjustment sliders
    this.intensitySlider.addEventListener('input', () => {
      this.intensity = parseInt(this.intensitySlider.value);
      this.intensityValue.textContent = `${this.intensity}%`;
      this.updatePreview();
    });

    this.grainSlider.addEventListener('input', () => {
      this.grain = parseInt(this.grainSlider.value);
      this.grainValue.textContent = this.grain;
      this.updatePreview();
    });

    this.vignetteSlider.addEventListener('input', () => {
      this.vignette = parseInt(this.vignetteSlider.value);
      this.vignetteValue.textContent = `${this.vignette}%`;
      this.updatePreview();
    });

    this.fadeSlider.addEventListener('input', () => {
      this.fade = parseInt(this.fadeSlider.value);
      this.fadeValue.textContent = `${this.fade}%`;
      this.updatePreview();
    });

    // Checkboxes
    this.enableGrainCheck.addEventListener('change', () => {
      this.enableGrain = this.enableGrainCheck.checked;
      this.updatePreview();
    });

    this.enableVignetteCheck.addEventListener('change', () => {
      this.enableVignette = this.enableVignetteCheck.checked;
      this.updatePreview();
    });

    this.enableScratchCheck.addEventListener('change', () => {
      this.enableScratch = this.enableScratchCheck.checked;
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

        this.filterPanel.style.display = 'block';
        this.adjustPanel.style.display = 'block';
        this.comparePanel.style.display = 'block';
        this.convertBtn.disabled = false;

        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請選擇復古風格');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const width = Math.min(this.originalImage.naturalWidth, 800);
    const height = Math.round(width * (this.originalImage.naturalHeight / this.originalImage.naturalWidth));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.originalImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    this.applyVintageEffect(imageData);
    ctx.putImageData(imageData, 0, 0);

    // Apply vignette on canvas (after putting imageData)
    if (this.enableVignette && this.vignette > 0) {
      this.applyVignetteToCanvas(ctx, width, height);
    }

    // Apply scratches
    if (this.enableScratch) {
      this.applyScratchesToCanvas(ctx, width, height);
    }

    this.previewImage.src = canvas.toDataURL();
  }

  applyVintageEffect(imageData) {
    const data = imageData.data;
    const filter = this.filters[this.selectedFilter];
    const intensity = this.intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply color matrix with intensity blending
      const matrix = filter.colorMatrix;
      const newR = matrix[0] * r + matrix[1] * g + matrix[2] * b + matrix[3] * 255 + matrix[4];
      const newG = matrix[5] * r + matrix[6] * g + matrix[7] * b + matrix[8] * 255 + matrix[9];
      const newB = matrix[10] * r + matrix[11] * g + matrix[12] * b + matrix[13] * 255 + matrix[14];

      // Blend with original based on intensity
      r = r * (1 - intensity) + newR * intensity;
      g = g * (1 - intensity) + newG * intensity;
      b = b * (1 - intensity) + newB * intensity;

      // Apply contrast
      const contrast = filter.contrast;
      r = ((r - 128) * contrast) + 128;
      g = ((g - 128) * contrast) + 128;
      b = ((b - 128) * contrast) + 128;

      // Apply warmth
      const warmth = filter.warmth * (intensity);
      r += warmth;
      b -= warmth * 0.5;

      // Apply fade (lift shadows)
      const fadeAmount = this.fade * 2.55 * intensity;
      r = r + fadeAmount * (1 - r / 255);
      g = g + fadeAmount * (1 - g / 255);
      b = b + fadeAmount * (1 - b / 255);

      // Apply grain
      if (this.enableGrain && this.grain > 0) {
        const grainAmount = (Math.random() - 0.5) * this.grain * intensity;
        r += grainAmount;
        g += grainAmount;
        b += grainAmount;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  applyVignetteToCanvas(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) / 2;
    const vignetteStrength = this.vignette / 100;

    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, `rgba(0, 0, 0, ${0.1 * vignetteStrength})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.6 * vignetteStrength})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  applyScratchesToCanvas(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Random vertical scratches
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const startY = Math.random() * height * 0.3;
      const endY = startY + Math.random() * height * 0.7;

      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x + (Math.random() - 0.5) * 5, endY);
      ctx.stroke();
    }

    // Random dust spots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async applyFilter() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用復古濾鏡...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用復古效果...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyVintageEffect(imageData);
      ctx.putImageData(imageData, 0, 0);

      // Apply vignette
      if (this.enableVignette && this.vignette > 0) {
        this.applyVignetteToCanvas(ctx, canvas.width, canvas.height);
      }

      // Apply scratches
      if (this.enableScratch) {
        this.applyScratchesToCanvas(ctx, canvas.width, canvas.height);
      }

      this.updateProgress(90, '輸出圖片...');

      // Get output format
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
      this.showStatus('success', `復古濾鏡套用完成！風格：${this.filters[this.selectedFilter].name}`);

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
    const filterName = this.selectedFilter;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_vintage_${filterName}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedFilter = 'sepia';
    this.intensity = 100;
    this.grain = 10;
    this.vignette = 30;
    this.fade = 10;
    this.enableGrain = true;
    this.enableVignette = true;
    this.enableScratch = false;

    this.fileInput.value = '';
    this.filterPanel.style.display = 'none';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;

    this.intensitySlider.value = 100;
    this.intensityValue.textContent = '100%';
    this.grainSlider.value = 10;
    this.grainValue.textContent = '10';
    this.vignetteSlider.value = 30;
    this.vignetteValue.textContent = '30%';
    this.fadeSlider.value = 10;
    this.fadeValue.textContent = '10%';

    this.enableGrainCheck.checked = true;
    this.enableVignetteCheck.checked = true;
    this.enableScratchCheck.checked = false;

    this.filterCards.forEach(c => c.classList.remove('selected'));
    this.filterCards[0].classList.add('selected');
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
  new VintageFilter();
});
