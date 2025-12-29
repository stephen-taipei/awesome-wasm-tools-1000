/**
 * IMG-240 圖片波浪效果工具
 */
class WaveTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { amplitude: 20, frequency: 3, phase: 0 };
    this.mode = 'horizontal';
    this.waveType = 'sine';
    this.init();
  }

  init() { this.bindEvents(); }

  bindEvents() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length) this.loadImage(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) this.loadImage(e.target.files[0]); });

    document.querySelectorAll('.mode-tab:not(.wave-type)').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab:not(.wave-type)').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.querySelectorAll('.wave-type').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.wave-type').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.waveType = tab.dataset.type;
        this.render();
      });
    });

    document.getElementById('amplitude').addEventListener('input', (e) => {
      this.settings.amplitude = parseInt(e.target.value);
      document.getElementById('amplitudeValue').textContent = this.settings.amplitude;
      this.render();
    });

    document.getElementById('frequency').addEventListener('input', (e) => {
      this.settings.frequency = parseInt(e.target.value);
      document.getElementById('frequencyValue').textContent = this.settings.frequency;
      this.render();
    });

    document.getElementById('phase').addEventListener('input', (e) => {
      this.settings.phase = parseInt(e.target.value);
      document.getElementById('phaseValue').textContent = this.settings.phase + '°';
      this.render();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => this.download());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  loadImage(file) {
    if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  waveFunction(x) {
    if (this.waveType === 'sine') {
      return Math.sin(x);
    } else {
      // Triangle wave
      const period = Math.PI * 2;
      const normalized = ((x % period) + period) % period;
      if (normalized < Math.PI) {
        return (normalized / Math.PI) * 2 - 1;
      } else {
        return 1 - ((normalized - Math.PI) / Math.PI) * 2;
      }
    }
  }

  render() {
    if (!this.originalImage) return;
    const { amplitude, frequency, phase } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    // Create source canvas
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(this.originalImage, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, w, h);

    // Setup destination
    this.canvas.width = w;
    this.canvas.height = h;
    const dstData = this.ctx.createImageData(w, h);

    const phaseRad = phase * Math.PI / 180;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let srcX = x;
        let srcY = y;

        // Apply wave distortion
        if (this.mode === 'horizontal' || this.mode === 'both') {
          const waveOffset = this.waveFunction((y / h) * frequency * Math.PI * 2 + phaseRad) * amplitude;
          srcX = x + waveOffset;
        }

        if (this.mode === 'vertical' || this.mode === 'both') {
          const waveOffset = this.waveFunction((x / w) * frequency * Math.PI * 2 + phaseRad) * amplitude;
          srcY = y + waveOffset;
        }

        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const xWeight = srcX - x0;
        const yWeight = srcY - y0;

        const dstIdx = (y * w + x) * 4;

        if (x0 >= 0 && x1 < w && y0 >= 0 && y1 < h) {
          for (let c = 0; c < 4; c++) {
            const p00 = srcData.data[(y0 * w + x0) * 4 + c];
            const p10 = srcData.data[(y0 * w + x1) * 4 + c];
            const p01 = srcData.data[(y1 * w + x0) * 4 + c];
            const p11 = srcData.data[(y1 * w + x1) * 4 + c];

            const top = p00 * (1 - xWeight) + p10 * xWeight;
            const bottom = p01 * (1 - xWeight) + p11 * xWeight;
            dstData.data[dstIdx + c] = top * (1 - yWeight) + bottom * yWeight;
          }
        } else if (x0 >= 0 && x0 < w && y0 >= 0 && y0 < h) {
          for (let c = 0; c < 4; c++) {
            dstData.data[dstIdx + c] = srcData.data[(y0 * w + x0) * 4 + c];
          }
        } else {
          // Out of bounds - transparent
          dstData.data[dstIdx + 3] = 0;
        }
      }
    }

    this.ctx.putImageData(dstData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { amplitude: 20, frequency: 3, phase: 0 };
    this.mode = 'horizontal';
    this.waveType = 'sine';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('amplitude').value = 20;
    document.getElementById('amplitudeValue').textContent = '20';
    document.getElementById('frequency').value = 3;
    document.getElementById('frequencyValue').textContent = '3';
    document.getElementById('phase').value = 0;
    document.getElementById('phaseValue').textContent = '0°';
    document.querySelectorAll('.mode-tab:not(.wave-type)').forEach((t, i) => t.classList.toggle('active', i === 0));
    document.querySelectorAll('.wave-type').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `wave_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new WaveTool());
