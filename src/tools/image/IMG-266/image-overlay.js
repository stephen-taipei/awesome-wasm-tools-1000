class ImageOverlayTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.baseImage = null;
    this.overlayImage = null;
    this.settings = {
      blendMode: 'source-over',
      opacity: 100,
      scale: 100,
      position: 'mc' // middle-center
    };
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const overlayInput = document.getElementById('overlayInput');

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
        this.loadBaseImage(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadBaseImage(e.target.files[0]);
      }
    });

    // Overlay upload
    const overlayUpload = document.getElementById('overlayUpload');
    overlayUpload.addEventListener('click', () => overlayInput.click());
    overlayInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadOverlayImage(e.target.files[0]);
      }
    });

    // Blend mode select
    const blendModeSelect = document.getElementById('blendMode');
    blendModeSelect.addEventListener('change', (e) => {
      this.settings.blendMode = e.target.value;
      this.render();
    });

    // Opacity slider
    const opacitySlider = document.getElementById('opacity');
    opacitySlider.addEventListener('input', (e) => {
      this.settings.opacity = parseInt(e.target.value);
      document.getElementById('opacityValue').textContent = `${this.settings.opacity}%`;
      this.render();
    });

    // Scale slider
    const scaleSlider = document.getElementById('scale');
    scaleSlider.addEventListener('input', (e) => {
      this.settings.scale = parseInt(e.target.value);
      document.getElementById('scaleValue').textContent = `${this.settings.scale}%`;
      this.render();
    });

    // Position buttons
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.position = btn.dataset.pos;
        this.render();
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadBaseImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.baseImage = img;
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  loadOverlayImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.overlayImage = img;
        document.getElementById('overlayUpload').classList.add('loaded');
        document.getElementById('overlayUpload').textContent = '✓ 已載入疊加圖片';
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getOverlayPosition(overlayWidth, overlayHeight) {
    const baseW = this.baseImage.width;
    const baseH = this.baseImage.height;
    let x, y;

    switch (this.settings.position) {
      case 'tl': x = 0; y = 0; break;
      case 'tc': x = (baseW - overlayWidth) / 2; y = 0; break;
      case 'tr': x = baseW - overlayWidth; y = 0; break;
      case 'ml': x = 0; y = (baseH - overlayHeight) / 2; break;
      case 'mc': x = (baseW - overlayWidth) / 2; y = (baseH - overlayHeight) / 2; break;
      case 'mr': x = baseW - overlayWidth; y = (baseH - overlayHeight) / 2; break;
      case 'bl': x = 0; y = baseH - overlayHeight; break;
      case 'bc': x = (baseW - overlayWidth) / 2; y = baseH - overlayHeight; break;
      case 'br': x = baseW - overlayWidth; y = baseH - overlayHeight; break;
      default: x = (baseW - overlayWidth) / 2; y = (baseH - overlayHeight) / 2;
    }

    return { x, y };
  }

  render() {
    if (!this.baseImage) return;

    const base = this.baseImage;
    this.canvas.width = base.width;
    this.canvas.height = base.height;

    // Draw base image
    this.ctx.drawImage(base, 0, 0);

    // Draw overlay if exists
    if (this.overlayImage) {
      const scale = this.settings.scale / 100;
      const overlayWidth = this.overlayImage.width * scale;
      const overlayHeight = this.overlayImage.height * scale;
      const pos = this.getOverlayPosition(overlayWidth, overlayHeight);

      this.ctx.save();
      this.ctx.globalAlpha = this.settings.opacity / 100;
      this.ctx.globalCompositeOperation = this.settings.blendMode;
      this.ctx.drawImage(this.overlayImage, pos.x, pos.y, overlayWidth, overlayHeight);
      this.ctx.restore();
    }
  }

  download() {
    const link = document.createElement('a');
    link.download = 'overlay-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.baseImage = null;
    this.overlayImage = null;
    this.settings = {
      blendMode: 'source-over',
      opacity: 100,
      scale: 100,
      position: 'mc'
    };
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('blendMode').value = 'source-over';
    document.getElementById('opacity').value = 100;
    document.getElementById('opacityValue').textContent = '100%';
    document.getElementById('scale').value = 100;
    document.getElementById('scaleValue').textContent = '100%';
    document.getElementById('overlayUpload').classList.remove('loaded');
    document.getElementById('overlayUpload').textContent = '點擊添加疊加圖片';
    document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.position-btn[data-pos="mc"]').classList.add('active');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ImageOverlayTool();
});
