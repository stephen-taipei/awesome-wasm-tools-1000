class PerspectiveTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      tlx: 0, tly: 0,
      trx: 0, try: 0,
      blx: 0, bly: 0,
      brx: 0, bry: 0,
      bgColor: '#1a1a2e'
    };
    this.presets = {
      normal: { tlx: 0, trx: 0, blx: 0, brx: 0 },
      tiltLeft: { tlx: 30, trx: 0, blx: 0, brx: 30 },
      tiltRight: { tlx: 0, trx: 30, blx: 30, brx: 0 },
      tiltUp: { tlx: 20, trx: -20, blx: 0, brx: 0 },
      tiltDown: { tlx: 0, trx: 0, blx: 20, brx: -20 },
      trapezoid: { tlx: 30, trx: -30, blx: 0, brx: 0 }
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

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = this.presets[btn.dataset.preset];
        if (preset) {
          this.settings.tlx = preset.tlx;
          this.settings.trx = preset.trx;
          this.settings.blx = preset.blx;
          this.settings.brx = preset.brx;
          this.updateSliders();
          this.render();
        }
      });
    });

    // Corner sliders
    ['tlx', 'trx', 'blx', 'brx'].forEach(param => {
      const slider = document.getElementById(param);
      slider.addEventListener('input', (e) => {
        this.settings[param] = parseInt(e.target.value);
        document.getElementById(`${param}Value`).textContent = this.settings[param];
        this.render();
      });
    });

    // Background color
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateSliders() {
    ['tlx', 'trx', 'blx', 'brx'].forEach(param => {
      document.getElementById(param).value = this.settings[param];
      document.getElementById(`${param}Value`).textContent = this.settings[param];
    });
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
    const padding = 100;
    const canvasWidth = img.width + padding * 2;
    const canvasHeight = img.height + padding * 2;

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    // Fill background
    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Define corners with offsets
    const corners = [
      { x: padding + this.settings.tlx, y: padding },
      { x: padding + img.width + this.settings.trx, y: padding },
      { x: padding + img.width + this.settings.brx, y: padding + img.height },
      { x: padding + this.settings.blx, y: padding + img.height }
    ];

    // Draw perspective transformed image using texture mapping
    this.drawPerspective(img, corners);
  }

  drawPerspective(img, corners) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);

    const steps = Math.max(img.width, img.height);

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const t2 = (i + 1) / steps;

      // Interpolate left and right edges
      const left1 = this.lerp2D(corners[0], corners[3], t);
      const right1 = this.lerp2D(corners[1], corners[2], t);
      const left2 = this.lerp2D(corners[0], corners[3], t2);
      const right2 = this.lerp2D(corners[1], corners[2], t2);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(left1.x, left1.y);
      this.ctx.lineTo(right1.x, right1.y);
      this.ctx.lineTo(right2.x, right2.y);
      this.ctx.lineTo(left2.x, left2.y);
      this.ctx.closePath();
      this.ctx.clip();

      const srcY = t * img.height;
      const srcH = img.height / steps;

      const width = Math.sqrt(
        Math.pow(right1.x - left1.x, 2) + Math.pow(right1.y - left1.y, 2)
      );
      const scaleX = width / img.width;
      const angle = Math.atan2(right1.y - left1.y, right1.x - left1.x);

      this.ctx.translate(left1.x, left1.y);
      this.ctx.rotate(angle);
      this.ctx.scale(scaleX, 1);
      this.ctx.drawImage(tempCanvas, 0, srcY, img.width, srcH + 1, 0, 0, img.width, srcH + 1);
      this.ctx.restore();
    }
  }

  lerp2D(p1, p2, t) {
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  download() {
    const link = document.createElement('a');
    link.download = 'perspective-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      tlx: 0, trx: 0, blx: 0, brx: 0,
      bgColor: '#1a1a2e'
    };
    document.getElementById('editorSection').classList.remove('active');
    this.updateSliders();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="normal"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PerspectiveTool();
});
