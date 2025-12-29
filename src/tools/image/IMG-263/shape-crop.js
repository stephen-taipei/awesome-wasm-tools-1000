class ShapeCropTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      shape: 'circle',
      bgColor: '#1a1a2e',
      transparentBg: true,
      rotation: 0,
      padding: 0
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

    // Shape buttons
    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.shape = btn.dataset.shape;
        this.render();
      });
    });

    // Rotation slider
    const rotationSlider = document.getElementById('rotation');
    rotationSlider.addEventListener('input', (e) => {
      this.settings.rotation = parseInt(e.target.value);
      document.getElementById('rotationValue').textContent = `${this.settings.rotation}°`;
      this.render();
    });

    // Padding slider
    const paddingSlider = document.getElementById('padding');
    paddingSlider.addEventListener('input', (e) => {
      this.settings.padding = parseInt(e.target.value);
      document.getElementById('paddingValue').textContent = `${this.settings.padding}%`;
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

  createShapePath(shape, size, centerX, centerY) {
    const ctx = this.ctx;
    const padding = this.settings.padding / 100;
    const effectiveSize = size * (1 - padding);
    const halfSize = effectiveSize / 2;

    ctx.beginPath();

    switch (shape) {
      case 'circle':
        ctx.arc(centerX, centerY, halfSize, 0, Math.PI * 2);
        break;

      case 'heart':
        const hScale = halfSize / 16;
        ctx.moveTo(centerX, centerY + halfSize * 0.7);
        ctx.bezierCurveTo(
          centerX - halfSize, centerY + halfSize * 0.2,
          centerX - halfSize, centerY - halfSize * 0.5,
          centerX, centerY - halfSize * 0.3
        );
        ctx.bezierCurveTo(
          centerX + halfSize, centerY - halfSize * 0.5,
          centerX + halfSize, centerY + halfSize * 0.2,
          centerX, centerY + halfSize * 0.7
        );
        break;

      case 'star':
        const outerRadius = halfSize;
        const innerRadius = halfSize * 0.4;
        const points = 5;
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * halfSize;
          const y = centerY + Math.sin(angle) * halfSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'triangle':
        ctx.moveTo(centerX, centerY - halfSize);
        ctx.lineTo(centerX + halfSize * 0.866, centerY + halfSize * 0.5);
        ctx.lineTo(centerX - halfSize * 0.866, centerY + halfSize * 0.5);
        ctx.closePath();
        break;

      case 'diamond':
        ctx.moveTo(centerX, centerY - halfSize);
        ctx.lineTo(centerX + halfSize, centerY);
        ctx.lineTo(centerX, centerY + halfSize);
        ctx.lineTo(centerX - halfSize, centerY);
        ctx.closePath();
        break;

      case 'pentagon':
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * halfSize;
          const y = centerY + Math.sin(angle) * halfSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'octagon':
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 8;
          const x = centerX + Math.cos(angle) * halfSize;
          const y = centerY + Math.sin(angle) * halfSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'cross':
        const arm = halfSize * 0.3;
        ctx.moveTo(centerX - arm, centerY - halfSize);
        ctx.lineTo(centerX + arm, centerY - halfSize);
        ctx.lineTo(centerX + arm, centerY - arm);
        ctx.lineTo(centerX + halfSize, centerY - arm);
        ctx.lineTo(centerX + halfSize, centerY + arm);
        ctx.lineTo(centerX + arm, centerY + arm);
        ctx.lineTo(centerX + arm, centerY + halfSize);
        ctx.lineTo(centerX - arm, centerY + halfSize);
        ctx.lineTo(centerX - arm, centerY + arm);
        ctx.lineTo(centerX - halfSize, centerY + arm);
        ctx.lineTo(centerX - halfSize, centerY - arm);
        ctx.lineTo(centerX - arm, centerY - arm);
        ctx.closePath();
        break;
    }
  }

  render() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    const size = Math.min(img.width, img.height);

    this.canvas.width = size;
    this.canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;

    // Clear canvas
    this.ctx.clearRect(0, 0, size, size);

    // Fill background if not transparent
    if (!this.settings.transparentBg) {
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, size, size);
    }

    // Apply rotation
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((this.settings.rotation * Math.PI) / 180);
    this.ctx.translate(-centerX, -centerY);

    // Create shape path
    this.createShapePath(this.settings.shape, size, centerX, centerY);

    // Clip to shape
    this.ctx.clip();

    // Reset rotation for image drawing
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw image centered
    const offsetX = (size - img.width) / 2;
    const offsetY = (size - img.height) / 2;
    this.ctx.drawImage(img, offsetX, offsetY);

    this.ctx.restore();
  }

  download() {
    const link = document.createElement('a');
    link.download = `${this.settings.shape}-crop.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      shape: 'circle',
      bgColor: '#1a1a2e',
      transparentBg: true,
      rotation: 0,
      padding: 0
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.shape-btn[data-shape="circle"]').classList.add('active');
    document.getElementById('rotation').value = 0;
    document.getElementById('rotationValue').textContent = '0°';
    document.getElementById('padding').value = 0;
    document.getElementById('paddingValue').textContent = '0%';
    document.getElementById('transparentBg').checked = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ShapeCropTool();
});
