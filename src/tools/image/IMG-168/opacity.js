/**
 * IMG-168 圖片透明度工具
 * 調整圖片整體或局部透明度
 */

class OpacityTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Settings
    this.settings = {
      opacity: 100,
      fadeVertical: 0,
      fadeHorizontal: 0
    };

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    // Controls
    this.bindSlider('opacity', '%');
    this.bindSlider('fadeVertical', '%');
    this.bindSlider('fadeHorizontal', '%');

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        this.settings.opacity = value;
        document.getElementById('opacity').value = value;
        document.getElementById('opacityValue').textContent = value + '%';
        this.render();
      });
    });

    // Buttons
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindSlider(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
      this.render();
    });
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;

    const width = this.originalImage.width;
    const height = this.originalImage.height;

    this.canvas.width = width;
    this.canvas.height = height;

    // Draw original image
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Get image data
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const { opacity, fadeVertical, fadeHorizontal } = this.settings;
    const baseOpacity = opacity / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // Calculate fade multipliers
        let fadeMultiplier = 1;

        // Vertical fade (top and bottom)
        if (fadeVertical > 0) {
          const fadeHeight = height * (fadeVertical / 100);
          if (y < fadeHeight) {
            fadeMultiplier *= y / fadeHeight;
          } else if (y > height - fadeHeight) {
            fadeMultiplier *= (height - y) / fadeHeight;
          }
        }

        // Horizontal fade (left and right)
        if (fadeHorizontal > 0) {
          const fadeWidth = width * (fadeHorizontal / 100);
          if (x < fadeWidth) {
            fadeMultiplier *= x / fadeWidth;
          } else if (x > width - fadeWidth) {
            fadeMultiplier *= (width - x) / fadeWidth;
          }
        }

        // Apply combined opacity
        const finalOpacity = baseOpacity * fadeMultiplier;
        data[i + 3] = Math.round(data[i + 3] * finalOpacity);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      opacity: 100,
      fadeVertical: 0,
      fadeHorizontal: 0
    };

    // Reset controls
    document.getElementById('opacity').value = 100;
    document.getElementById('opacityValue').textContent = '100%';
    document.getElementById('fadeVertical').value = 0;
    document.getElementById('fadeVerticalValue').textContent = '0%';
    document.getElementById('fadeHorizontal').value = 0;
    document.getElementById('fadeHorizontalValue').textContent = '0%';
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `opacity_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OpacityTool();
});
