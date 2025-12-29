class WaveTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'horizontal',
      amplitude: 20,
      frequency: 5,
      phase: 0
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

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.mode = btn.dataset.mode;
        this.render();
      });
    });

    document.getElementById('amplitude').addEventListener('input', (e) => {
      this.settings.amplitude = parseInt(e.target.value);
      document.getElementById('amplitudeValue').textContent = `${this.settings.amplitude}px`;
      this.render();
    });

    document.getElementById('frequency').addEventListener('input', (e) => {
      this.settings.frequency = parseInt(e.target.value);
      document.getElementById('frequencyValue').textContent = this.settings.frequency;
      this.render();
    });

    document.getElementById('phase').addEventListener('input', (e) => {
      this.settings.phase = parseInt(e.target.value);
      document.getElementById('phaseValue').textContent = `${this.settings.phase}°`;
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
        this.canvas.width = img.width;
        this.canvas.height = img.height;

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

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const amplitude = this.settings.amplitude;
    const frequency = this.settings.frequency;
    const phaseRad = this.settings.phase * Math.PI / 180;
    const mode = this.settings.mode;

    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        let srcX, srcY;

        switch (mode) {
          case 'horizontal':
            srcX = x;
            srcY = y + amplitude * Math.sin((x / width) * frequency * Math.PI * 2 + phaseRad);
            break;

          case 'vertical':
            srcX = x + amplitude * Math.sin((y / height) * frequency * Math.PI * 2 + phaseRad);
            srcY = y;
            break;

          case 'ripple':
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const offset = amplitude * Math.sin(dist / 20 * frequency + phaseRad);
            srcX = x + Math.cos(angle) * offset;
            srcY = y + Math.sin(angle) * offset;
            break;

          case 'both':
            srcX = x + amplitude * Math.sin((y / height) * frequency * Math.PI * 2 + phaseRad);
            srcY = y + amplitude * Math.sin((x / width) * frequency * Math.PI * 2 + phaseRad);
            break;

          default:
            srcX = x;
            srcY = y;
        }

        if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
          // Bilinear interpolation
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const fx = srcX - x0;
          const fy = srcY - y0;

          const idx00 = (y0 * width + x0) * 4;
          const idx10 = (y0 * width + x1) * 4;
          const idx01 = (y1 * width + x0) * 4;
          const idx11 = (y1 * width + x1) * 4;

          for (let c = 0; c < 4; c++) {
            const v = srcData[idx00 + c] * (1 - fx) * (1 - fy) +
                     srcData[idx10 + c] * fx * (1 - fy) +
                     srcData[idx01 + c] * (1 - fx) * fy +
                     srcData[idx11 + c] * fx * fy;
            outputData.data[idx + c] = Math.round(v);
          }
        } else {
          outputData.data[idx + 3] = 0;
        }
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'wave-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { mode: 'horizontal', amplitude: 20, frequency: 5, phase: 0 };
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="horizontal"]').classList.add('active');
    document.getElementById('amplitude').value = 20;
    document.getElementById('amplitudeValue').textContent = '20px';
    document.getElementById('frequency').value = 5;
    document.getElementById('frequencyValue').textContent = '5';
    document.getElementById('phase').value = 0;
    document.getElementById('phaseValue').textContent = '0°';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WaveTool();
});
