/**
 * IMG-023 黑白濾鏡
 * 將彩色圖片轉為黑白/灰階
 */

class GrayscaleFilter {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedFilter = 'standard';
    this.contrast = 0;
    this.brightness = 0;

    // Filter presets
    this.filters = {
      standard: {
        name: '標準灰階',
        weights: [0.299, 0.587, 0.114],
        contrast: 0,
        brightness: 0
      },
      luminosity: {
        name: '明度灰階',
        weights: [0.2126, 0.7152, 0.0722],
        contrast: 0,
        brightness: 0
      },
      average: {
        name: '平均灰階',
        weights: [0.333, 0.333, 0.334],
        contrast: 0,
        brightness: 0
      },
      'high-contrast': {
        name: '高對比',
        weights: [0.299, 0.587, 0.114],
        contrast: 40,
        brightness: 0
      },
      soft: {
        name: '柔和',
        weights: [0.299, 0.587, 0.114],
        contrast: -20,
        brightness: 10
      },
      dramatic: {
        name: '戲劇感',
        weights: [0.299, 0.587, 0.114],
        contrast: 60,
        brightness: -10
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

    this.contrastSlider = document.getElementById('contrastSlider');
    this.contrastValue = document.getElementById('contrastValue');
    this.brightnessSlider = document.getElementById('brightnessSlider');
    this.brightnessValue = document.getElementById('brightnessValue');
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
        this.applyFilterPreset();
        this.updatePreview();
      });
    });

    // Adjustment sliders
    this.contrastSlider.addEventListener('input', () => {
      this.contrast = parseInt(this.contrastSlider.value);
      this.contrastValue.textContent = this.contrast;
      this.updatePreview();
    });

    this.brightnessSlider.addEventListener('input', () => {
      this.brightness = parseInt(this.brightnessSlider.value);
      this.brightnessValue.textContent = this.brightness;
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

        this.applyFilterPreset();
        this.updatePreview();
        this.showStatus('success', '圖片載入成功，請選擇黑白風格');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  applyFilterPreset() {
    const preset = this.filters[this.selectedFilter];
    this.contrast = preset.contrast;
    this.brightness = preset.brightness;
    this.contrastSlider.value = this.contrast;
    this.brightnessSlider.value = this.brightness;
    this.contrastValue.textContent = this.contrast;
    this.brightnessValue.textContent = this.brightness;
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
    this.applyGrayscale(imageData);
    ctx.putImageData(imageData, 0, 0);

    this.previewImage.src = canvas.toDataURL();
  }

  applyGrayscale(imageData) {
    const data = imageData.data;
    const weights = this.filters[this.selectedFilter].weights;
    const contrast = this.contrast / 100;
    const brightness = this.brightness;

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      let gray = data[i] * weights[0] + data[i + 1] * weights[1] + data[i + 2] * weights[2];

      // Apply brightness
      gray += brightness;

      // Apply contrast
      gray = ((gray - 128) * (1 + contrast)) + 128;

      // Clamp
      gray = Math.max(0, Math.min(255, gray));

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  async applyFilter() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在套用濾鏡...');

    try {
      this.updateProgress(30, '建立畫布...');

      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.naturalWidth;
      canvas.height = this.originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '繪製圖片...');
      ctx.drawImage(this.originalImage, 0, 0);

      this.updateProgress(70, '套用濾鏡...');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.applyGrayscale(imageData);
      ctx.putImageData(imageData, 0, 0);

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
      this.showStatus('success', `濾鏡套用完成！風格：${this.filters[this.selectedFilter].name}`);

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
    const filterName = this.selectedFilter.replace(/-/g, '_');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.convertedBlob);
    link.download = `${originalName}_bw_${filterName}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.selectedFilter = 'standard';
    this.contrast = 0;
    this.brightness = 0;
    this.fileInput.value = '';
    this.filterPanel.style.display = 'none';
    this.adjustPanel.style.display = 'none';
    this.comparePanel.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.convertBtn.disabled = true;
    this.contrastSlider.value = 0;
    this.brightnessSlider.value = 0;
    this.contrastValue.textContent = '0';
    this.brightnessValue.textContent = '0';
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
  new GrayscaleFilter();
});
