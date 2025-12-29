class RotateTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.settings = {
      angle: 0,
      expand: true,
      bgColor: '#000000'
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

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.angle = parseInt(btn.dataset.angle);
        document.getElementById('angle').value = this.settings.angle;
        document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
        this.render();
      });
    });

    document.getElementById('angle').addEventListener('input', (e) => {
      this.settings.angle = parseInt(e.target.value);
      document.getElementById('angleValue').textContent = `${this.settings.angle}°`;
      this.render();
    });

    document.getElementById('expandCheck').addEventListener('change', (e) => {
      this.settings.expand = e.target.checked;
      this.render();
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
      this.settings.bgColor = e.target.value;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
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
    const angleRad = this.settings.angle * Math.PI / 180;
    const cos = Math.abs(Math.cos(angleRad));
    const sin = Math.abs(Math.sin(angleRad));

    let newWidth, newHeight;

    if (this.settings.expand) {
      // Calculate bounding box of rotated image
      newWidth = Math.ceil(img.width * cos + img.height * sin);
      newHeight = Math.ceil(img.width * sin + img.height * cos);
    } else {
      newWidth = img.width;
      newHeight = img.height;
    }

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    // Fill background
    this.ctx.fillStyle = this.settings.bgColor;
    this.ctx.fillRect(0, 0, newWidth, newHeight);

    // Rotate around center
    this.ctx.save();
    this.ctx.translate(newWidth / 2, newHeight / 2);
    this.ctx.rotate(angleRad);
    this.ctx.drawImage(img, -img.width / 2, -img.height / 2);
    this.ctx.restore();
  }

  download() {
    const link = document.createElement('a');
    link.download = 'rotated-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { angle: 0, expand: true, bgColor: '#000000' };
    document.getElementById('angle').value = 0;
    document.getElementById('angleValue').textContent = '0°';
    document.getElementById('expandCheck').checked = true;
    document.getElementById('bgColor').value = '#000000';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RotateTool();
});
