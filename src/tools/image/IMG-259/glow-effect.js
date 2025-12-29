/**
 * IMG-259 圖片光暈效果工具
 */
class GlowEffectTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      intensity: 50,
      radius: 20,
      threshold: 50,
      glowColor: '#ffffff',
      preserveOriginal: true
    };
    this.mode = 'bloom';
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

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.mode = tab.dataset.mode;
        this.render();
      });
    });

    document.getElementById('intensity').addEventListener('input', (e) => {
      this.settings.intensity = parseInt(e.target.value);
      document.getElementById('intensityValue').textContent = this.settings.intensity + '%';
      this.render();
    });

    document.getElementById('radius').addEventListener('input', (e) => {
      this.settings.radius = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = this.settings.radius;
      this.render();
    });

    document.getElementById('threshold').addEventListener('input', (e) => {
      this.settings.threshold = parseInt(e.target.value);
      document.getElementById('thresholdValue').textContent = this.settings.threshold + '%';
      this.render();
    });

    document.getElementById('glowColor').addEventListener('input', (e) => {
      this.settings.glowColor = e.target.value;
      this.render();
    });

    document.getElementById('preserveOriginal').addEventListener('change', (e) => {
      this.settings.preserveOriginal = e.target.checked;
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  render() {
    if (!this.originalImage) return;
    const { intensity, radius, threshold, glowColor, preserveOriginal } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;

    this.canvas.width = w;
    this.canvas.height = h;

    // Create glow layer
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = w;
    glowCanvas.height = h;
    const glowCtx = glowCanvas.getContext('2d');

    // Draw original and extract bright areas
    glowCtx.drawImage(this.originalImage, 0, 0);
    const imageData = glowCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const thresholdValue = (threshold / 100) * 255;
    const color = this.hexToRgb(glowColor);

    // Create bright mask
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

      if (this.mode === 'bloom') {
        if (brightness < thresholdValue) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      } else if (this.mode === 'neon') {
        // Edge detection for neon effect
        data[i] = data[i] > thresholdValue ? color.r : 0;
        data[i + 1] = data[i + 1] > thresholdValue ? color.g : 0;
        data[i + 2] = data[i + 2] > thresholdValue ? color.b : 0;
      } else if (this.mode === 'dreamy') {
        // Soft glow for dreamy effect
        const factor = brightness / 255;
        data[i] = data[i] * factor + color.r * (1 - factor) * 0.3;
        data[i + 1] = data[i + 1] * factor + color.g * (1 - factor) * 0.3;
        data[i + 2] = data[i + 2] * factor + color.b * (1 - factor) * 0.3;
      }
    }

    glowCtx.putImageData(imageData, 0, 0);

    // Apply blur to glow layer
    glowCtx.filter = `blur(${radius}px)`;
    glowCtx.drawImage(glowCanvas, 0, 0);
    glowCtx.filter = 'none';

    // Composite result
    if (preserveOriginal) {
      this.ctx.drawImage(this.originalImage, 0, 0);
    } else {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, w, h);
    }

    // Apply glow with blend mode
    this.ctx.globalCompositeOperation = this.mode === 'neon' ? 'screen' : 'lighter';
    this.ctx.globalAlpha = intensity / 100;
    this.ctx.drawImage(glowCanvas, 0, 0);

    // Draw again for stronger glow
    if (this.mode === 'neon') {
      this.ctx.globalAlpha = (intensity / 100) * 0.5;
      glowCtx.filter = `blur(${radius * 2}px)`;
      glowCtx.drawImage(glowCanvas, 0, 0);
      this.ctx.drawImage(glowCanvas, 0, 0);
    }

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }

  reset() {
    this.originalImage = null;
    this.settings = { intensity: 50, radius: 20, threshold: 50, glowColor: '#ffffff', preserveOriginal: true };
    this.mode = 'bloom';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('intensity').value = 50;
    document.getElementById('intensityValue').textContent = '50%';
    document.getElementById('radius').value = 20;
    document.getElementById('radiusValue').textContent = '20';
    document.getElementById('threshold').value = 50;
    document.getElementById('thresholdValue').textContent = '50%';
    document.getElementById('glowColor').value = '#ffffff';
    document.getElementById('preserveOriginal').checked = true;
    document.querySelectorAll('.mode-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `glow_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new GlowEffectTool());
