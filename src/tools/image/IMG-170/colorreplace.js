/**
 * IMG-170 圖片色彩替換工具
 * 將圖片中的指定顏色替換為新顏色
 */

class ColorReplaceTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // History for undo
    this.originalData = null;

    // Colors
    this.sourceColor = { r: 255, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 255, b: 0 };

    // Settings
    this.settings = {
      tolerance: 30,
      blend: 100
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

    // Canvas click for source color picking
    this.canvas.addEventListener('click', (e) => this.pickSourceColor(e));

    // Color pickers
    document.getElementById('sourceColorPicker').addEventListener('input', (e) => {
      this.sourceColor = this.hexToRgb(e.target.value);
      document.getElementById('sourceColor').style.background = e.target.value;
      document.getElementById('sourceColorValue').textContent = e.target.value.toUpperCase();
    });

    document.getElementById('targetColorPicker').addEventListener('input', (e) => {
      this.targetColor = this.hexToRgb(e.target.value);
      document.getElementById('targetColor').style.background = e.target.value;
      document.getElementById('targetColorValue').textContent = e.target.value.toUpperCase();
    });

    // Controls
    this.bindSlider('tolerance', '');
    this.bindSlider('blend', '%');

    // Buttons
    document.getElementById('replaceBtn').addEventListener('click', () => this.replaceColor());
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
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

  pickSourceColor(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    this.sourceColor = { r, g, b };
    const hex = this.rgbToHex(r, g, b);

    document.getElementById('sourceColor').style.background = hex;
    document.getElementById('sourceColorPicker').value = hex;
    document.getElementById('sourceColorValue').textContent = hex.toUpperCase();

    this.showStatus('success', `已選取來源顏色: ${hex}`);
  }

  replaceColor() {
    if (!this.originalData) return;

    // Restore original first
    this.ctx.putImageData(this.originalData, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    const { tolerance, blend } = this.settings;
    const blendFactor = blend / 100;
    const { r: sr, g: sg, b: sb } = this.sourceColor;
    const { r: tr, g: tg, b: tb } = this.targetColor;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - sr, 2) +
        Math.pow(g - sg, 2) +
        Math.pow(b - sb, 2)
      );

      const maxDistance = tolerance * 4.41; // 255 * sqrt(3) ≈ 441.67

      if (distance <= maxDistance) {
        // Calculate replacement factor based on distance
        const factor = 1 - (distance / maxDistance);
        const replaceFactor = factor * blendFactor;

        // Blend between original and target color
        data[i] = Math.round(r * (1 - replaceFactor) + tr * replaceFactor);
        data[i + 1] = Math.round(g * (1 - replaceFactor) + tg * replaceFactor);
        data[i + 2] = Math.round(b * (1 - replaceFactor) + tb * replaceFactor);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
    document.getElementById('undoBtn').disabled = false;
    this.showStatus('success', '顏色已替換');
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
    this.sourceColor = { r: 255, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 255, b: 0 };

    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      tolerance: 30,
      blend: 100
    };

    // Reset controls
    document.getElementById('tolerance').value = 30;
    document.getElementById('toleranceValue').textContent = '30';
    document.getElementById('blend').value = 100;
    document.getElementById('blendValue').textContent = '100%';

    // Reset colors
    document.getElementById('sourceColor').style.background = '#ff0000';
    document.getElementById('sourceColorPicker').value = '#ff0000';
    document.getElementById('sourceColorValue').textContent = '#FF0000';
    document.getElementById('targetColor').style.background = '#00ff00';
    document.getElementById('targetColorPicker').value = '#00ff00';
    document.getElementById('targetColorValue').textContent = '#00FF00';

    document.getElementById('undoBtn').disabled = true;
  }

  download() {
    if (!this.canvas.width) return;

    const link = document.createElement('a');
    link.download = `color_replace_${Date.now()}.png`;
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
  new ColorReplaceTool();
});
