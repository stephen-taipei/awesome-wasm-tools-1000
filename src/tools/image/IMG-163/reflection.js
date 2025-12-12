/**
 * IMG-163 圖片倒影工具
 * 為圖片添加逼真的倒影效果
 */

class ReflectionTool {
  constructor() {
    this.image = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Settings
    this.settings = {
      height: 50,    // % of image height
      opacity: 50,   // %
      blur: 2,       // px
      gap: 0,        // px
      fade: 80,      // %
      bgColor: '#ffffff',
      transparent: false
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateUI();
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
    this.bindControl('height', '%');
    this.bindControl('opacity', '%');
    this.bindControl('blur', 'px');
    this.bindControl('gap', 'px');
    this.bindControl('fade', '%');

    // Color picker
    const bgColor = document.getElementById('bgColor');
    const bgColorValue = document.getElementById('bgColorValue');
    const transparentBg = document.getElementById('transparentBg');

    bgColor.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      bgColorValue.value = e.target.value;
      this.settings.transparent = false;
      transparentBg.checked = false;
      this.render();
    });

    bgColorValue.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      bgColor.value = e.target.value;
      this.settings.transparent = false;
      transparentBg.checked = false;
      this.render();
    });

    transparentBg.addEventListener('change', (e) => {
      this.settings.transparent = e.target.checked;
      this.render();
    });

    // Buttons
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  bindControl(id, unit) {
    const input = document.getElementById(id);
    const valueDisplay = document.getElementById(id + 'Value');

    input.addEventListener('input', (e) => {
      this.settings[id] = parseInt(e.target.value);
      valueDisplay.textContent = this.settings[id] + unit;
      this.render();
    });
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      this.showStatus('error', '不支援的檔案格式');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.image) return;

    const { width, height } = this.image;
    const reflectionHeight = Math.floor(height * (this.settings.height / 100));
    const gap = this.settings.gap;

    // Canvas size
    this.canvas.width = width;
    this.canvas.height = height + gap + reflectionHeight;

    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    if (!this.settings.transparent) {
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw Original Image
    this.ctx.drawImage(this.image, 0, 0);

    // Draw Reflection
    this.ctx.save();

    // 1. Position and flip
    this.ctx.translate(0, height + gap + height);
    this.ctx.scale(1, -1);

    // 2. Apply blur if needed
    if (this.settings.blur > 0) {
      this.ctx.filter = `blur(${this.settings.blur}px)`;
    }

    // 3. Draw image
    this.ctx.drawImage(this.image, 0, 0);

    this.ctx.restore();

    // 4. Create gradient mask for fade out
    this.ctx.globalCompositeOperation = 'destination-in';

    // Define gradient from bottom of original image to bottom of reflection
    const gradient = this.ctx.createLinearGradient(0, height + gap, 0, height + gap + reflectionHeight);

    const opacity = this.settings.opacity / 100;
    const fadeStart = (100 - this.settings.fade) / 100;

    gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    gradient.addColorStop(fadeStart, `rgba(0, 0, 0, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, height + gap, width, reflectionHeight);

    // 5. Clear anything below reflection height (if image was taller than reflection area)
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, height + gap + reflectionHeight, width, height - reflectionHeight); // Overkill clear

    this.ctx.globalCompositeOperation = 'source-over';
  }

  updateUI() {
    // Sync UI with settings if needed
  }

  reset() {
    this.image = null;
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';

    // Reset settings
    this.settings = {
      height: 50,
      opacity: 50,
      blur: 2,
      gap: 0,
      fade: 80,
      bgColor: '#ffffff',
      transparent: false
    };

    // Reset controls
    ['height', 'opacity', 'blur', 'gap', 'fade'].forEach(id => {
      document.getElementById(id).value = this.settings[id];
      document.getElementById(id).dispatchEvent(new Event('input'));
    });

    document.getElementById('bgColor').value = '#ffffff';
    document.getElementById('bgColorValue').value = '#ffffff';
    document.getElementById('transparentBg').checked = false;
  }

  download() {
    if (!this.image) return;

    const link = document.createElement('a');
    link.download = `reflection_${Date.now()}.png`;
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
  new ReflectionTool();
});
