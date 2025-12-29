class RoundCornerTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      cornerRadius: 30,
      uniformCorners: true,
      topLeft: 30,
      topRight: 30,
      bottomLeft: 30,
      bottomRight: 30,
      bgColor: '#1a1a2e',
      transparentBg: true
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

    // Radius slider
    const radiusSlider = document.getElementById('radius');
    radiusSlider.addEventListener('input', (e) => {
      this.settings.cornerRadius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${this.settings.cornerRadius}px`;
      if (this.settings.uniformCorners) {
        this.settings.topLeft = this.settings.cornerRadius;
        this.settings.topRight = this.settings.cornerRadius;
        this.settings.bottomLeft = this.settings.cornerRadius;
        this.settings.bottomRight = this.settings.cornerRadius;
        this.updateCornerInputs();
      }
      this.render();
    });

    // Uniform corners checkbox
    const uniformCheckbox = document.getElementById('uniformCorners');
    uniformCheckbox.addEventListener('change', (e) => {
      this.settings.uniformCorners = e.target.checked;
      document.getElementById('cornerControls').style.display = e.target.checked ? 'none' : 'grid';
      if (e.target.checked) {
        this.settings.topLeft = this.settings.cornerRadius;
        this.settings.topRight = this.settings.cornerRadius;
        this.settings.bottomLeft = this.settings.cornerRadius;
        this.settings.bottomRight = this.settings.cornerRadius;
        this.updateCornerInputs();
      }
      this.render();
    });

    // Individual corner inputs
    ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].forEach(corner => {
      const input = document.getElementById(corner);
      input.addEventListener('input', (e) => {
        this.settings[corner] = parseInt(e.target.value) || 0;
        this.render();
      });
    });

    // Transparent background
    const transparentBgCheckbox = document.getElementById('transparentBg');
    transparentBgCheckbox.addEventListener('change', (e) => {
      this.settings.transparentBg = e.target.checked;
      this.render();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const radiusValue = btn.dataset.radius;
        let radius;

        if (radiusValue === '50%') {
          // Full circle - will be calculated based on image size
          radius = 9999; // Special value for max
        } else {
          radius = parseInt(radiusValue);
        }

        this.settings.cornerRadius = radius;
        document.getElementById('radius').value = Math.min(radius, 200);
        document.getElementById('radiusValue').textContent = radiusValue === '50%' ? '圓形' : `${radius}px`;

        if (this.settings.uniformCorners) {
          this.settings.topLeft = radius;
          this.settings.topRight = radius;
          this.settings.bottomLeft = radius;
          this.settings.bottomRight = radius;
          this.updateCornerInputs();
        }
        this.render();
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  updateCornerInputs() {
    ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].forEach(corner => {
      const input = document.getElementById(corner);
      input.value = Math.min(this.settings[corner], 999);
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
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fill background if not transparent
    if (!this.settings.transparentBg) {
      this.ctx.fillStyle = this.settings.bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Create rounded rectangle path
    const maxRadius = Math.min(img.width, img.height) / 2;
    const tl = Math.min(this.settings.topLeft, maxRadius);
    const tr = Math.min(this.settings.topRight, maxRadius);
    const bl = Math.min(this.settings.bottomLeft, maxRadius);
    const br = Math.min(this.settings.bottomRight, maxRadius);

    this.ctx.beginPath();
    this.ctx.moveTo(tl, 0);
    this.ctx.lineTo(img.width - tr, 0);
    this.ctx.quadraticCurveTo(img.width, 0, img.width, tr);
    this.ctx.lineTo(img.width, img.height - br);
    this.ctx.quadraticCurveTo(img.width, img.height, img.width - br, img.height);
    this.ctx.lineTo(bl, img.height);
    this.ctx.quadraticCurveTo(0, img.height, 0, img.height - bl);
    this.ctx.lineTo(0, tl);
    this.ctx.quadraticCurveTo(0, 0, tl, 0);
    this.ctx.closePath();

    // Clip and draw image
    this.ctx.save();
    this.ctx.clip();
    this.ctx.drawImage(img, 0, 0);
    this.ctx.restore();
  }

  download() {
    const link = document.createElement('a');
    link.download = 'rounded-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      cornerRadius: 30,
      uniformCorners: true,
      topLeft: 30,
      topRight: 30,
      bottomLeft: 30,
      bottomRight: 30,
      bgColor: '#1a1a2e',
      transparentBg: true
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('radius').value = 30;
    document.getElementById('radiusValue').textContent = '30px';
    document.getElementById('uniformCorners').checked = true;
    document.getElementById('cornerControls').style.display = 'none';
    document.getElementById('transparentBg').checked = true;
    this.updateCornerInputs();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-radius="30"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RoundCornerTool();
});
