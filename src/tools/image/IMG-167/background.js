/**
 * IMG-167 圖片去背工具
 * 移除圖片背景，產生透明背景圖片
 */

class BackgroundRemovalTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // History for undo
    this.originalData = null;

    // Selected color
    this.selectedColor = { r: 255, g: 255, b: 255 };

    // Settings
    this.settings = {
      tolerance: 30,
      feather: 2
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

    // Color picker from canvas
    this.canvas.addEventListener('click', (e) => this.pickColor(e));

    // Controls
    this.bindSlider('tolerance', '');
    this.bindSlider('feather', 'px');

    // Buttons
    document.getElementById('removeBtn').addEventListener('click', () => this.removeBackground());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindSlider(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
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
        this.saveOriginal();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);
  }

  saveOriginal() {
    this.originalData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('undoBtn').disabled = true;
  }

  pickColor(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    this.selectedColor = { r, g, b };

    // Update UI
    const hex = this.rgbToHex(r, g, b);
    document.getElementById('colorSwatch').style.background = hex;
    document.getElementById('colorValue').textContent = hex.toUpperCase();
    document.getElementById('removeBtn').disabled = false;

    this.showStatus('success', `已選取顏色: ${hex}`);
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  removeBackground() {
    if (!this.originalData) return;

    // Restore original first
    this.ctx.putImageData(this.originalData, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const { tolerance, feather } = this.settings;
    const { r: targetR, g: targetG, b: targetB } = this.selectedColor;

    // Calculate mask
    const width = this.canvas.width;
    const height = this.canvas.height;
    const mask = new Float32Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2)
      );

      // Convert to 0-1 range where 0 = transparent, 1 = opaque
      const maxDistance = tolerance * 4.41; // 255 * sqrt(3) ≈ 441.67
      if (distance <= tolerance) {
        mask[i / 4] = 0; // Fully transparent
      } else if (distance <= tolerance + feather * 10) {
        // Feathered edge
        mask[i / 4] = (distance - tolerance) / (feather * 10);
      } else {
        mask[i / 4] = 1; // Fully opaque
      }
    }

    // Apply mask to alpha channel
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = Math.round(mask[i / 4] * 255);
    }

    this.ctx.putImageData(imageData, 0, 0);
    document.getElementById('undoBtn').disabled = false;
    this.showStatus('success', '背景已移除');
  }

  undo() {
    if (!this.originalData) return;
    this.ctx.putImageData(this.originalData, 0, 0);
    document.getElementById('undoBtn').disabled = true;
    this.showStatus('success', '已復原');
  }

  reset() {
    this.originalImage = null;
    this.originalData = null;
    this.selectedColor = { r: 255, g: 255, b: 255 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      tolerance: 30,
      feather: 2
    };

    // Reset controls
    document.getElementById('tolerance').value = 30;
    document.getElementById('toleranceValue').textContent = '30';
    document.getElementById('feather').value = 2;
    document.getElementById('featherValue').textContent = '2px';
    document.getElementById('colorSwatch').style.background = '#ffffff';
    document.getElementById('colorValue').textContent = '#FFFFFF';

    document.getElementById('removeBtn').disabled = true;
    document.getElementById('undoBtn').disabled = true;
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `no_bg_${Date.now()}.png`;
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
  new BackgroundRemovalTool();
});
