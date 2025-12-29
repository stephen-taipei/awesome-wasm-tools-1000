/**
 * IMG-226 圖片膚色調整工具
 */
class SkinToneTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { temperature: 0, rosiness: 0, brightness: 0, range: 50 };
    this.presets = {
      warmer: { temperature: 25, rosiness: 5, brightness: 5, range: 50 },
      cooler: { temperature: -20, rosiness: -5, brightness: 0, range: 50 },
      tan: { temperature: 15, rosiness: 10, brightness: -10, range: 50 },
      pale: { temperature: -10, rosiness: -10, brightness: 15, range: 50 },
      rosy: { temperature: 5, rosiness: 20, brightness: 5, range: 50 },
      natural: { temperature: 0, rosiness: 0, brightness: 0, range: 50 }
    };
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = this.presets[btn.dataset.preset];
        this.settings = { ...preset };
        this.updateSliders();
        this.render();
      });
    });

    ['temperature', 'rosiness', 'brightness', 'range'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(id + 'Value').textContent = this.settings[id];
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        this.render();
      });
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    ['temperature', 'rosiness', 'brightness', 'range'].forEach(id => {
      document.getElementById(id).value = this.settings[id];
      document.getElementById(id + 'Value').textContent = this.settings[id];
    });
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
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

  isSkinTone(r, g, b, range) {
    // Simple skin detection based on RGB ratios
    const threshold = range / 100;

    // Check if pixel is in typical skin color range
    if (r < 60 || g < 40 || b < 20) return 0;
    if (r < g || r < b) return 0;
    if (Math.abs(r - g) < 15 && b > g) return 0;

    // Calculate how "skin-like" the color is
    const rg = r - g;
    const rb = r - b;

    if (rg < 15 || rb < 15) return 0;
    if (rg > 100 && rb > 100) return 0;

    // Calculate confidence
    const confidence = Math.min(1, (rg / 50) * (rb / 60) * threshold);
    return Math.max(0, Math.min(1, confidence));
  }

  render() {
    if (!this.originalImage) return;
    const { temperature, rosiness, brightness, range } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (temperature === 0 && rosiness === 0 && brightness === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const skinFactor = this.isSkinTone(r, g, b, range);
      if (skinFactor <= 0) continue;

      let newR = r;
      let newG = g;
      let newB = b;

      // Apply temperature (warm = +red, -blue; cool = -red, +blue)
      if (temperature !== 0) {
        const tempFactor = temperature / 100;
        newR += tempFactor * 30;
        newB -= tempFactor * 20;
      }

      // Apply rosiness (add red/magenta tint)
      if (rosiness !== 0) {
        const rosyFactor = rosiness / 100;
        newR += rosyFactor * 20;
        newG -= rosyFactor * 5;
      }

      // Apply brightness
      if (brightness !== 0) {
        const brightFactor = brightness / 100;
        newR += brightFactor * 30;
        newG += brightFactor * 30;
        newB += brightFactor * 30;
      }

      // Blend based on skin factor
      data[i] = Math.max(0, Math.min(255, r + (newR - r) * skinFactor));
      data[i + 1] = Math.max(0, Math.min(255, g + (newG - g) * skinFactor));
      data[i + 2] = Math.max(0, Math.min(255, b + (newB - b) * skinFactor));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { temperature: 0, rosiness: 0, brightness: 0, range: 50 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `skin_tone_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new SkinToneTool());
