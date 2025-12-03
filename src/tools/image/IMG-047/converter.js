/**
 * IMG-047 純色背景去除
 * 移除單一純色背景（綠幕、白底等）
 */

class ChromaKeyTool {
  constructor() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;
    this.isEyedropperActive = false;

    this.init();
  }

  init() {
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.optionsPanel = document.getElementById('optionsPanel');
    this.previewSection = document.getElementById('previewSection');

    this.colorPicker = document.getElementById('colorPicker');
    this.colorHex = document.getElementById('colorHex');
    this.eyedropperBtn = document.getElementById('eyedropperBtn');
    this.presetColors = document.getElementById('presetColors');

    this.toleranceSlider = document.getElementById('toleranceSlider');
    this.toleranceValue = document.getElementById('toleranceValue');
    this.featherSlider = document.getElementById('featherSlider');
    this.featherValue = document.getElementById('featherValue');

    this.originalCanvas = document.getElementById('originalCanvas');
    this.originalCtx = this.originalCanvas.getContext('2d');
    this.resultCanvas = document.getElementById('resultCanvas');
    this.resultCtx = this.resultCanvas.getContext('2d');

    this.originalInfo = document.getElementById('originalInfo');
    this.resultInfo = document.getElementById('resultInfo');

    this.removeBtn = document.getElementById('removeBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
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
      if (file) this.processFile(file);
    });
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    // Color picker events
    this.colorPicker.addEventListener('input', () => {
      this.colorHex.value = this.colorPicker.value;
      this.updatePresetSelection(this.colorPicker.value);
    });

    this.colorHex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(this.colorHex.value)) {
        this.colorPicker.value = this.colorHex.value;
        this.updatePresetSelection(this.colorHex.value);
      }
    });

    this.eyedropperBtn.addEventListener('click', () => {
      this.isEyedropperActive = !this.isEyedropperActive;
      this.eyedropperBtn.classList.toggle('active', this.isEyedropperActive);
      this.originalCanvas.style.cursor = this.isEyedropperActive ? 'crosshair' : 'default';
    });

    // Canvas eyedropper
    this.originalCanvas.addEventListener('click', (e) => {
      if (!this.isEyedropperActive) return;

      const rect = this.originalCanvas.getBoundingClientRect();
      const scaleX = this.originalCanvas.width / rect.width;
      const scaleY = this.originalCanvas.height / rect.height;

      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const pixel = this.originalCtx.getImageData(x, y, 1, 1).data;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');

      this.colorPicker.value = hex;
      this.colorHex.value = hex;
      this.updatePresetSelection(hex);

      this.isEyedropperActive = false;
      this.eyedropperBtn.classList.remove('active');
      this.originalCanvas.style.cursor = 'default';

      this.showStatus('info', `已選取顏色：${hex}`);
    });

    // Preset colors
    this.presetColors.querySelectorAll('.preset-color').forEach(el => {
      el.addEventListener('click', () => {
        const color = el.dataset.color;
        this.colorPicker.value = color;
        this.colorHex.value = color;
        this.updatePresetSelection(color);
      });
    });

    // Slider events
    this.toleranceSlider.addEventListener('input', () => {
      this.toleranceValue.textContent = `${this.toleranceSlider.value}%`;
    });
    this.featherSlider.addEventListener('input', () => {
      this.featherValue.textContent = `${this.featherSlider.value}px`;
    });

    // Action buttons
    this.removeBtn.addEventListener('click', () => this.removeBackground());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  updatePresetSelection(color) {
    this.presetColors.querySelectorAll('.preset-color').forEach(el => {
      el.classList.toggle('selected', el.dataset.color.toLowerCase() === color.toLowerCase());
    });
  }

  processFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '僅支援 PNG、JPG、WebP 格式');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        // Draw to canvas
        this.originalCanvas.width = img.width;
        this.originalCanvas.height = img.height;
        this.originalCtx.drawImage(img, 0, 0);

        this.resultCanvas.width = img.width;
        this.resultCanvas.height = img.height;

        this.originalInfo.textContent = `${img.width} × ${img.height} | ${this.formatSize(file.size)}`;

        this.optionsPanel.style.display = 'block';
        this.previewSection.style.display = 'block';
        this.removeBtn.disabled = false;

        this.resultInfo.textContent = '';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async removeBackground() {
    this.progressContainer.style.display = 'block';
    this.removeBtn.disabled = true;
    this.updateProgress(10, '分析背景顏色...');

    try {
      const tolerance = parseInt(this.toleranceSlider.value) / 100 * 255;
      const feather = parseInt(this.featherSlider.value);
      const targetColor = this.hexToRgb(this.colorPicker.value);

      this.updateProgress(30, '處理像素...');

      const imageData = this.originalCtx.getImageData(0, 0, this.originalCanvas.width, this.originalCanvas.height);
      const data = imageData.data;

      // First pass: create alpha mask
      const alphaMask = new Float32Array(data.length / 4);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
          Math.pow(r - targetColor.r, 2) +
          Math.pow(g - targetColor.g, 2) +
          Math.pow(b - targetColor.b, 2)
        );

        // Calculate alpha based on distance from target color
        if (distance <= tolerance) {
          alphaMask[i / 4] = 0;
        } else if (distance <= tolerance * 1.5) {
          // Soft edge transition
          alphaMask[i / 4] = (distance - tolerance) / (tolerance * 0.5);
        } else {
          alphaMask[i / 4] = 1;
        }
      }

      this.updateProgress(60, '套用邊緣柔化...');

      // Apply feathering (simple box blur on alpha)
      if (feather > 0) {
        const width = this.originalCanvas.width;
        const height = this.originalCanvas.height;
        const blurred = new Float32Array(alphaMask.length);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;

            for (let dy = -feather; dy <= feather; dy++) {
              for (let dx = -feather; dx <= feather; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  sum += alphaMask[ny * width + nx];
                  count++;
                }
              }
            }

            blurred[y * width + x] = sum / count;
          }
        }

        // Copy blurred back to alphaMask
        for (let i = 0; i < alphaMask.length; i++) {
          alphaMask[i] = blurred[i];
        }
      }

      this.updateProgress(80, '生成結果...');

      // Apply alpha mask to image
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = Math.round(alphaMask[i / 4] * 255);
      }

      // Draw result
      this.resultCtx.putImageData(imageData, 0, 0);

      this.updateProgress(95, '生成 PNG...');

      // Convert to blob
      this.resultBlob = await new Promise((resolve) => {
        this.resultCanvas.toBlob(resolve, 'image/png');
      });

      this.resultInfo.textContent = `PNG 透明背景 | ${this.formatSize(this.resultBlob.size)}`;

      this.updateProgress(100, '完成！');
      this.progressContainer.style.display = 'none';

      this.downloadBtn.style.display = 'inline-flex';
      this.resetBtn.style.display = 'inline-flex';

      this.showStatus('success', '背景已成功移除！');

    } catch (error) {
      console.error('Remove background error:', error);
      this.showStatus('error', `處理失敗：${error.message}`);
      this.progressContainer.style.display = 'none';
    }

    this.removeBtn.disabled = false;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 0 };
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = text;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  download() {
    if (!this.resultBlob) return;

    const originalName = this.originalFile.name.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.resultBlob);
    link.download = `${originalName}_chromakey.png`;
    link.click();
    URL.revokeObjectURL(link.href);

    this.showStatus('success', '圖片已下載');
  }

  reset() {
    this.originalFile = null;
    this.originalImage = null;
    this.resultBlob = null;
    this.isEyedropperActive = false;

    this.fileInput.value = '';
    this.optionsPanel.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.downloadBtn.style.display = 'none';
    this.resetBtn.style.display = 'none';
    this.removeBtn.disabled = true;
    this.progressContainer.style.display = 'none';
    this.eyedropperBtn.classList.remove('active');

    this.originalCtx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
    this.resultCtx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);

    this.originalInfo.textContent = '';
    this.resultInfo.textContent = '';

    this.colorPicker.value = '#00ff00';
    this.colorHex.value = '#00ff00';
    this.toleranceSlider.value = 30;
    this.toleranceValue.textContent = '30%';
    this.featherSlider.value = 1;
    this.featherValue.textContent = '1px';

    this.updatePresetSelection('#00ff00');
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
  new ChromaKeyTool();
});
