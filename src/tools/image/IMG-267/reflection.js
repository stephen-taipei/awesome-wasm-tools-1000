class ReflectionTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      mode: 'bottom',
      reflectionHeight: 50,
      startOpacity: 50,
      gap: 5,
      blur: 0,
      bgColor: '#1a1a2e',
      transparentBg: false
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
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

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.settings.mode = tab.dataset.mode;
        this.render();
      });
    });

    // Reflection height slider
    const heightSlider = document.getElementById('reflectionHeight');
    heightSlider.addEventListener('input', (e) => {
      this.settings.reflectionHeight = parseInt(e.target.value);
      document.getElementById('heightValue').textContent = `${this.settings.reflectionHeight}%`;
      this.render();
    });

    // Start opacity slider
    const opacitySlider = document.getElementById('startOpacity');
    opacitySlider.addEventListener('input', (e) => {
      this.settings.startOpacity = parseInt(e.target.value);
      document.getElementById('startOpacityValue').textContent = `${this.settings.startOpacity}%`;
      this.render();
    });

    // Gap slider
    const gapSlider = document.getElementById('gap');
    gapSlider.addEventListener('input', (e) => {
      this.settings.gap = parseInt(e.target.value);
      document.getElementById('gapValue').textContent = `${this.settings.gap}px`;
      this.render();
    });

    // Blur slider
    const blurSlider = document.getElementById('blur');
    blurSlider.addEventListener('input', (e) => {
      this.settings.blur = parseInt(e.target.value);
      document.getElementById('blurValue').textContent = this.settings.blur;
      this.render();
    });

    // Background color
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    // Transparent background
    const transparentBgCheckbox = document.getElementById('transparentBg');
    transparentBgCheckbox.addEventListener('change', (e) => {
      this.settings.transparentBg = e.target.checked;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    const reflectionRatio = this.settings.reflectionHeight / 100;
    const gap = this.settings.gap;

    let canvasWidth, canvasHeight;
    let imgX, imgY, reflectX, reflectY;
    let reflectWidth, reflectHeight;

    switch (this.settings.mode) {
      case 'bottom':
        reflectHeight = Math.floor(img.height * reflectionRatio);
        canvasWidth = img.width;
        canvasHeight = img.height + gap + reflectHeight;
        imgX = 0;
        imgY = 0;
        reflectX = 0;
        reflectY = img.height + gap;
        reflectWidth = img.width;
        break;
      case 'right':
        reflectWidth = Math.floor(img.width * reflectionRatio);
        canvasWidth = img.width + gap + reflectWidth;
        canvasHeight = img.height;
        imgX = 0;
        imgY = 0;
        reflectX = img.width + gap;
        reflectY = 0;
        reflectHeight = img.height;
        break;
      case 'left':
        reflectWidth = Math.floor(img.width * reflectionRatio);
        canvasWidth = img.width + gap + reflectWidth;
        canvasHeight = img.height;
        imgX = reflectWidth + gap;
        imgY = 0;
        reflectX = 0;
        reflectY = 0;
        reflectHeight = img.height;
        break;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    // Fill background
    if (!this.settings.transparentBg) {
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw original image
    this.ctx.drawImage(img, imgX, imgY);

    // Create reflection
    this.ctx.save();

    // Apply blur if needed
    if (this.settings.blur > 0) {
      this.ctx.filter = `blur(${this.settings.blur}px)`;
    }

    // Draw flipped reflection
    switch (this.settings.mode) {
      case 'bottom':
        this.ctx.translate(reflectX, reflectY + reflectHeight);
        this.ctx.scale(1, -1);
        this.ctx.drawImage(img, 0, 0, img.width, reflectHeight, 0, 0, reflectWidth, reflectHeight);
        break;
      case 'right':
        this.ctx.translate(reflectX + reflectWidth, reflectY);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(img, img.width - reflectWidth, 0, reflectWidth, img.height, 0, 0, reflectWidth, reflectHeight);
        break;
      case 'left':
        this.ctx.translate(reflectX, reflectY);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(img, 0, 0, reflectWidth, img.height, -reflectWidth, 0, reflectWidth, reflectHeight);
        break;
    }

    this.ctx.restore();

    // Apply fade gradient
    this.applyFadeGradient(reflectX, reflectY, reflectWidth, reflectHeight);
  }

  applyFadeGradient(x, y, width, height) {
    const startOpacity = this.settings.startOpacity / 100;

    let gradient;
    switch (this.settings.mode) {
      case 'bottom':
        gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        break;
      case 'right':
        gradient = this.ctx.createLinearGradient(x, y, x + width, y);
        break;
      case 'left':
        gradient = this.ctx.createLinearGradient(x + width, y, x, y);
        break;
    }

    const bgColor = this.settings.transparentBg ? 'rgba(0,0,0,0)' : this.settings.bgColor;
    const r = parseInt(this.settings.bgColor.slice(1, 3), 16);
    const g = parseInt(this.settings.bgColor.slice(3, 5), 16);
    const b = parseInt(this.settings.bgColor.slice(5, 7), 16);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${1 - startOpacity})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, width, height);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'reflection-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      mode: 'bottom',
      reflectionHeight: 50,
      startOpacity: 50,
      gap: 5,
      blur: 0,
      bgColor: '#1a1a2e',
      transparentBg: false
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.mode-tab[data-mode="bottom"]').classList.add('active');
    document.getElementById('reflectionHeight').value = 50;
    document.getElementById('heightValue').textContent = '50%';
    document.getElementById('startOpacity').value = 50;
    document.getElementById('startOpacityValue').textContent = '50%';
    document.getElementById('gap').value = 5;
    document.getElementById('gapValue').textContent = '5px';
    document.getElementById('blur').value = 0;
    document.getElementById('blurValue').textContent = '0';
    document.getElementById('transparentBg').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ReflectionTool();
});
