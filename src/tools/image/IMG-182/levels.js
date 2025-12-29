/**
 * IMG-182 圖片色階工具
 */
class LevelsTool {
  constructor() {
    this.originalImage = null;
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = { inputBlack: 0, inputWhite: 255, gamma: 100, outputBlack: 0, outputWhite: 255 };
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

    ['inputBlack', 'inputWhite', 'gamma', 'outputBlack', 'outputWhite'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        if (id === 'gamma') {
          document.getElementById(id + 'Value').textContent = (this.settings[id] / 100).toFixed(2);
        } else {
          document.getElementById(id + 'Value').textContent = this.settings[id];
        }
        this.render();
      });
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
        this.settings = { inputBlack: 0, inputWhite: 255, gamma: 100, outputBlack: 0, outputWhite: 255 };
        document.getElementById('inputBlack').value = 0;
        document.getElementById('inputBlackValue').textContent = '0';
        document.getElementById('inputWhite').value = 255;
        document.getElementById('inputWhiteValue').textContent = '255';
        document.getElementById('gamma').value = 100;
        document.getElementById('gammaValue').textContent = '1.00';
        document.getElementById('outputBlack').value = 0;
        document.getElementById('outputBlackValue').textContent = '0';
        document.getElementById('outputWhite').value = 255;
        document.getElementById('outputWhiteValue').textContent = '255';
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
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.drawImage(this.originalImage, 0, 0);

    const { inputBlack, inputWhite, gamma, outputBlack, outputWhite } = this.settings;
    const gammaVal = gamma / 100;

    if (inputBlack === 0 && inputWhite === 255 && gamma === 100 && outputBlack === 0 && outputWhite === 255) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const inputRange = Math.max(1, inputWhite - inputBlack);
    const outputRange = outputWhite - outputBlack;

    // Build lookup table for performance
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let val = (i - inputBlack) / inputRange;
      val = Math.max(0, Math.min(1, val));
      val = Math.pow(val, 1 / gammaVal);
      val = outputBlack + val * outputRange;
      lut[i] = Math.max(0, Math.min(255, Math.round(val)));
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
    this.ctx.putImageData(imageData, 0, 0);
  }

  reset() {
    this.originalImage = null;
    this.settings = { inputBlack: 0, inputWhite: 255, gamma: 100, outputBlack: 0, outputWhite: 255 };
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    document.getElementById('fileInput').value = '';
    document.getElementById('inputBlack').value = 0;
    document.getElementById('inputBlackValue').textContent = '0';
    document.getElementById('inputWhite').value = 255;
    document.getElementById('inputWhiteValue').textContent = '255';
    document.getElementById('gamma').value = 100;
    document.getElementById('gammaValue').textContent = '1.00';
    document.getElementById('outputBlack').value = 0;
    document.getElementById('outputBlackValue').textContent = '0';
    document.getElementById('outputWhite').value = 255;
    document.getElementById('outputWhiteValue').textContent = '255';
  }

  download() {
    if (!this.canvas.width) return;
    const link = document.createElement('a');
    link.download = `levels_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

document.addEventListener('DOMContentLoaded', () => new LevelsTool());
