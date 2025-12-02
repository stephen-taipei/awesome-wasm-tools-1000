/**
 * IMG-018 圖片旋轉
 * 旋轉圖片角度，支援90°/180°/270°或自訂角度
 */

class ImageRotator {
  constructor() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.currentAngle = 0;
    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.convertBtn = document.getElementById('convertBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.previewArea = document.getElementById('previewArea');
    this.rotatePanel = document.getElementById('rotatePanel');
    this.rotatePreviewArea = document.getElementById('rotatePreviewArea');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.statusMessage = document.getElementById('statusMessage');
    this.performanceInfo = document.getElementById('performanceInfo');

    // Preview elements
    this.previewImage = document.getElementById('previewImage');
    this.currentAngleSpan = document.getElementById('currentAngle');

    // Settings
    this.angleSlider = document.getElementById('angleSlider');
    this.angleValue = document.getElementById('angleValue');
    this.bgColorInput = document.getElementById('bgColor');
    this.transparentBgCheckbox = document.getElementById('transparentBg');
    this.outputFormatSelect = document.getElementById('outputFormat');
    this.rotateButtons = document.querySelectorAll('.rotate-btn');

    // Info displays
    this.convertedSizeSpan = document.getElementById('convertedSize');
    this.convertedDimensionsSpan = document.getElementById('convertedDimensions');
    this.rotateAngleInfoSpan = document.getElementById('rotateAngleInfo');
    this.originalDimensionsInfoSpan = document.getElementById('originalDimensionsInfo');
    this.newDimensionsInfoSpan = document.getElementById('newDimensionsInfo');

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

    // Rotate buttons
    this.rotateButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const angle = parseInt(btn.dataset.angle);
        this.currentAngle = angle;
        this.angleSlider.value = angle;
        this.updateAngleDisplay();
        this.updatePreview();
      });
    });

    // Angle slider
    this.angleSlider.addEventListener('input', () => {
      this.currentAngle = parseInt(this.angleSlider.value);
      this.updateAngleDisplay();
      this.updatePreview();
    });

    // Action buttons
    this.convertBtn.addEventListener('click', () => this.rotate());
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
        this.previewImage.src = e.target.result;
        this.rotatePanel.style.display = 'block';
        this.rotatePreviewArea.style.display = 'block';
        this.convertBtn.disabled = false;
        this.currentAngle = 0;
        this.angleSlider.value = 0;
        this.updateAngleDisplay();
        this.showStatus('success', '圖片載入成功，請選擇旋轉角度');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  updateAngleDisplay() {
    this.angleValue.textContent = `${this.currentAngle}°`;
    this.currentAngleSpan.textContent = this.currentAngle;

    // Update active button
    this.rotateButtons.forEach(btn => {
      const angle = parseInt(btn.dataset.angle);
      btn.classList.toggle('active', angle === this.currentAngle);
    });
  }

  updatePreview() {
    if (!this.previewImage) return;
    this.previewImage.style.transform = `rotate(${this.currentAngle}deg)`;
  }

  async rotate() {
    if (!this.originalImage) return;

    this.progressContainer.style.display = 'block';
    this.convertBtn.disabled = true;
    this.showStatus('info', '正在旋轉圖片...');

    try {
      this.updateProgress(30, '建立畫布...');

      const radians = (this.currentAngle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));

      // Calculate new dimensions
      const originalWidth = this.originalImage.naturalWidth;
      const originalHeight = this.originalImage.naturalHeight;
      const newWidth = Math.ceil(originalWidth * cos + originalHeight * sin);
      const newHeight = Math.ceil(originalWidth * sin + originalHeight * cos);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');

      this.updateProgress(50, '旋轉圖片...');

      // Fill background
      const useTransparent = this.transparentBgCheckbox.checked;
      if (!useTransparent) {
        ctx.fillStyle = this.bgColorInput.value;
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      // Rotate and draw
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(this.originalImage, -originalWidth / 2, -originalHeight / 2);

      this.updateProgress(70, '輸出圖片...');

      // Get output format
      let mimeType, ext;
      const format = this.outputFormatSelect.value;
      if (format === 'original') {
        if (useTransparent) {
          mimeType = 'image/png';
          ext = 'png';
        } else {
          mimeType = this.originalFile.type;
          ext = this.originalFile.name.split('.').pop();
        }
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

      this.updateProgress(100, '旋轉完成！');

      // Update UI
      document.getElementById('convertedImage').src = URL.createObjectURL(blob);
      this.convertedSizeSpan.textContent = this.formatFileSize(blob.size);
      this.convertedDimensionsSpan.textContent = `${newWidth} × ${newHeight} px`;
      this.previewArea.style.display = 'flex';

      // Performance info
      this.rotateAngleInfoSpan.textContent = `${this.currentAngle}°`;
      this.originalDimensionsInfoSpan.textContent = `${originalWidth} × ${originalHeight} px`;
      this.newDimensionsInfoSpan.textContent = `${newWidth} × ${newHeight} px`;
      this.performanceInfo.style.display = 'block';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';
      this.showStatus('success', `旋轉完成！角度：${this.currentAngle}°`);

    } catch (error) {
      this.showStatus('error', `旋轉失敗：${error.message}`);
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
    link.download = `${originalName}_rotated_${this.currentAngle}.${this.outputExt}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  reset() {
    this.originalFile = null;
    this.convertedBlob = null;
    this.originalImage = null;
    this.currentAngle = 0;
    this.fileInput.value = '';
    this.rotatePanel.style.display = 'none';
    this.rotatePreviewArea.style.display = 'none';
    this.previewArea.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.performanceInfo.style.display = 'none';
    this.convertBtn.disabled = true;
    this.angleSlider.value = 0;
    this.updateAngleDisplay();
    this.previewImage.style.transform = 'rotate(0deg)';
    this.statusMessage.style.display = 'none';
  }

  showStatus(type, message) {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = 'block';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ImageRotator();
});
