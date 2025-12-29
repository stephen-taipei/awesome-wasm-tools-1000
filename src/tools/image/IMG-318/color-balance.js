class ColorBalanceTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.settings = {
      red: 0,
      green: 0,
      blue: 0,
      preserveLuminosity: true
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

    document.getElementById('red').addEventListener('input', (e) => {
      this.settings.red = parseInt(e.target.value);
      document.getElementById('redValue').textContent = this.settings.red;
      this.render();
    });

    document.getElementById('green').addEventListener('input', (e) => {
      this.settings.green = parseInt(e.target.value);
      document.getElementById('greenValue').textContent = this.settings.green;
      this.render();
    });

    document.getElementById('blue').addEventListener('input', (e) => {
      this.settings.blue = parseInt(e.target.value);
      document.getElementById('blueValue').textContent = this.settings.blue;
      this.render();
    });

    document.getElementById('preserveLuminosity').addEventListener('change', (e) => {
      this.settings.preserveLuminosity = e.target.checked;
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

  getLuminosity(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  render() {
    if (!this.originalImage || !this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const redShift = this.settings.red * 2.55;
    const greenShift = this.settings.green * 2.55;
    const blueShift = this.settings.blue * 2.55;

    for (let i = 0; i < srcData.length; i += 4) {
      let r = srcData[i] + redShift;
      let g = srcData[i + 1] + greenShift;
      let b = srcData[i + 2] + blueShift;

      if (this.settings.preserveLuminosity) {
        const originalLum = this.getLuminosity(srcData[i], srcData[i + 1], srcData[i + 2]);
        const newLum = this.getLuminosity(r, g, b);

        if (newLum > 0) {
          const ratio = originalLum / newLum;
          r *= ratio;
          g *= ratio;
          b *= ratio;
        }
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
    link.download = 'color-balanced-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.settings = { red: 0, green: 0, blue: 0, preserveLuminosity: true };
    document.getElementById('red').value = 0;
    document.getElementById('redValue').textContent = '0';
    document.getElementById('green').value = 0;
    document.getElementById('greenValue').textContent = '0';
    document.getElementById('blue').value = 0;
    document.getElementById('blueValue').textContent = '0';
    document.getElementById('preserveLuminosity').checked = true;
    if (this.originalImage) {
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColorBalanceTool();
});
