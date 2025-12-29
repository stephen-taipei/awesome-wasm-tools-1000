/**
 * IMG-205 圖片色彩平衡工具
 */
class ColorBalanceTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
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

    document.getElementById('cyanRed').addEventListener('input', (e) => {
      this.settings.cyanRed = parseInt(e.target.value);
      document.getElementById('cyanRedValue').textContent = this.settings.cyanRed;
      this.render();
    });

    document.getElementById('magentaGreen').addEventListener('input', (e) => {
      this.settings.magentaGreen = parseInt(e.target.value);
      document.getElementById('magentaGreenValue').textContent = this.settings.magentaGreen;
      this.render();
    });

    document.getElementById('yellowBlue').addEventListener('input', (e) => {
      this.settings.yellowBlue = parseInt(e.target.value);
      document.getElementById('yellowBlueValue').textContent = this.settings.yellowBlue;
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
        this.settings = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
        document.getElementById('cyanRed').value = 0;
        document.getElementById('cyanRedValue').textContent = '0';
        document.getElementById('magentaGreen').value = 0;
        document.getElementById('magentaGreenValue').textContent = '0';
        document.getElementById('yellowBlue').value = 0;
        document.getElementById('yellowBlueValue').textContent = '0';
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('editorSection').classList.add('active');
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  render() {
    if (!this.originalImage) return;
    const { cyanRed, magentaGreen, yellowBlue } = this.settings;
    const w = this.originalImage.width;
    const h = this.originalImage.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.originalImage, 0, 0);

    if (cyanRed === 0 && magentaGreen === 0 && yellowBlue === 0) return;

    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Convert adjustments to RGB shifts
    // Cyan-Red affects R channel (positive = more red, negative = more cyan = less red)
    // Magenta-Green affects G channel (positive = more green, negative = more magenta = less green)
    // Yellow-Blue affects B channel (positive = more blue, negative = more yellow = less blue)

    const rShift = cyanRed * 1.5;
    const gShift = magentaGreen * 1.5;
    const bShift = yellowBlue * 1.5;

    for (let i = 0; i < data.length; i += 4) {
      // Cyan-Red: affects R and G,B inversely
      data[i] = this.clamp(data[i] + rShift);

      // Magenta-Green: affects G and R,B inversely
      data[i + 1] = this.clamp(data[i + 1] + gShift);

      // Yellow-Blue: affects B and R,G inversely
      data[i + 2] = this.clamp(data[i + 2] + bShift);

      // Also apply complementary adjustments for more natural color balance
      if (cyanRed !== 0) {
        // Cyan reduces R, adds to G and B
        data[i + 1] = this.clamp(data[i + 1] - rShift * 0.3);
        data[i + 2] = this.clamp(data[i + 2] - rShift * 0.3);
      }
      if (magentaGreen !== 0) {
        data[i] = this.clamp(data[i] - gShift * 0.3);
        data[i + 2] = this.clamp(data[i + 2] - gShift * 0.3);
      }
      if (yellowBlue !== 0) {
        data[i] = this.clamp(data[i] - bShift * 0.3);
        data[i + 1] = this.clamp(data[i + 1] - bShift * 0.3);
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  clamp(value) {
    return Math.max(0, Math.min(255, value));
  }

  reset() {
    this.originalImage = null;
    this.settings = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('cyanRed').value = 0;
    document.getElementById('cyanRedValue').textContent = '0';
    document.getElementById('magentaGreen').value = 0;
    document.getElementById('magentaGreenValue').textContent = '0';
    document.getElementById('yellowBlue').value = 0;
    document.getElementById('yellowBlueValue').textContent = '0';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `color_balance_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new ColorBalanceTool());
