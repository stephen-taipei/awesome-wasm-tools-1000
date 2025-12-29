class KaleidoscopeTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      segments: 6,
      rotation: 0,
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      mirror: true
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
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.segments = parseInt(btn.dataset.segments);
        document.getElementById('segments').value = this.settings.segments;
        document.getElementById('segmentsValue').textContent = this.settings.segments;
        this.render();
      });
    });

    document.getElementById('segments').addEventListener('input', (e) => {
      this.settings.segments = parseInt(e.target.value);
      document.getElementById('segmentsValue').textContent = this.settings.segments;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      this.render();
    });

    document.getElementById('rotation').addEventListener('input', (e) => {
      this.settings.rotation = parseInt(e.target.value);
      document.getElementById('rotationValue').textContent = `${this.settings.rotation}°`;
      this.render();
    });

    document.getElementById('zoom').addEventListener('input', (e) => {
      this.settings.zoom = parseInt(e.target.value);
      document.getElementById('zoomValue').textContent = `${this.settings.zoom}%`;
      this.render();
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

    document.getElementById('mirrorCheck').addEventListener('change', (e) => {
      this.settings.mirror = e.target.checked;
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
        // Make canvas square for kaleidoscope
        const size = Math.max(img.width, img.height);
        this.canvas.width = size;
        this.canvas.height = size;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        this.imageData = tempCtx.getImageData(0, 0, img.width, img.height);

        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  samplePixel(x, y) {
    const srcWidth = this.originalImage.width;
    const srcHeight = this.originalImage.height;
    const data = this.imageData.data;

    x = Math.max(0, Math.min(srcWidth - 1, Math.floor(x)));
    y = Math.max(0, Math.min(srcHeight - 1, Math.floor(y)));

    const idx = (y * srcWidth + x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const size = this.canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const srcWidth = this.originalImage.width;
    const srcHeight = this.originalImage.height;

    const outputData = this.ctx.createImageData(size, size);

    const segments = this.settings.segments;
    const segmentAngle = (Math.PI * 2) / segments;
    const rotation = this.settings.rotation * Math.PI / 180;
    const zoom = this.settings.zoom / 100;
    const offsetX = this.settings.offsetX;
    const offsetY = this.settings.offsetY;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Convert to polar coordinates relative to center
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) - rotation;

        // Normalize angle to positive
        while (angle < 0) angle += Math.PI * 2;

        // Find which segment and position within segment
        const segmentIndex = Math.floor(angle / segmentAngle);
        let localAngle = angle % segmentAngle;

        // Mirror alternate segments if enabled
        if (this.settings.mirror && segmentIndex % 2 === 1) {
          localAngle = segmentAngle - localAngle;
        }

        // Convert back to cartesian for source sampling
        const srcX = (Math.cos(localAngle) * dist) / zoom + srcWidth / 2 + offsetX;
        const srcY = (Math.sin(localAngle) * dist) / zoom + srcHeight / 2 + offsetY;

        const pixel = this.samplePixel(srcX, srcY);

        outputData.data[idx] = pixel.r;
        outputData.data[idx + 1] = pixel.g;
        outputData.data[idx + 2] = pixel.b;
        outputData.data[idx + 3] = 255;
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'kaleidoscope-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.settings = { segments: 6, rotation: 0, zoom: 100, offsetX: 0, offsetY: 0, mirror: true };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-segments="6"]').classList.add('active');
    document.getElementById('segments').value = 6;
    document.getElementById('segmentsValue').textContent = '6';
    document.getElementById('rotation').value = 0;
    document.getElementById('rotationValue').textContent = '0°';
    document.getElementById('zoom').value = 100;
    document.getElementById('zoomValue').textContent = '100%';
    document.getElementById('offsetX').value = 0;
    document.getElementById('offsetXValue').textContent = '0';
    document.getElementById('offsetY').value = 0;
    document.getElementById('offsetYValue').textContent = '0';
    document.getElementById('mirrorCheck').checked = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KaleidoscopeTool();
});
