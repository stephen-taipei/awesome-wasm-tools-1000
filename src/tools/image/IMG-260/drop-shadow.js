/**
 * IMG-260 圖片陰影效果工具
 */
class DropShadowTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      offsetX: 10,
      offsetY: 10,
      blur: 20,
      opacity: 50,
      shadowColor: '#000000',
      bgColor: '#ffffff'
    };
    this.presets = {
      subtle: { offsetX: 2, offsetY: 2, blur: 5, opacity: 20 },
      normal: { offsetX: 10, offsetY: 10, blur: 20, opacity: 50 },
      floating: { offsetX: 0, offsetY: 25, blur: 40, opacity: 40 },
      contact: { offsetX: 0, offsetY: 5, blur: 10, opacity: 60 }
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
        this.settings = { ...this.settings, ...preset };
        this.updateSliders();
        this.render();
      });
    });

    document.getElementById('offsetX').addEventListener('input', (e) => {
      this.settings.offsetX = parseInt(e.target.value);
      document.getElementById('offsetXValue').textContent = this.settings.offsetX;
      this.render();
    });

    document.getElementById('offsetY').addEventListener('input', (e) => {
      this.settings.offsetY = parseInt(e.target.value);
      document.getElementById('offsetYValue').textContent = this.settings.offsetY;
      this.render();
    });

    document.getElementById('blur').addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
      this.render();
    });

    document.getElementById('shadowColor').addEventListener('input', (e) => {
      this.settings.shadowColor = e.target.value;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    document.getElementById('offsetX').value = this.settings.offsetX;
    document.getElementById('offsetXValue').textContent = this.settings.offsetX;
    document.getElementById('offsetY').value = this.settings.offsetY;
    document.getElementById('offsetYValue').textContent = this.settings.offsetY;
    document.getElementById('blur').value = this.settings.blur;
    document.getElementById('blurValue').textContent = this.settings.blur;
    document.getElementById('opacity').value = this.settings.opacity;
    document.getElementById('opacityValue').textContent = this.settings.opacity + '%';
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

  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }

  render() {
    if (!this.originalImage) return;
    const { offsetX, offsetY, blur, opacity, shadowColor, bgColor } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Calculate canvas size with padding for shadow
    const padding = Math.max(Math.abs(offsetX), Math.abs(offsetY)) + blur * 2;
    const canvasW = w + padding * 2;
    const canvasH = h + padding * 2;

    this.canvas.width = canvasW;
    this.canvas.height = canvasH;

    // Fill background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw shadow
    this.ctx.save();
    this.ctx.shadowColor = this.hexToRgba(shadowColor, opacity / 100);
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = offsetX;
    this.ctx.shadowOffsetY = offsetY;

    // Draw image (shadow will be applied)
    this.ctx.drawImage(this.originalImage, padding, padding);
    this.ctx.restore();

    // Draw image on top (without shadow)
    this.ctx.drawImage(this.originalImage, padding, padding);
  }

  reset() {
    this.originalImage = null;
    this.settings = { offsetX: 10, offsetY: 10, blur: 20, opacity: 50, shadowColor: '#000000', bgColor: '#ffffff' };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('shadowColor').value = '#000000';
    document.getElementById('bgColor').value = '#ffffff';
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach((b, i) => b.classList.toggle('active', i === 1));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `shadow_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new DropShadowTool());
