/**
 * IMG-221 圖片色彩替換工具
 */
class ColorReplaceTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {
      sourceColor: '#ff0000',
      targetColor: '#00ff00',
      tolerance: 30,
      feather: 10,
      preserveLuminance: true
    };
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

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      // Get color from original image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.originalImage.width;
      tempCanvas.height = this.originalImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.originalImage, 0, 0);
      const pixel = tempCtx.getImageData(x, y, 1, 1).data;

      const hex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
      this.settings.sourceColor = hex;
      document.getElementById('sourceColor').value = hex;
      this.render();
    });

    document.getElementById('sourceColor').addEventListener('input', (e) => {
      this.settings.sourceColor = e.target.value;
      this.render();
    });

    document.getElementById('targetColor').addEventListener('input', (e) => {
      this.settings.targetColor = e.target.value;
      this.render();
    });

    document.getElementById('tolerance').addEventListener('input', (e) => {
      this.settings.tolerance = parseInt(e.target.value);
      document.getElementById('toleranceValue').textContent = this.settings.tolerance;
      this.render();
    });

    document.getElementById('feather').addEventListener('input', (e) => {
      this.settings.feather = parseInt(e.target.value);
      document.getElementById('featherValue').textContent = this.settings.feather;
      this.render();
    });

    document.getElementById('preserve').addEventListener('input', (e) => {
      this.settings.preserveLuminance = parseInt(e.target.value) === 1;
      document.getElementById('preserveValue').textContent = this.settings.preserveLuminance ? '開啟' : '關閉';
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
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  getLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  render() {
    if (!this.originalImage) return;
    const { sourceColor, targetColor, tolerance, feather, preserveLuminance } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const source = this.hexToRgb(sourceColor);
    const target = this.hexToRgb(targetColor);

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const maxDistance = tolerance * 4.41; // Scale to 0-441 (max RGB distance)
    const featherRange = feather * 4.41;

    for (let i = 0; i < data.length; i += 4) {
      const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const distance = this.colorDistance(pixel, source);

      if (distance <= maxDistance + featherRange) {
        let blend = 1;
        if (distance > maxDistance) {
          blend = 1 - (distance - maxDistance) / featherRange;
        }

        let newR = target.r;
        let newG = target.g;
        let newB = target.b;

        if (preserveLuminance) {
          const origLum = this.getLuminance(pixel.r, pixel.g, pixel.b);
          const targetLum = this.getLuminance(target.r, target.g, target.b);
          const lumRatio = targetLum > 0 ? origLum / targetLum : 1;
          newR = Math.min(255, target.r * lumRatio);
          newG = Math.min(255, target.g * lumRatio);
          newB = Math.min(255, target.b * lumRatio);
        }

        data[i] = pixel.r * (1 - blend) + newR * blend;
        data[i + 1] = pixel.g * (1 - blend) + newG * blend;
        data[i + 2] = pixel.b * (1 - blend) + newB * blend;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = {
      sourceColor: '#ff0000',
      targetColor: '#00ff00',
      tolerance: 30,
      feather: 10,
      preserveLuminance: true
    };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('sourceColor').value = '#ff0000';
    document.getElementById('targetColor').value = '#00ff00';
    document.getElementById('tolerance').value = 30;
    document.getElementById('toleranceValue').textContent = '30';
    document.getElementById('feather').value = 10;
    document.getElementById('featherValue').textContent = '10';
    document.getElementById('preserve').value = 1;
    document.getElementById('preserveValue').textContent = '開啟';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `color_replace_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorReplaceTool());
