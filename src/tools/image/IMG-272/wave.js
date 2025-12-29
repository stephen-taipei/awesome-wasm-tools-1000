class WaveTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'horizontal',
      amplitude: 20,
      frequency: 3,
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

    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.settings.mode = tab.dataset.mode;
        this.render();
      });
    });

    // Amplitude slider
    const amplitudeSlider = document.getElementById('amplitude');
    amplitudeSlider.addEventListener('input', (e) => {
      this.settings.amplitude = parseInt(e.target.value);
      document.getElementById('amplitudeValue').textContent = this.settings.amplitude;
      this.render();
    });

    // Frequency slider
    const frequencySlider = document.getElementById('frequency');
    frequencySlider.addEventListener('input', (e) => {
      this.settings.frequency = parseInt(e.target.value);
      document.getElementById('frequencyValue').textContent = this.settings.frequency;
      this.render();
    });

    // Phase slider
    const phaseSlider = document.getElementById('phase');
    phaseSlider.addEventListener('input', (e) => {
      this.settings.phase = parseInt(e.target.value);
      document.getElementById('phaseValue').textContent = `${this.settings.phase}°`;
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

    const img = this.originalImage;
    const amp = this.settings.amplitude;

    // Expand canvas to accommodate wave displacement
    const padding = amp;
    this.canvas.width = img.width + padding * 2;
    this.canvas.height = img.height + padding * 2;

    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const dstData = outputData.data;

    const phaseRad = (this.settings.phase * Math.PI) / 180;
    const freq = this.settings.frequency;

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        // Map canvas coordinates to source coordinates
        let srcX = x - padding;
        let srcY = y - padding;

        // Apply wave distortion
        if (this.settings.mode === 'horizontal' || this.settings.mode === 'both') {
          const waveY = Math.sin((srcY / img.height) * Math.PI * 2 * freq + phaseRad);
          srcX -= waveY * amp;
        }

        if (this.settings.mode === 'vertical' || this.settings.mode === 'both') {
          const waveX = Math.sin((srcX / img.width) * Math.PI * 2 * freq + phaseRad);
          srcY -= waveX * amp;
        }

        const dstIdx = (y * this.canvas.width + x) * 4;

        // Bilinear interpolation
        if (srcX >= 0 && srcX < img.width - 1 && srcY >= 0 && srcY < img.height - 1) {
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = x0 + 1;
          const y1 = y0 + 1;
          const xFrac = srcX - x0;
          const yFrac = srcY - y0;

          for (let c = 0; c < 4; c++) {
            const v00 = srcData[(y0 * img.width + x0) * 4 + c];
            const v10 = srcData[(y0 * img.width + x1) * 4 + c];
            const v01 = srcData[(y1 * img.width + x0) * 4 + c];
            const v11 = srcData[(y1 * img.width + x1) * 4 + c];

            const v0 = v00 * (1 - xFrac) + v10 * xFrac;
            const v1 = v01 * (1 - xFrac) + v11 * xFrac;
            dstData[dstIdx + c] = v0 * (1 - yFrac) + v1 * yFrac;
          }
        } else {
          // Transparent for out of bounds
          dstData[dstIdx] = 0;
          dstData[dstIdx + 1] = 0;
          dstData[dstIdx + 2] = 0;
          dstData[dstIdx + 3] = 0;
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
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      mode: 'horizontal',
      amplitude: 20,
      frequency: 3,
      phase: 0
    };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.mode-tab[data-mode="horizontal"]').classList.add('active');
    document.getElementById('amplitude').value = 20;
    document.getElementById('amplitudeValue').textContent = '20';
    document.getElementById('frequency').value = 3;
    document.getElementById('frequencyValue').textContent = '3';
    document.getElementById('phase').value = 0;
    document.getElementById('phaseValue').textContent = '0°';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WaveTool();
});
