class ChannelMixerTool {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.originalImage = null;
    this.imageData = null;
    this.monochrome = false;
    this.settings = {
      redRed: 100, redGreen: 0, redBlue: 0,
      greenRed: 0, greenGreen: 100, greenBlue: 0,
      blueRed: 0, blueGreen: 0, blueBlue: 100
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

    // Monochrome toggle
    document.getElementById('monochromeToggle').addEventListener('change', (e) => {
      this.monochrome = e.target.checked;
      document.getElementById('greenSection').style.display = this.monochrome ? 'none' : 'block';
      document.getElementById('blueSection').style.display = this.monochrome ? 'none' : 'block';
      this.render();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Sliders
    const sliderIds = [
      'redRed', 'redGreen', 'redBlue',
      'greenRed', 'greenGreen', 'greenBlue',
      'blueRed', 'blueGreen', 'blueBlue'
    ];

    sliderIds.forEach(id => {
      const slider = document.getElementById(id);
      slider.addEventListener('input', (e) => {
        this.settings[id] = parseInt(e.target.value);
        document.getElementById(`${id}Value`).textContent = `${this.settings[id]}%`;
        this.render();
      });
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', () => this.download());

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  applyPreset(preset) {
    switch (preset) {
      case 'swap-rb':
        this.settings = {
          redRed: 0, redGreen: 0, redBlue: 100,
          greenRed: 0, greenGreen: 100, greenBlue: 0,
          blueRed: 100, blueGreen: 0, blueBlue: 0
        };
        break;
      case 'swap-rg':
        this.settings = {
          redRed: 0, redGreen: 100, redBlue: 0,
          greenRed: 100, greenGreen: 0, greenBlue: 0,
          blueRed: 0, blueGreen: 0, blueBlue: 100
        };
        break;
      case 'swap-gb':
        this.settings = {
          redRed: 100, redGreen: 0, redBlue: 0,
          greenRed: 0, greenGreen: 0, greenBlue: 100,
          blueRed: 0, blueGreen: 100, blueBlue: 0
        };
        break;
      case 'sepia':
        this.settings = {
          redRed: 40, redGreen: 77, redBlue: 20,
          greenRed: 35, greenGreen: 69, greenBlue: 17,
          blueRed: 27, blueGreen: 53, blueBlue: 13
        };
        break;
      case 'infrared':
        this.settings = {
          redRed: -50, redGreen: 200, redBlue: -50,
          greenRed: 0, greenGreen: 100, greenBlue: 0,
          blueRed: 0, blueGreen: 0, blueBlue: 100
        };
        break;
      case 'reset':
        this.settings = {
          redRed: 100, redGreen: 0, redBlue: 0,
          greenRed: 0, greenGreen: 100, greenBlue: 0,
          blueRed: 0, blueGreen: 0, blueBlue: 100
        };
        break;
    }

    this.updateSliders();
    this.render();
  }

  updateSliders() {
    const sliderIds = [
      'redRed', 'redGreen', 'redBlue',
      'greenRed', 'greenGreen', 'greenBlue',
      'blueRed', 'blueGreen', 'blueBlue'
    ];

    sliderIds.forEach(id => {
      document.getElementById(id).value = this.settings[id];
      document.getElementById(`${id}Value`).textContent = `${this.settings[id]}%`;
    });
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
    const dstData = outputData.data;

    const rr = this.settings.redRed / 100;
    const rg = this.settings.redGreen / 100;
    const rb = this.settings.redBlue / 100;
    const gr = this.settings.greenRed / 100;
    const gg = this.settings.greenGreen / 100;
    const gb = this.settings.greenBlue / 100;
    const br = this.settings.blueRed / 100;
    const bg = this.settings.blueGreen / 100;
    const bb = this.settings.blueBlue / 100;

    for (let i = 0; i < srcData.length; i += 4) {
      const r = srcData[i];
      const g = srcData[i + 1];
      const b = srcData[i + 2];

      if (this.monochrome) {
        // In monochrome mode, use red channel settings for grayscale
        const gray = r * rr + g * rg + b * rb;
        dstData[i] = Math.max(0, Math.min(255, gray));
        dstData[i + 1] = Math.max(0, Math.min(255, gray));
        dstData[i + 2] = Math.max(0, Math.min(255, gray));
      } else {
        // Normal channel mixing
        const newR = r * rr + g * rg + b * rb;
        const newG = r * gr + g * gg + b * gb;
        const newB = r * br + g * bg + b * bb;

        dstData[i] = Math.max(0, Math.min(255, newR));
        dstData[i + 1] = Math.max(0, Math.min(255, newG));
        dstData[i + 2] = Math.max(0, Math.min(255, newB));
      }
      dstData[i + 3] = srcData[i + 3];
    }

    this.ctx.putImageData(outputData, 0, 0);
  }

  download() {
    const link = document.createElement('a');
    link.download = 'channel-mixed-image.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  reset() {
    this.originalImage = null;
    this.imageData = null;
    this.monochrome = false;
    this.settings = {
      redRed: 100, redGreen: 0, redBlue: 0,
      greenRed: 0, greenGreen: 100, greenBlue: 0,
      blueRed: 0, blueGreen: 0, blueBlue: 100
    };
    document.getElementById('monochromeToggle').checked = false;
    document.getElementById('greenSection').style.display = 'block';
    document.getElementById('blueSection').style.display = 'block';
    document.getElementById('editorSection').classList.remove('active');
    this.updateSliders();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ChannelMixerTool();
});
