class GrainTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.noiseData = null;
    this.settings = {
      type: 'uniform',
      amount: 30,
      size: 1,
      monochrome: true,
      luminosityOnly: false
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

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.type = btn.dataset.type;
        this.generateNoise();
        this.render();
      });
    });

    document.getElementById('amount').addEventListener('input', (e) => {
      this.settings.amount = parseInt(e.target.value);
      document.getElementById('amountValue').textContent = `${this.settings.amount}%`;
      this.render();
    });

    document.getElementById('size').addEventListener('input', (e) => {
      this.settings.size = parseInt(e.target.value);
      document.getElementById('sizeValue').textContent = this.settings.size;
      this.generateNoise();
      this.render();
    });

    document.getElementById('monochromeCheck').addEventListener('change', (e) => {
      this.settings.monochrome = e.target.checked;
      this.generateNoise();
      this.render();
    });

    document.getElementById('luminosityCheck').addEventListener('change', (e) => {
      this.settings.luminosityOnly = e.target.checked;
      this.render();
    });

    document.getElementById('regenerateBtn').addEventListener('click', () => {
      this.generateNoise();
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
        this.generateNoise();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  generateNoise() {
    if (!this.imageData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const size = this.settings.size;

    // Generate at reduced resolution if size > 1
    const noiseWidth = Math.ceil(width / size);
    const noiseHeight = Math.ceil(height / size);

    this.noiseData = new Float32Array(noiseWidth * noiseHeight * 3);

    for (let i = 0; i < noiseWidth * noiseHeight; i++) {
      let nr, ng, nb;

      switch (this.settings.type) {
        case 'uniform':
          nr = Math.random() * 2 - 1;
          ng = this.settings.monochrome ? nr : Math.random() * 2 - 1;
          nb = this.settings.monochrome ? nr : Math.random() * 2 - 1;
          break;

        case 'gaussian':
          nr = this.gaussianRandom() * 0.5;
          ng = this.settings.monochrome ? nr : this.gaussianRandom() * 0.5;
          nb = this.settings.monochrome ? nr : this.gaussianRandom() * 0.5;
          break;

        case 'film':
          // Film grain: more prominent in midtones
          nr = this.gaussianRandom() * 0.4;
          ng = this.settings.monochrome ? nr : this.gaussianRandom() * 0.4;
          nb = this.settings.monochrome ? nr : this.gaussianRandom() * 0.4;
          break;

        case 'salt-pepper':
          const rand = Math.random();
          if (rand < 0.05) {
            nr = ng = nb = 1;
          } else if (rand < 0.1) {
            nr = ng = nb = -1;
          } else {
            nr = ng = nb = 0;
          }
          break;
      }

      this.noiseData[i * 3] = nr;
      this.noiseData[i * 3 + 1] = ng;
      this.noiseData[i * 3 + 2] = nb;
    }
  }

  render() {
    if (!this.originalImage || !this.imageData || !this.noiseData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const srcData = this.imageData.data;
    const outputData = this.ctx.createImageData(width, height);

    const amount = this.settings.amount / 100 * 128;
    const size = this.settings.size;
    const noiseWidth = Math.ceil(width / size);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const noiseIdx = (Math.floor(y / size) * noiseWidth + Math.floor(x / size)) * 3;

        let r = srcData[idx];
        let g = srcData[idx + 1];
        let b = srcData[idx + 2];

        let nr = this.noiseData[noiseIdx] * amount;
        let ng = this.noiseData[noiseIdx + 1] * amount;
        let nb = this.noiseData[noiseIdx + 2] * amount;

        // Film grain: scale by luminosity
        if (this.settings.type === 'film') {
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const scale = 4 * lum * (1 - lum); // Peak at midtones
          nr *= scale;
          ng *= scale;
          nb *= scale;
        }

        if (this.settings.luminosityOnly) {
          const avgNoise = (nr + ng + nb) / 3;
          r += avgNoise;
          g += avgNoise;
          b += avgNoise;
        } else {
          r += nr;
          g += ng;
          b += nb;
        }

        outputData.data[idx] = Math.max(0, Math.min(255, r));
        outputData.data[idx + 1] = Math.max(0, Math.min(255, g));
        outputData.data[idx + 2] = Math.max(0, Math.min(255, b));
        outputData.data[idx + 3] = srcData[idx + 3];
      }
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'grain-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.noiseData = null;
    this.settings = { type: 'uniform', amount: 30, size: 1, monochrome: true, luminosityOnly: false };
    document.getElementById('editorSection').classList.remove('active');
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.type-btn[data-type="uniform"]').classList.add('active');
    document.getElementById('amount').value = 30;
    document.getElementById('amountValue').textContent = '30%';
    document.getElementById('size').value = 1;
    document.getElementById('sizeValue').textContent = '1';
    document.getElementById('monochromeCheck').checked = true;
    document.getElementById('luminosityCheck').checked = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GrainTool();
});
