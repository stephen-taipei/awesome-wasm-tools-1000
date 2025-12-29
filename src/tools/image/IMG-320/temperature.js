class TemperatureTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      temperature: 0,
      tint: 0
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
        this.applyPreset(btn.dataset.preset);
      });
    });

    document.getElementById('temperature').addEventListener('input', (e) => {
      this.settings.temperature = parseInt(e.target.value);
      document.getElementById('temperatureValue').textContent = this.settings.temperature;
      this.render();
    });

    document.getElementById('tint').addEventListener('input', (e) => {
      this.settings.tint = parseInt(e.target.value);
      document.getElementById('tintValue').textContent = this.settings.tint;
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    const presets = {
      tungsten: { temperature: -40, tint: 0 },
      fluorescent: { temperature: -20, tint: 30 },
      daylight: { temperature: 0, tint: 0 },
      cloudy: { temperature: 20, tint: 0 },
      shade: { temperature: 35, tint: 0 },
      sunset: { temperature: 60, tint: 10 }
    };

    const p = presets[preset];
    this.settings = { ...p };

    document.getElementById('temperature').value = p.temperature;
    document.getElementById('temperatureValue').textContent = p.temperature;
    document.getElementById('tint').value = p.tint;
    document.getElementById('tintValue').textContent = p.tint;

    this.render();
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

    const tempShift = this.settings.temperature * 1.5;
    const tintShift = this.settings.tint * 1.0;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i];
      let g = srcData[i + 1];
      let b = srcData[i + 2];

      // Apply temperature (warm/cool)
      if (tempShift > 0) {
        // Warm - add red/yellow, reduce blue
        r = r + tempShift * 0.8;
        g = g + tempShift * 0.3;
        b = b - tempShift * 0.5;
      } else {
        // Cool - add blue, reduce red/yellow
        r = r + tempShift * 0.5;
        g = g + tempShift * 0.1;
        b = b - tempShift * 0.8;
      }

      // Apply tint (green/magenta)
      if (tintShift > 0) {
        // Magenta - add red and blue, reduce green
        r = r + tintShift * 0.3;
        g = g - tintShift * 0.5;
        b = b + tintShift * 0.3;
      } else {
        // Green - add green, reduce red and blue
        r = r + tintShift * 0.2;
        g = g - tintShift * 0.5;
        b = b + tintShift * 0.2;
      }

      outputData.data[i] = Math.max(0, Math.min(255, r));
      outputData.data[i + 1] = Math.max(0, Math.min(255, g));
      outputData.data[i + 2] = Math.max(0, Math.min(255, b));
      outputData.data[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'temperature-adjusted-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { temperature: 0, tint: 0 };
    document.getElementById('temperature').value = 0;
    document.getElementById('temperatureValue').textContent = '0';
    document.getElementById('tint').value = 0;
    document.getElementById('tintValue').textContent = '0';
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TemperatureTool();
});
