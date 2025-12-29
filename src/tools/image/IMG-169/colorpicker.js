/**
 * IMG-169 圖片色彩提取工具
 * 從圖片提取主要色彩與調色盤
 */

class ColorPickerTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.currentColor = { r: 136, g: 136, b: 136 };
    this.pickedColors = [];
    this.palette = [];

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

    // Canvas click for color picking
    this.canvas.addEventListener('click', (e) => this.pickColor(e));
    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) this.pickColor(e);
    });

    // Buttons
    document.getElementById('addPickedBtn').addEventListener('click', () => this.addToPicked());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportPalette());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    // Global copy function
    window.copyColor = (el) => {
      navigator.clipboard.writeText(el.textContent);
      this.showStatus('success', `已複製: ${el.textContent}`);
    };
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
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');

        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        this.extractPalette();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  pickColor(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    this.currentColor = { r, g, b };
    this.updateColorDisplay();
  }

  updateColorDisplay() {
    const { r, g, b } = this.currentColor;
    const hex = this.rgbToHex(r, g, b);
    const hsl = this.rgbToHsl(r, g, b);

    document.getElementById('currentSwatch').style.background = hex;
    document.getElementById('hexValue').textContent = hex.toUpperCase();
    document.getElementById('rgbValue').textContent = `${r}, ${g}, ${b}`;
    document.getElementById('hslValue').textContent = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  extractPalette() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Simple color quantization using median cut
    const colorCounts = {};
    const sampleRate = Math.max(1, Math.floor((this.canvas.width * this.canvas.height) / 10000));

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      // Quantize to reduce color space
      const r = Math.round(data[i] / 16) * 16;
      const g = Math.round(data[i + 1] / 16) * 16;
      const b = Math.round(data[i + 2] / 16) * 16;

      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by frequency and get top colors
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const totalSamples = Object.values(colorCounts).reduce((a, b) => a + b, 0);

    this.palette = sortedColors.map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return {
        r, g, b,
        hex: this.rgbToHex(r, g, b),
        percentage: Math.round((count / totalSamples) * 100)
      };
    });

    this.renderPalette();
  }

  renderPalette() {
    const container = document.getElementById('colorPalette');
    container.innerHTML = '';

    this.palette.forEach(color => {
      const el = document.createElement('div');
      el.className = 'palette-color';
      el.style.background = color.hex;
      el.innerHTML = `<span class="percentage">${color.percentage}%</span>`;
      el.onclick = () => {
        this.currentColor = { r: color.r, g: color.g, b: color.b };
        this.updateColorDisplay();
      };
      container.appendChild(el);
    });
  }

  addToPicked() {
    const { r, g, b } = this.currentColor;
    const hex = this.rgbToHex(r, g, b).toUpperCase();

    // Check for duplicates
    if (this.pickedColors.find(c => c.hex === hex)) {
      this.showStatus('error', '此顏色已收藏');
      return;
    }

    this.pickedColors.push({ r, g, b, hex });
    this.renderPickedColors();
    this.showStatus('success', '已加入收藏');
  }

  renderPickedColors() {
    const container = document.getElementById('pickedList');

    if (this.pickedColors.length === 0) {
      container.innerHTML = '<span style="color: #666; font-size: 0.8rem;">尚無收藏顏色</span>';
      return;
    }

    container.innerHTML = this.pickedColors.map((color, index) => `
      <div class="picked-item">
        <div class="picked-swatch" style="background: ${color.hex};"></div>
        <span class="picked-hex" onclick="copyColor(this)">${color.hex}</span>
        <button class="remove-picked" onclick="colorPickerTool.removePicked(${index})">×</button>
      </div>
    `).join('');
  }

  removePicked(index) {
    this.pickedColors.splice(index, 1);
    this.renderPickedColors();
  }

  exportPalette() {
    const allColors = [...this.palette, ...this.pickedColors];

    if (allColors.length === 0) {
      this.showStatus('error', '沒有可匯出的顏色');
      return;
    }

    const output = {
      palette: this.palette.map(c => ({ hex: c.hex, percentage: c.percentage })),
      picked: this.pickedColors.map(c => c.hex)
    };

    const text = JSON.stringify(output, null, 2);
    navigator.clipboard.writeText(text);
    this.showStatus('success', '調色盤已複製到剪貼簿');
  }

  reset() {
    this.currentColor = { r: 136, g: 136, b: 136 };
    this.pickedColors = [];
    this.palette = [];

    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('colorPalette').innerHTML = '';
    document.getElementById('pickedList').innerHTML = '<span style="color: #666; font-size: 0.8rem;">尚無收藏顏色</span>';

    document.getElementById('currentSwatch').style.background = '#888';
    document.getElementById('hexValue').textContent = '#888888';
    document.getElementById('rgbValue').textContent = '136, 136, 136';
    document.getElementById('hslValue').textContent = '0, 0%, 53%';
  }

  showStatus(type, message) {
    const el = document.getElementById('statusMessage');
    el.className = `status-message ${type}`;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

let colorPickerTool;
document.addEventListener('DOMContentLoaded', () => {
  colorPickerTool = new ColorPickerTool();
});
